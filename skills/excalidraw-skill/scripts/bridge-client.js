/* excalidraw-skill: 无刷新 Bridge 客户端（由 serve.mjs 通过 /__bridge.js 注入）
 *
 * 依赖 serve.mjs 对入口 JS 的在线 patch：组件挂载时执行
 *   window.__EXCALIDRAW_API__ = this.api; window.dispatchEvent(new Event("excalidraw:ready"));
 * 因此本脚本只做惰性封装，可在 <head> 或 <body> 任意位置加载。
 *
 * 典型用法（浏览器控制台 / agent 页面上下文）：
 *   ExcalidrawBridge.ready                       // true 表示画布 API 已就绪
 *   ExcalidrawBridge.getElements().length
 *   ExcalidrawBridge.setScene(scene.elements, scene.appState)   // 整图替换，无刷新
 *   ExcalidrawBridge.addElements(newElements)                    // 追加（按 id 去重），无刷新
 *   ExcalidrawBridge.loadScene('/__scene.json?v=' + Date.now())  // fetch + 替换 + 缩放
 */
(function () {
  "use strict";

  var API_KEY = "__EXCALIDRAW_API__";
  var READY_EVENT = "excalidraw:ready";

  function api() {
    var a = window[API_KEY];
    return a && !a.isDestroyed ? a : null;
  }

  function requireApi() {
    var a = api();
    if (!a) {
      throw new Error(
        "[ExcalidrawBridge] API 未就绪：请确认页面由 excalidraw-skill 的 serve.mjs 提供，且画布已加载完成",
      );
    }
    return a;
  }

  // 依据元素包围盒计算居中的 appState（沿用 SKILL.md 第 3 步经过验证的公式）
  function fitAppState(els, padding, alignTop) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pad = padding == null ? 60 : padding;
    var padTop = alignTop ? 90 : pad;
    var padBottom = alignTop ? 40 : pad;
    var padX = alignTop ? 40 : pad;
    var minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x + (e.width || 0));
      minY = Math.min(minY, e.y);
      maxY = Math.max(maxY, e.y + (e.height || 0));
    }
    var zoom = Math.min(
      (vw - padX * 2) / Math.max(1, maxX - minX),
      (vh - padTop - padBottom) / Math.max(1, maxY - minY),
      1,
    );
    var cx = (minX + maxX) / 2;
    return {
      zoom: { value: zoom },
      scrollX: vw / (2 * zoom) - cx,
      scrollY: alignTop ? padTop / zoom - minY : vh / (2 * zoom) - (minY + maxY) / 2,
    };
  }

  // 简单字符串 hash（djb2），用于判断批次文件是否变化
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h >>> 0;
  }
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }
  var playToken = 0; // 递增令牌：新批次到达时可取消尚未播完的旧动画

  // resize 自适应：记住完整场景，窗口尺寸变化时按新尺寸重新 fit（避免最大化后内容偏小/偏移）。
  var fitRef = null; // { elements, padding, alignTop }
  var resizeTimer = null;
  var autoRefit = true;
  function applyFit() {
    if (!autoRefit || !fitRef || !fitRef.elements || !fitRef.elements.length) return;
    var a = api();
    if (!a) return;
    a.updateScene({ appState: fitAppState(fitRef.elements, fitRef.padding, fitRef.alignTop) });
  }
  function rememberFit(els, padding, alignTop) {
    if (!els || !els.length) return;
    fitRef = { elements: els, padding: padding, alignTop: alignTop !== false };
  }
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyFit, 150); // 防抖：拖拽窗口大小时只在停止后重算
  });

  var bridge = {
    /** 原始 imperative API（updateScene / getSceneElements / getAppState / getFiles / resetScene / scrollToContent ...） */
    get api() {
      return api();
    },

    /** 画布是否已挂载并可操作 */
    get ready() {
      return !!api();
    },

    /** 等待就绪；若已就绪则同步调用。返回取消订阅函数。 */
    onReady: function (cb) {
      if (typeof cb !== "function") return function () {};
      if (api()) {
        cb(bridge);
        return function () {};
      }
      function handler() {
        cb(bridge);
      }
      window.addEventListener(READY_EVENT, handler, { once: true });
      return function () {
        window.removeEventListener(READY_EVENT, handler);
      };
    },

    /** 整图替换（无刷新）。appState 可选；captureUpdate 可选（如 'never'）。 */
    setScene: function (elements, appState, opts) {
      var a = requireApi();
      var patch = { elements: Array.isArray(elements) ? elements : [] };
      if (appState) patch.appState = appState;
      if (opts && "captureUpdate" in opts) patch.captureUpdate = opts.captureUpdate;
      a.updateScene(patch);
      return bridge;
    },

    /** 追加元素，按 id 去重（无刷新）。返回真正新增的数量。 */
    addElements: function (elements, opts) {
      var a = requireApi();
      var cur = a.getSceneElementsIncludingDeleted();
      var ids = {};
      for (var i = 0; i < cur.length; i++) ids[cur[i].id] = true;
      var add = [];
      for (var j = 0; j < (elements || []).length; j++) {
        var e = elements[j];
        if (e && e.id && !ids[e.id]) {
          ids[e.id] = true;
          add.push(e);
        }
      }
      if (!add.length) return 0;
      var patch = { elements: cur.concat(add) };
      if (opts && "captureUpdate" in opts) patch.captureUpdate = opts.captureUpdate;
      a.updateScene(patch);
      return add.length;
    },

    /** 按 id 删除元素（无刷新）。返回删除数量。 */
    removeElements: function (ids) {
      var a = requireApi();
      var remove = {};
      for (var i = 0; i < (ids || []).length; i++) remove[ids[i]] = true;
      var cur = a.getSceneElements();
      var kept = cur.filter(function (e) {
        return !remove[e.id];
      });
      var n = cur.length - kept.length;
      if (n) a.updateScene({ elements: kept });
      return n;
    },

    /** 清空画布（resetScene），无刷新。 */
    clear: function () {
      requireApi().resetScene();
      return bridge;
    },

    /** 当前场景元素（不含 isDeleted） */
    getElements: function () {
      var a = api();
      return a ? a.getSceneElements() : [];
    },

    /** 当前 appState（zoom / scrollX / scrollY / viewBackgroundColor ...） */
    getAppState: function () {
      var a = api();
      return a ? a.getAppState() : null;
    },

    /** 缩放/居中到当前内容（无刷新）。padding 默认 60；默认顶部对齐以避开悬浮工具栏。 */
    zoomToFit: function (padding, alignTop) {
      var a = requireApi();
      var els = a.getSceneElements();
      if (!els.length) return bridge;
      rememberFit(els, padding, alignTop);
      a.updateScene({ appState: fitAppState(els, padding, alignTop !== false) });
      return bridge;
    },

    /** 开关窗口 resize 自动重新适配（默认开）。关闭后用户可自由平移缩放不被覆盖。 */
    setAutoRefit: function (enabled) {
      autoRefit = !!enabled;
      return bridge;
    },

    /** fetch 场景 JSON（gen_scene.mjs 输出）→ setScene → 可选 zoomToFit。返回 Promise。 */
    loadScene: function (url, opts) {
      opts = opts || {};
      return fetch(url, { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("[ExcalidrawBridge] fetch 失败: " + r.status + " " + url);
          return r.json();
        })
        .then(function (scene) {
          var els = scene.elements || [];
          var appState = scene.appState;
          if (opts.zoomToFit !== false && els.length) {
            rememberFit(els, opts.padding, opts.alignTop);
            appState = Object.assign({}, appState, fitAppState(els, opts.padding, opts.alignTop !== false));
          }
          bridge.setScene(els, appState, opts);
          return { count: els.length };
        });
    },

    /** 更新单个元素的文字（text 元素直接改 text；shape 元素改其绑定的 text 标签） */
    setLabel: function (id, text, opts) {
      var a = requireApi();
      if (opts && opts.refresh) a.updateScene({ elements: a.getSceneElements().slice() });
      var all = a.getSceneElementsIncludingDeleted();
      var byId = {};
      for (var i = 0; i < all.length; i++) byId[all[i].id] = all[i];
      var target = byId[id];
      if (!target) return false;
      var out = all.map(function (e) {
        if (e.id === id && e.type === "text") {
          return Object.assign({}, e, { text: text });
        }
        if (e.type === "text" && e.containerId === id) {
          return Object.assign({}, e, { text: text });
        }
        return e;
      });
      var patch = { elements: out };
      if (opts && "captureUpdate" in opts) patch.captureUpdate = opts.captureUpdate;
      a.updateScene(patch);
      return true;
    },

    /** 渐进播放：逐批 addElements，每批间隔 delay ms，元素像"长"出来一样出现。 */
    playBatches: function (payload, opts) {
      opts = opts || {};
      requireApi();
      var batches = payload.batches || [];
      var full = payload.full || {};
      var delay = opts.delay == null ? 450 : opts.delay;
      var myToken = ++playToken;
      // 视角按完整场景固定，避免逐批跳动
      var fit = full.elements && full.elements.length
        ? fitAppState(full.elements, opts.padding, opts.alignTop !== false)
        : null;
      // 记住完整场景（不是当前批次），resize 时按全图重新 fit，视角不随批次跳动
      rememberFit(full.elements, opts.padding, opts.alignTop);

      if (opts.clearFirst !== false) bridge.clear();
      return sleep(delay).then(function () {
        if (fit) api().updateScene({ appState: fit });
        return batches.reduce(function (chain, batch) {
          return chain.then(function () {
            if (myToken !== playToken) return; // 被新播放取消
            bridge.addElements(batch.elements || [], opts);
            if (opts.onBatch) opts.onBatch(batch);
            return sleep(delay);
          });
        }, Promise.resolve());
      }).then(function () {
        return {
          batches: batches.length,
          count: bridge.getElements().length,
          cancelled: myToken !== playToken,
        };
      });
    },

    /** 轮询批次文件：内容变化即自动渐进播放。返回 stop() 停止轮询。 */
    watch: function (url, opts) {
      opts = opts || {};
      var interval = opts.interval == null ? 1500 : opts.interval;
      var lastSig = null;
      var stopped = false;
      var skipInitial = opts.skipInitial === true; // 首次内容记为基线，不播放旧图

      function tick() {
        if (stopped) return;
        var sep = url.indexOf("?") >= 0 ? "&" : "?";
        fetch(url + sep + "_=" + Date.now(), { cache: "no-store" })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (text) {
            if (stopped || !text) return;
            var sig = hash(text);
            if (sig === lastSig) return; // 内容没变，跳过
            if (lastSig === null && skipInitial) {
              lastSig = sig; // 基线：页面打开时已有的内容不播放
              return;
            }
            lastSig = sig;
            var payload = JSON.parse(text);
            if (opts.onStart) opts.onStart(payload);
            return bridge.playBatches(payload, {
              delay: opts.delay,
              padding: opts.padding,
              clearFirst: opts.clearFirst,
              onBatch: opts.onBatch,
            });
          })
          .then(function (info) { if (info && opts.onDone) opts.onDone(info); })
          .catch(function (e) { if (opts.onError) opts.onError(e); });
      }

      tick();
      var timer = setInterval(tick, interval);
      return function stop() { stopped = true; clearInterval(timer); };
    },
  };

  window.ExcalidrawBridge = bridge;

  // 默认行为：打开首页即自动轮询 /__batches.json 并渐进播放（无需任何 URL 参数）。
  // 覆盖方式：?scene=<url> 单次整图；?watch=<url> 换批次文件；?delay=ms 调节奏；
  //           ?nowatch=1 关闭自动播放（保留手动画布）；带 #json= 时以 URL 场景为准。
  try {
    var qs = new URLSearchParams(window.location.search);
    var sceneUrl = qs.get("scene");
    var watchUrl = qs.get("watch");
    var delay = Number(qs.get("delay")) || 700;
    var nowatch = qs.get("nowatch") === "1";
    var norefit = qs.get("norefit") === "1";
    var replay = qs.get("replay") === "1"; // ?replay=1：页面打开时也播放已有场景（旧行为）
    var urlScene = window.location.hash.startsWith("#json=");
    if (norefit) bridge.setAutoRefit(false);

    if ((sceneUrl || watchUrl || qs.has("delay") || nowatch) && !urlScene) {
      qs.delete("scene");
      qs.delete("watch");
      qs.delete("delay");
      qs.delete("nowatch");
      qs.delete("norefit");
      qs.delete("replay");
      var rest = qs.toString();
      window.history.replaceState(
        null, "",
        window.location.pathname + (rest ? "?" + rest : "") + window.location.hash,
      );
    }

    if (!urlScene && !nowatch) {
      bridge.onReady(function () {
        bridge.watch(watchUrl || "/__batches.json", {
          delay: delay,
          // 默认：页面打开时把当前内容记为基线，不播放旧图；只有之后生成新 JSON 才播一次。
          // 这样 "先打开浏览器 → 再画流程图" 的场景只会播一次（新图），不会播两次。
          // 想保留"打开即播放已有图"的旧行为，用 ?replay=1。
          skipInitial: !replay,
        });
      });
    } else if (sceneUrl && urlScene === false) {
      bridge.onReady(function () {
        bridge.loadScene(sceneUrl).catch(function (e) {
          console.error("[ExcalidrawBridge] 自动加载场景失败", e);
        });
      });
    }
  } catch (e) {}
})();
