#!/usr/bin/env node
/**
 * flow_shot.mjs — 标准闭环：生成 JSON → 渐进加载显示 → 截图验证。
 *
 * 一条命令完成：
 *   1) 规格 JSON（含 batches）→ gen_scene 生成批次场景，写到 data/__batches.json
 *   2) 打开本地白板（无需 URL 参数，默认自动 watch + 从空白渐进播放）
 *   3) 采样元素数变化，确认是"逐批长出来"而非一次性整图
 *   4) 播放结束后截图，供验收
 *
 * 用法:
 *   node scripts/flow_shot.mjs --scene spec.json --out shot.png [--export out.excalidraw]
 *   node scripts/flow_shot.mjs --batches data/__batches.json --out shot.png
 *   node scripts/flow_shot.mjs --scene-json data/__scene.json --out shot.png   # 无 batches 时整图
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");
const genScene = resolve(scriptDir, "gen_scene.mjs");
// 关键：写入服务实际读取的 dataDir（从 __health 获取），而不是脚本所在副本的 data/。
// dev 脚本常配合部署副本的服务（5177）运行，写错目录会导致浏览器看不到新场景。
let dataDir = resolve(skillDir, "data"); // 默认，下面 probe 后覆盖
let batchesFile = resolve(dataDir, "__batches.json");
let sceneFile = resolve(dataDir, "__scene.json");

const args = process.argv.slice(2);
const opt = {
  scene: null,
  sceneJson: null,
  batches: null,
  out: resolve(skillDir, "tmp/flow-shot.png"),
  exportTo: null,
  url: "http://localhost:5177",
  viewport: "1440x1600",
  browser: null,
  cdpPort: 9777,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--scene") opt.scene = args[++i];
  else if (a === "--scene-json") opt.sceneJson = args[++i];
  else if (a === "--batches") opt.batches = args[++i];
  else if (a === "--out") opt.out = args[++i];
  else if (a === "--export") opt.exportTo = args[++i];
  else if (a === "--url") opt.url = args[++i];
  else if (a === "--viewport") opt.viewport = args[++i];
  else if (a === "--browser") opt.browser = args[++i];
  else if (a === "--cdp-port") opt.cdpPort = Number(args[++i]);
  else if (a === "--help" || a === "-h") {
    console.log("用法: node scripts/flow_shot.mjs (--scene spec.json | --batches batches.json | --scene-json scene.json) --out shot.png [--export file.excalidraw]");
    process.exit(0);
  } else {
    console.error(`未知参数: ${a}`);
    process.exit(1);
  }
}
if (!opt.scene && !opt.sceneJson && !opt.batches) {
  console.error("必须提供 --scene / --batches / --scene-json");
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
  const child = spawn(process.execPath, [resolve(skillDir, "scripts/serve.mjs"), resolve(skillDir, "app"), port], {
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

let chrome, profileDir, client;
try {
  // ---- 第 1 步：生成 JSON ----
  mkdirSync(dataDir, { recursive: true });
  let fullCount;
  let batchCount = 0;
  if (opt.batches) {
    const payload = JSON.parse(readFileSync(opt.batches, "utf8"));
    if (!payload.full || !Array.isArray(payload.batches)) throw new Error("--batches 文件缺 full/batches");
    writeFileSync(batchesFile, JSON.stringify(payload));
    fullCount = payload.full.elements.length;
    batchCount = payload.batches.length;
  } else if (opt.scene) {
    const payload = JSON.parse(execFileSync(process.execPath, [genScene, opt.scene, "--batches"], {
      encoding: "utf8", cwd: skillDir,
    }));
    writeFileSync(batchesFile, JSON.stringify(payload));
    fullCount = payload.full.elements.length;
    batchCount = payload.batches.length;
  } else {
    const scene = JSON.parse(readFileSync(opt.sceneJson, "utf8"));
    writeFileSync(batchesFile, JSON.stringify({
      full: scene,
      batches: [{ name: "全图", elements: scene.elements }],
    }));
    fullCount = scene.elements.length;
    batchCount = 1;
  }
  writeFileSync(sceneFile, JSON.stringify({ elements: [], appState: {} }));
  console.log(`[1/3] JSON 已生成: ${batchCount} 批 / ${fullCount} 元素 → data/__batches.json`);

  if (opt.exportTo) {
    const payload = JSON.parse(readFileSync(batchesFile, "utf8"));
    mkdirSync(dirname(opt.exportTo), { recursive: true });
    writeFileSync(opt.exportTo, JSON.stringify({
      type: "excalidraw", version: 2, source: "https://excalidraw.com",
      elements: payload.full.elements, appState: { ...payload.full.appState, gridSize: null }, files: {},
    }));
    console.log(`      export: ${opt.exportTo}`);
  }

  const started = await ensureServer();
  console.log(started ? "      server: started" : "      server: already running");

  // 从 __health 拿到服务真实 dataDir，重新定位写入目标（写错目录是本脚本此前失败的根因）
  try {
    const hu = new URL("/__health", opt.url);
    if (hu.hostname === "localhost") hu.hostname = "127.0.0.1";
    const h = await (await fetch(hu, { signal: AbortSignal.timeout(1500) })).json();
    if (h.dataDir) {
      dataDir = h.dataDir;
      batchesFile = resolve(dataDir, "__batches.json");
      sceneFile = resolve(dataDir, "__scene.json");
      // 把第 1 步已生成的内容搬到服务 dataDir
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(batchesFile, readFileSync(resolve(skillDir, "data/__batches.json")));
      writeFileSync(sceneFile, readFileSync(resolve(skillDir, "data/__scene.json")));
      console.log(`      dataDir → ${dataDir}`);
    }
  } catch {}

  // ---- 第 2 步：渐进加载显示 ----
  profileDir = resolve(skillDir, `tmp/flow-profile-${Date.now()}`);
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
  const evaluate = async (expression) => {
    const r = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "evaluate failed");
    return r.result?.value;
  };

  // flow_shot 是先写 JSON 再开页面，首次 fetch 就是要播的新场景，必须 ?replay=1 跳过基线逻辑
  await client.send("Page.navigate", { url: new URL("/?replay=1", opt.url).href });

  // 采样元素数：确认从 0 逐步增长，而非一次性出现整图
  const samples = [];
  const deadline = Date.now() + 30000;
  let stable = 0;
  while (Date.now() < deadline) {
    const n = await evaluate(`window.ExcalidrawBridge ? ExcalidrawBridge.getElements().length : -1`);
    samples.push(n);
    if (n === fullCount) {
      stable++;
      if (stable >= 4) break; // 连续 4 次达到满额即认为播放完成
    } else {
      stable = 0;
    }
    await sleep(200);
  }
  const uniq = [...new Set(samples)];
  const progressive = uniq.length >= 3 && uniq[uniq.length - 1] === fullCount;
  console.log(`[2/3] 渐进验证: ${uniq.join(" → ")}  ${progressive ? "✓ 逐批出现" : "✗ 未观察到渐进"}`);

  // ---- 第 3 步：截图验证 ----
  await sleep(600); // 等 canvas 重绘
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
  console.log(`[3/3] 截图: ${opt.out}`);
  console.log(`      验收: ${JSON.stringify(final)}（nav=1 表示全程无刷新）`);

  if (!progressive) throw new Error("未观察到渐进加载（元素数无中间态）");
  if (final.count !== fullCount) throw new Error(`元素数不符: ${final.count} != ${fullCount}`);
  if (final.nav !== 1) throw new Error(`发生刷新: nav=${final.nav}`);
} finally {
  if (client) client.close();
  if (chrome) chrome.kill();
  if (profileDir) {
    await sleep(300);
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
}
