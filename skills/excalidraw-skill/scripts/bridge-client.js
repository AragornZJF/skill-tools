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

  // 页面注入时刻（本文件是 classic script，先于 app module 执行，即"页面打开时刻"）。
  // watch 配合 serve 的 x-mtime-ms 响应头区分：
  //   - 打开前 ≥2s 就存在的旧图 → 记为基线，不播放（避免重复播旧图）
  //   - 打开前后 ±2s 内生成/推送的内容 → 视为新图直接播放
  //     解决"先 push、浏览器后加载完成，首轮轮询把新图误记为基线导致不播"的竞态。
  var bootAt = Date.now();

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

  // 全量场景守卫（根治 wipe 竞态）：app 的 initializeScene 在挂载后 1.5~2.5s 才异步落地，
  // 会用 localStorage/URL 的空场景覆写当前内容（清空或部分丢失），且绑定箭头引用被清掉的
  // 形状时重算出 null 坐标 → calculateBounds 崩溃。
  // 对策：记住最近一次完整场景（lastFull），更新后在 6s 内周期检查元素数，
  // 一旦缩水立即整图重放。expectedCount 传本次更新后的应有总数。
  var lastFull = null; // { elements, appState }
  var fullGuardTimer = null;
  function scheduleFullSceneGuard(a, expectedCount) {
    clearTimeout(fullGuardTimer);
    if (!lastFull || !lastFull.elements || !lastFull.elements.length) return;
    var delays = [350, 550, 900, 1300, 1800, 2500, 3500];
    var idx = 0;
    (function check() {
      fullGuardTimer = setTimeout(function () {
        try {
          if (a.isDestroyed) return;
          var els = a.getSceneElements();
          var n = els.length;
          // 数量缩水 或 字段损坏（应用调和 bug 会把 x/y/points 写成 null）→ 整图重放
          var damaged = false;
          for (var i = 0; i < els.length; i++) {
            var e = els[i];
            if (e.x == null || e.y == null) { damaged = true; break; }
            if (e.points) {
              for (var p = 0; p < e.points.length; p++) {
                var pt = e.points[p];
                if (!pt || pt[0] == null || pt[1] == null) { damaged = true; break; }
              }
              if (damaged) break;
            }
          }
          if ((expectedCount > 0 && n < expectedCount) || damaged) {
            // 场景缩水/损坏（initializeScene wipe）→ 整图重放
            a.updateScene({ elements: lastFull.elements, appState: lastFull.appState });
          }
        } catch (e) {}
        idx += 1;
        if (idx < delays.length) check();
      }, delays[idx]);
    })();
  }

  // DOM 稳定门：app boot 期间（字体加载/懒加载分块）会多次重建 DOM，
  // 若在这个窗口连续 updateScene，场景调和可能产生 x/points 为 null 的元素并崩掉整棵树
  // （calculateBounds 读 null.x → React 全树卸载）。
  // 所以批量更新前等 body 长度连续 ~1.2s 不变（boot 结束的信号），最长等 12s。
  function waitDomSettled() {
    var last = -1, stable = 0;
    var deadline = Date.now() + 12000;
    return new Promise(function (resolve) {
      (function tick() {
        var len = document.body ? document.body.innerHTML.length : 0;
        stable = len === last ? stable + 1 : 0;
        last = len;
        if (stable >= 4 || Date.now() > deadline) return resolve();
        setTimeout(tick, 300);
      })();
    });
  }

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
      if (patch.elements.length) {
        lastFull = { elements: patch.elements, appState: patch.appState || null };
        scheduleFullSceneGuard(a, patch.elements.length);
      }
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
      scheduleFullSceneGuard(a, patch.elements.length);
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
      return waitDomSettled()
        .then(function () { return fetch(url, { cache: "no-store" }); })
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
      var delay = opts.delay == null ? 700 : opts.delay;
      var myToken = ++playToken;
      // 视角按完整场景固定，避免逐批跳动
      var fit = full.elements && full.elements.length
        ? fitAppState(full.elements, opts.padding, opts.alignTop !== false)
        : null;
      // 记住完整场景（不是当前批次），resize 时按全图重新 fit，视角不随批次跳动
      rememberFit(full.elements, opts.padding, opts.alignTop);

      // 先等 app boot 稳定（见 waitDomSettled 注释）：
      // boot 未完成时连续 updateScene 会触发应用的场景调和 bug（元素坐标被写成 null → 全树崩溃）
      return waitDomSettled().then(function () {
        if (myToken !== playToken) return { batches: 0, count: 0, cancelled: true };
        // 记住完整场景供全量守卫使用（wipe 后整图重放，而不是只重放最后一批）
        if (full.elements && full.elements.length) {
          lastFull = { elements: full.elements, appState: full.appState || null };
        }
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
          // 自愈：若播放期间场景被应用内部竞态清掉/弄丢元素，一次性整图重放
          var expected = full.elements ? full.elements.length : 0;
          var got = bridge.getElements().length;
          if (myToken === playToken && expected > 0 && got !== expected) {
            bridge.setScene(full.elements, full.appState);
            got = bridge.getElements().length;
            return { batches: batches.length, count: got, cancelled: false, healed: got === expected };
          }
          return { batches: batches.length, count: got, cancelled: myToken !== playToken };
        });
      });
    },

    /** 轮询批次文件：内容变化即自动渐进播放。返回 stop() 停止轮询。 */
    watch: function (url, opts) {
      opts = opts || {};
      var interval = opts.interval == null ? 1500 : opts.interval;
      var lastSig = opts.baselineSig != null ? opts.baselineSig : null;
      var stopped = false;
      var skipInitial = opts.skipInitial === true; // 首次内容记为基线，不播放旧图

      function tick() {
        if (stopped) return;
        var sep = url.indexOf("?") >= 0 ? "&" : "?";
        fetch(url + sep + "_=" + Date.now(), { cache: "no-store" })
          .then(function (r) {
            if (!r.ok) return null;
            var mtimeMs = Number(r.headers.get("x-mtime-ms")) || 0;
            return r.text().then(function (text) { return { text: text, mtimeMs: mtimeMs }; });
          })
          .then(function (res) {
            if (stopped || !res || !res.text) return;
            var sig = hash(res.text);
            if (sig === lastSig) return; // 内容没变，跳过
            // fresh = 文件 mtime 晚于页面打开前 2s → 这是刚推送的新图，即使首轮轮询也直接播放；
            // 无 x-mtime-ms 头（自定义 watch URL）时 mtimeMs=0，保持旧的基线行为。
            var fresh = res.mtimeMs > bootAt - 2000;
            if (lastSig === null && skipInitial && !fresh) {
              lastSig = sig; // 基线：页面打开前就存在的旧图不播放
              return;
            }
            lastSig = sig;
            var payload = JSON.parse(res.text);
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
        var url2 = watchUrl || "/__batches.json";
        // 刷新/重开浏览器：服务里已有图 → 立即整图恢复（不重播渐进动画），图不再消失；
        // 恢复的内容记为基线，之后文件变化 → 渐进播放新图。
        // ?replay=1：跳过恢复，改为动画重播当前内容。
        fetch(url2 + "?_=" + Date.now(), { cache: "no-store" })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (text) {
            var sig = text ? hash(text) : null;
            var payload = null;
            try { payload = text ? JSON.parse(text) : null; } catch (e) {}
            var full = payload && payload.full;
            if (full && full.elements && full.elements.length && !replay) {
              bridge.setScene(full.elements, full.appState);
              bridge.zoomToFit();
            }
            return sig;
          })
          .catch(function () { return null; })
          .then(function (sig) {
            bridge.watch(url2, {
              delay: delay,
              skipInitial: true,
              baselineSig: sig, // 已恢复的内容记为基线，只有变化才渐进播放
            });
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
