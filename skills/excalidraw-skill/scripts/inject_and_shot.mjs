#!/usr/bin/env node
/**
 * inject_and_shot.mjs — 零依赖的一键 Excalidraw 注入 + 截图执行器。
 *
 * 适合只有 shell、没有浏览器 agent 的环境：
 *   node scripts/inject_and_shot.mjs --scene tmp/flow.json --out tmp/flow.png
 *   node scripts/inject_and_shot.mjs --demo --out tmp/demo.png --export tmp/demo.excalidraw
 *   node scripts/inject_and_shot.mjs --scene-json tmp/scene.json --browser "C:/.../msedge.exe"
 *
 * 流程：确保本地服务 → 启动 Chrome/Edge headless → CDP 连接 → 打开 /__blank
 *      → 注入 localStorage → 导航到 / → 等待 canvas → 截图。
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");
const genScene = resolve(skillDir, "scripts/gen_scene.mjs");

const args = process.argv.slice(2);
const opt = {
  scene: null,
  sceneJson: null,
  batches: null,
  demo: false,
  out: resolve(skillDir, "tmp/last-scene.png"),
  exportTo: null,
  url: "http://localhost:5177",
  viewport: "1440x900",
  browser: null,
  cdpPort: 9222,
  batchDelay: 600,
  keepOpen: false,
  noBind: false,
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--scene") opt.scene = args[++i];
  else if (a === "--scene-json") opt.sceneJson = args[++i];
  else if (a === "--batches") opt.batches = args[++i];
  else if (a === "--batch-delay") opt.batchDelay = Number(args[++i]);
  else if (a === "--demo") opt.demo = true;
  else if (a === "--out") opt.out = args[++i];
  else if (a === "--export") opt.exportTo = args[++i];
  else if (a === "--url") opt.url = args[++i];
  else if (a === "--viewport") opt.viewport = args[++i];
  else if (a === "--browser") opt.browser = args[++i];
  else if (a === "--cdp-port") opt.cdpPort = Number(args[++i]);
  else if (a === "--keep-open") opt.keepOpen = true;
  else if (a === "--no-bind") opt.noBind = true;
  else if (a === "--help" || a === "-h") {
    console.log("用法: node scripts/inject_and_shot.mjs (--scene spec.json | --batches batches.json | --scene-json scene.json | --demo) --out shot.png [--export scene.excalidraw]");
    process.exit(0);
  } else {
    console.error(`未知参数: ${a}`);
    process.exit(1);
  }
}

if (!opt.scene && !opt.sceneJson && !opt.batches && !opt.demo) {
  console.error("必须提供 --scene <规格.json>、--scene-json <场景.json>、--batches <批次.json> 或 --demo");
  process.exit(1);
}

const [vw, vh] = opt.viewport.toLowerCase().split("x").map(Number);
if (!vw || !vh) throw new Error(`无效 viewport: ${opt.viewport}`);

for (const k of ["scene", "sceneJson", "batches", "out", "exportTo", "browser"]) {
  if (opt[k]) opt[k] = resolve(process.cwd(), opt[k]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  if (opt.browser) {
    if (!existsSync(opt.browser)) throw new Error(`浏览器不存在: ${opt.browser}`);
    return opt.browser;
  }
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("未找到 Chrome/Edge，请用 --browser 指定路径");
  return found;
}

async function probe(baseUrl) {
  for (const path of ["/__health", "/"]) {
    try {
      const u = new URL(path, baseUrl);
      // Node fetch 在 Windows 可能把 localhost 解析到 ::1，而 serve.mjs 只监听 127.0.0.1
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
  const root = resolve(skillDir, "app");
  const child = spawn(process.execPath, [resolve(skillDir, "scripts/serve.mjs"), root, port], {
    detached: true,
    stdio: "ignore",
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
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject: fail } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) fail(new Error(`${msg.error.code}: ${msg.error.message}`));
      else ok(msg.result);
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

async function getTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${opt.cdpPort}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Chrome CDP 未就绪（port ${opt.cdpPort}）`);
}

async function evaluate(client, expression, awaitPromise = false) {
  const r = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || "evaluate failed");
  }
  return r.result?.value;
}

async function waitApp(client, origin, expected) {
  let info;
  for (let i = 0; i < 100; i++) {
    info = await evaluate(client, `({
      href: location.href,
      ready: document.readyState,
      canvases: document.querySelectorAll('canvas').length,
      stored: JSON.parse(localStorage.getItem('excalidraw') || '[]').length
    })`);
    if (
      info.href === `${origin}/` &&
      info.ready === "complete" &&
      info.canvases >= 2 &&
      info.stored === expected
    ) break;
    await sleep(150);
  }
  if (info.stored !== expected) {
    throw new Error(`元素数校验失败: expected ${expected}, got ${info.stored}`);
  }
  return info;
}

const injectFn = async (scene, zoomScene = scene) => {
  const els = scene.elements;
  if (!Array.isArray(els) || !els.length) return "EMPTY SCENE";
  const boundEls = zoomScene.elements ?? els;
  const minX = Math.min(...boundEls.map((e) => e.x));
  const maxX = Math.max(...boundEls.map((e) => e.x + (e.width || 0)));
  const minY = Math.min(...boundEls.map((e) => e.y));
  const maxY = Math.max(...boundEls.map((e) => e.y + (e.height || 0)));
  const cx = (minX + maxX) / 2;
  const vw = innerWidth;
  const vh = innerHeight;
  const padX = 40;
  const padTop = 90;
  const padBottom = 40;
  const zoom = Math.min(
    (vw - padX * 2) / Math.max(1, maxX - minX),
    (vh - padTop - padBottom) / Math.max(1, maxY - minY),
    1,
  );
  // 静音 app 的 beforeunload 回写，避免 reload 时旧内存场景覆盖刚写入的数据。
  const origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === "excalidraw" || k === "excalidraw-state") return;
    return origSet.call(this, k, v);
  };
  origSet.call(localStorage, "excalidraw", JSON.stringify(els));
  origSet.call(localStorage, "excalidraw-state", JSON.stringify({
    viewBackgroundColor: zoomScene.appState?.viewBackgroundColor || scene.appState?.viewBackgroundColor || "#ffffff",
    zoom: { value: zoom },
    scrollX: vw / (2 * zoom) - cx,
    scrollY: padTop / zoom - minY,
  }));
  return { count: els.length, zoom: Number(zoom.toFixed(3)) };
};

let chrome;
let profileDir;
let client;

try {
  const startedServer = await ensureServer();
  console.log(startedServer ? "server: started" : "server: already running");

  let scene;
  let batchPayload = null;
  if (opt.batches) {
    batchPayload = JSON.parse(readFileSync(opt.batches, "utf8"));
    if (!batchPayload?.full || !Array.isArray(batchPayload.batches)) {
      throw new Error("--batches 文件需要包含 full 和 batches 数组（由 gen_scene --batches 生成）");
    }
    scene = batchPayload.full;
  } else if (opt.sceneJson) {
    scene = JSON.parse(readFileSync(opt.sceneJson, "utf8"));
  } else {
    const genArgs = [genScene, opt.demo ? "--demo" : opt.scene];
    if (opt.noBind) genArgs.push("--no-bind");
    scene = JSON.parse(execFileSync(process.execPath, genArgs, { encoding: "utf8", cwd: skillDir }));
  }
  const expected = scene.elements.length;
  if (!expected) throw new Error("场景为空");

  if (opt.exportTo) {
    mkdirSync(dirname(opt.exportTo), { recursive: true });
    writeFileSync(opt.exportTo, JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements: scene.elements,
      appState: { ...scene.appState, gridSize: null },
      files: {},
    }));
    console.log(`export: ${opt.exportTo}`);
  }

  const browser = findBrowser();
  profileDir = resolve(skillDir, `tmp/cdp-profile-${Date.now()}`);
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });
  chrome = spawn(browser, [
    "--headless=new",
    `--remote-debugging-port=${opt.cdpPort}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${profileDir}`,
    `--window-size=${vw},${vh}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank",
  ], { stdio: "ignore" });

  const target = await getTarget();
  client = cdp(target.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: vw,
    height: vh,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const origin = new URL(opt.url).origin;
  await client.send("Page.navigate", { url: `${origin}/__blank` });
  for (let i = 0; i < 60; i++) {
    const state = await evaluate(client, "({href:location.href,ready:document.readyState})");
    if (state.href === `${origin}/__blank` && state.ready === "complete") break;
    await sleep(100);
  }

  const injectExpr = (toWrite, zoomScene) =>
    `(${injectFn.toString()})(${JSON.stringify(toWrite)}, ${JSON.stringify(zoomScene)})`;

  let info;
  if (batchPayload) {
    const ids = new Set();
    let accumulated = [];
    const total = batchPayload.batches.length;
    for (const [i, batch] of batchPayload.batches.entries()) {
      for (const e of batch.elements) {
        if (!ids.has(e.id)) {
          ids.add(e.id);
          accumulated.push(e);
        }
      }
      const toWrite = { elements: accumulated, appState: scene.appState };
      if (i === 0) {
        await evaluate(client, "localStorage.removeItem('excalidraw'); localStorage.removeItem('excalidraw-state'); 'ok'");
      }
      const injected = await evaluate(client, injectExpr(toWrite, scene), true);
      console.log(`batch ${i + 1}/${total} ${batch.name}: ${JSON.stringify(injected)}`);
      if (i === 0) await client.send("Page.navigate", { url: `${origin}/` });
      else await client.send("Page.reload");
      info = await waitApp(client, origin, accumulated.length);
      if (i < total - 1) await sleep(opt.batchDelay);
    }
  } else {
    const injected = await evaluate(client, injectExpr(scene, scene), true);
    console.log(`inject: ${JSON.stringify(injected)}`);
    await client.send("Page.navigate", { url: `${origin}/` });
    info = await waitApp(client, origin, expected);
  }

  await sleep(1000);

  const shot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  mkdirSync(dirname(opt.out), { recursive: true });
  writeFileSync(opt.out, Buffer.from(shot.data, "base64"));
  console.log(`screenshot: ${opt.out}`);
  console.log(`verify: ${JSON.stringify(info)}`);
} finally {
  if (client) client.close();
  if (chrome && !opt.keepOpen) chrome.kill();
  if (profileDir && !opt.keepOpen) {
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
}
