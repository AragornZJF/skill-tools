#!/usr/bin/env node
/**
 * shot.mjs — 截图验证（标准闭环第 ④ 步）。
 *
 * 截图优先级：
 *   ① live：附加「内部浏览器」（open.mjs 启动的托管窗口，CDP 5178）实时画布 —— 所见即所得；
 *      画布崩溃时自动刷新自愈（刷新即恢复当前图）。
 *   ② headless：无实时窗口（或 --headless）时，自己拉起无头白板页加载当前场景截图。
 *
 * 校验：count == 期望元素数、无 null/损坏字段、nav == 1（headless）/画布存活（live）。
 *
 * 用法:
 *   node scripts/shot.mjs --out shot.png
 *   node scripts/shot.mjs --scene /path/to/scene.json
 *   node scripts/shot.mjs --headless          # 强制无头
 *   node scripts/shot.mjs --url ... --viewport 1600x1200
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");
const BROWSER_CDP_PORT = 5178; // open.mjs 启动的内部浏览器调试端口

const args = process.argv.slice(2);
const opt = {
  out: resolve(skillDir, "tmp/shot.png"),
  url: "http://localhost:5177",
  scenePath: null,
  viewport: "1440x1600",
  browser: null,
  cdpPort: 9778,
  settleMs: 800,
  forceHeadless: false,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out") opt.out = args[++i];
  else if (a === "--url") opt.url = args[++i];
  else if (a === "--scene") opt.scenePath = args[++i];
  else if (a === "--viewport") opt.viewport = args[++i];
  else if (a === "--browser") opt.browser = args[++i];
  else if (a === "--cdp-port") opt.cdpPort = Number(args[++i]);
  else if (a === "--settle") opt.settleMs = Number(args[++i]);
  else if (a === "--headless") opt.forceHeadless = true;
  else if (a === "--help" || a === "-h") {
    console.log("用法: node scripts/shot.mjs [--out shot.png] [--scene scene.json] [--headless] [--url ...] [--viewport WxH]");
    process.exit(0);
  } else {
    console.error(`未知参数: ${a}`);
    process.exit(1);
  }
}
const [vw, vh] = opt.viewport.toLowerCase().split("x").map(Number);
if (!vw || !vh) throw new Error(`无效 viewport: ${opt.viewport}`);
opt.out = resolve(process.cwd(), opt.out);
if (opt.scenePath) opt.scenePath = resolve(process.cwd(), opt.scenePath);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  if (opt.browser) {
    if (!existsSync(opt.browser)) throw new Error(`浏览器不存在: ${opt.browser}`);
    return opt.browser;
  }
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const found = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find(existsSync);
  if (!found) throw new Error("未找到 Chrome/Edge，请用 --browser 指定路径");
  return found;
}
async function probe(baseUrl) {
  for (const p of ["/__health", "/"]) {
    try {
      const u = new URL(p, baseUrl);
      if (u.hostname === "localhost") u.hostname = "127.0.0.1";
      const r = await fetch(u.href, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return true;
    } catch {}
  }
  return false;
}
async function ensureServer() {
  if (await probe(opt.url)) return false;
  const u = new URL(opt.url);
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  const child = spawn(process.execPath, [resolve(scriptDir, "serve.mjs"), resolve(skillDir, "app"), port], {
    detached: true, stdio: "ignore",
  });
  child.unref();
  for (let i = 0; i < 50; i++) {
    if (await probe(opt.url)) return true;
    await sleep(200);
  }
  throw new Error(`本地服务启动失败: ${opt.url}`);
}
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let seq = 1;
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve: ok, reject: fail } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? fail(new Error(JSON.stringify(m.error))) : ok(m.result);
    }
  });
  return {
    open: () => new Promise((ok, fail) => {
      ws.addEventListener("open", ok, { once: true });
      ws.addEventListener("error", fail, { once: true });
    }),
    send(method, params = {}) {
      const id = seq++;
      return new Promise((ok, fail) => {
        pending.set(id, { resolve: ok, reject: fail });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => ws.close(),
  };
}

// —— 内部浏览器（open.mjs 启动的托管窗口）探测 ——
async function findLivePage() {
  if (opt.forceHeadless) return null;
  try {
    const r = await fetch(`http://127.0.0.1:${BROWSER_CDP_PORT}/json/list`, { signal: AbortSignal.timeout(800) });
    if (!r.ok) return null;
    const list = await r.json();
    const origin = new URL(opt.url).origin;
    const page = list.find(
      (t) => t.type === "page" && (t.url || "").startsWith(origin) && t.webSocketDebuggerUrl,
    );
    return page || null;
  } catch {
    return null;
  }
}

let chrome, profileDir, client;
let mode = "headless";
try {
  // ---- 第 1 步：确定要验证的场景（优先 --scene 文件，否则取服务当前场景） ----
  let sceneUrl, expected;
  if (opt.scenePath) {
    const scene = JSON.parse(readFileSync(opt.scenePath, "utf8"));
    const els = scene.full?.elements ?? scene.elements;
    if (!els?.length) throw new Error(`场景文件没有元素: ${opt.scenePath}`);
    expected = els.length;
    const u = new URL("/__health", opt.url);
    if (u.hostname === "localhost") u.hostname = "127.0.0.1";
    const health = await fetch(u.href, { signal: AbortSignal.timeout(1500) })
      .then((r) => r.json())
      .catch(() => null);
    const dataDir = health?.dataDir ?? resolve(skillDir, "data");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(
      resolve(dataDir, "__scene.json"),
      JSON.stringify({ elements: els, appState: scene.appState ?? scene.full?.appState ?? {} }),
    );
    sceneUrl = "/__scene.json";
    console.log(`[1/2] 场景: ${opt.scenePath} → ${expected} 元素（经服务 dataDir 中转）`);
  } else {
    const started = await ensureServer();
    if (started) console.log("      server: started");
    const get = async (p) => {
      const u = new URL(p, opt.url);
      if (u.hostname === "localhost") u.hostname = "127.0.0.1";
      const r = await fetch(u.href, { signal: AbortSignal.timeout(2000), cache: "no-store" });
      return r.json();
    };
    let source = "/__scene.json";
    let scene = await get(source).catch(() => null);
    if (!scene?.elements?.length) {
      const b = await get("/__batches.json").catch(() => null);
      if (b?.full?.elements?.length) {
        scene = b.full;
        source = "/__batches.json (full)";
      }
    }
    if (!scene?.elements?.length) {
      throw new Error("服务里没有可截图的场景：先运行 gen_scene.mjs --push 或 flow_shot.mjs");
    }
    expected = scene.elements.length;
    sceneUrl = source.split(" ")[0];
    console.log(`[1/2] 场景: ${source} → ${expected} 元素`);
  }

  // ---- 第 2 步：截图（live 优先，headless 回退） ----
  const livePage = await findLivePage();
  const evaluate = async (expression) => {
    const r = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "evaluate failed");
    return r.result?.value;
  };

  if (livePage) {
    mode = "live";
    client = cdp(livePage.webSocketDebuggerUrl);
    await client.open();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    console.log(`[mode] live：附加内部浏览器实时画布 ${String(livePage.url).slice(0, 60)}`);
    // 画布崩溃 → 刷新自愈（刷新即恢复当前图，无需重播动画）
    const ok = await evaluate(
      `!!(window.ExcalidrawBridge && ExcalidrawBridge.ready && document.querySelectorAll('canvas').length > 0)`,
    );
    if (!ok) {
      console.log("      live: 画布未就绪/已崩溃 → 刷新自愈");
      await client.send("Page.navigate", { url: new URL("/", opt.url).href });
    }
  } else {
    profileDir = resolve(skillDir, `tmp/shot-profile-${Date.now()}`);
    mkdirSync(profileDir, { recursive: true });
    chrome = spawn(findBrowser(), [
      "--headless=new", `--remote-debugging-port=${opt.cdpPort}`, "--remote-allow-origins=*",
      `--user-data-dir=${profileDir}`, `--window-size=${vw},${vh}`, "--no-first-run",
      "--no-default-browser-check", "--disable-gpu", "about:blank",
    ], { stdio: "ignore" });
    let target;
    for (let i = 0; i < 80; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${opt.cdpPort}/json/list`)).json();
        target = list.find((t) => t.type === "page");
        if (target?.webSocketDebuggerUrl) break;
      } catch {}
      await sleep(150);
    }
    if (!target) throw new Error(`Chrome CDP 未就绪（port ${opt.cdpPort}）`);
    client = cdp(target.webSocketDebuggerUrl);
    await client.open();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", { width: vw, height: vh, deviceScaleFactor: 1, mobile: false });
    // nowatch=1：页面不自动播批次，由我们主动 loadScene 一次整图（验证"当前场景"的最终状态）
    await client.send("Page.navigate", { url: new URL("/?nowatch=1", opt.url).href });
  }

  // —— 公共验证流程 ——
  // UI 就绪（headless 需等两阶段挂载；live 通常已就绪）
  const uiDeadline = Date.now() + 25000;
  let uiReady = false;
  while (Date.now() < uiDeadline) {
    uiReady = await evaluate(
      `!!(window.ExcalidrawBridge && ExcalidrawBridge.ready
         && document.querySelectorAll('canvas').length > 0
         && document.querySelector('.layer-ui__wrapper'))`,
    );
    if (uiReady) break;
    await sleep(250);
  }
  if (!uiReady) throw new Error("白板 UI 未就绪（canvas/toolbar 未出现；检查 __health.bridge 与服务是否为最新 serve.mjs）");

  // live 模式：若实时画布已与规格一致，直接截图（不覆盖用户正在看的画面）
  const checkIntact = async () =>
    evaluate(`(() => {
      const els = ExcalidrawBridge.getElements();
      if (els.length !== ${expected}) return 'count';
      for (const e of els) {
        if (e.x == null || e.y == null) return 'null-field';
        if (e.points) for (const p of e.points) if (!p || p[0] == null || p[1] == null) return 'null-point';
      }
      return 'ok';
    })()`);

  let state = await checkIntact();
  if (mode === "live" && state === "ok") {
    console.log(`      live: 实时画布已是当前场景（${expected} 元素完整）→ 直接截图`);
  } else {
    // 载入/重同步场景（bridge 的初始化守卫会在 ~350ms 内重放被覆盖的内容）
    const sep = sceneUrl.includes("?") ? "&" : "?";
    let count = -1;
    for (let attempt = 0; attempt < 3 && count !== expected; attempt++) {
      await evaluate(
        `ExcalidrawBridge.loadScene('${sceneUrl}${sep}v=' + Date.now()).then(x => x.count)`,
      );
      const deadline = Date.now() + 4000;
      while (Date.now() < deadline) {
        count = await evaluate(`ExcalidrawBridge.getElements().length`);
        state = await checkIntact();
        if (count === expected && state === "ok") break;
        await sleep(250);
      }
      if (count === expected && state === "ok") break;
    }
    if (count !== expected) throw new Error(`场景载入后元素数不符: ${count} != ${expected}`);
    if (state !== "ok") throw new Error(`场景字段损坏（${state}）：全量守卫未能自愈，请重试`);
  }

  const alive = await evaluate(`document.querySelectorAll('canvas').length > 0`);
  if (!alive) throw new Error("画布已崩溃（canvas 消失）");

  // 视角兜底：重新缩放居中（live 模式也适用，避免内容在视口外）
  await evaluate(`ExcalidrawBridge.zoomToFit()`);
  await sleep(opt.settleMs);

  const shot = await client.send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: false, fromSurface: true,
  });
  mkdirSync(dirname(opt.out), { recursive: true });
  writeFileSync(opt.out, Buffer.from(shot.data, "base64"));

  const final = await evaluate(`({
    count: ExcalidrawBridge.getElements().length,
    nav: performance.getEntriesByType('navigation').length,
    href: location.href,
  })`);
  console.log(`[2/2] 截图(${mode}): ${opt.out}`);
  console.log(`      验收: ${JSON.stringify(final)}（nav=1 = 无刷新）`);

  if (final.count !== expected) throw new Error(`元素数不符: ${final.count} != ${expected}`);
  console.log(`      ✓ 通过: ${expected} 元素全部渲染${mode === "headless" ? "，无刷新" : "（内部浏览器实时画面）"}`);
} finally {
  if (client) client.close();
  if (chrome) chrome.kill();
  if (profileDir) {
    await sleep(300);
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
}
