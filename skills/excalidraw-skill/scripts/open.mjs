#!/usr/bin/env node
/**
 * open.mjs — ① 启动服务 + 打开「内部浏览器」。
 *
 * 内部浏览器 = 技能自管理的可视化浏览器窗口（系统 Chrome/Edge + 专用 profile + CDP 5178）：
 *   - 用户可直接观看白板（打开/刷新自动恢复当前图）
 *   - shot.mjs 优先附加此窗口截图验证（所见即所得，画布崩溃可自动刷新自愈）
 *   - 幂等：窗口已存在时只导航，不开新窗
 * 未找到 Chrome/Edge 时回退系统默认浏览器（仅打开页面，无 CDP）；--default-browser 强制走该回退。
 *
 * 用法:
 *   node scripts/open.mjs [--url http://localhost:5177] [--path /] [--no-browser] [--default-browser]
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");
const BROWSER_CDP_PORT = 5178;

let url = "http://localhost:5177";
let path = "/";
let noBrowser = false;
let useDefaultBrowser = false;
let external = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url") url = args[++i];
  else if (args[i] === "--path") path = args[++i];
  else if (args[i] === "--no-browser") noBrowser = true;
  else if (args[i] === "--default-browser") useDefaultBrowser = true;
  else if (args[i] === "--external") external = true;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function findBrowser() {
  return [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find(existsSync);
}

async function cdpList(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(800) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
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

let started = false;
if (!(await probe(url))) {
  const u = new URL(url);
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  const child = spawn(process.execPath, [resolve(scriptDir, "serve.mjs"), resolve(scriptDir, "app"), port], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  for (let i = 0; i < 50; i++) {
    if (await probe(url)) {
      started = true;
      break;
    }
    await sleep(200);
  }
  if (!started) {
    console.error(`服务启动失败: ${url}`);
    process.exit(1);
  }
}
console.log(started ? "server: started" : "server: already running");

const target = new URL(path, url).href;
const origin = new URL(url).origin;

// PalWorks 环境（~/.palworks 存在）：优先使用 PalWorks 内部浏览器（YoBrowser）。
// 内部浏览器由宿主 agent 工具驱动（load_url / cdp_send / get_browser_status，
// 旧名 yo_browser_window_open / yo_browser_cdp_send / yo_browser_window_list），
// 脚本进程无法直达 → 输出明确指引后退出；agent 若无这些工具，用 --external 启动外部托管浏览器。
if (!noBrowser && !useDefaultBrowser && !external && existsSync(join(os.homedir(), ".palworks"))) {
  console.log("PALWORKS_INTERNAL: 检测到 PalWorks 环境（~/.palworks）—— 优先使用内部浏览器 YoBrowser");
  console.log(`PALWORKS_INTERNAL: 请由 agent 调用 load_url 工具打开: ${target}`);
  console.log("PALWORKS_INTERNAL: 截图验收用 cdp_send {method:'Page.captureScreenshot'}；状态查询 get_browser_status");
  console.log("PALWORKS_INTERNAL: 若 agent 无这些工具，运行 open.mjs --external 启动外部托管浏览器");
  process.exit(0);
}

if (noBrowser) {
  console.log(`打开: ${target}`);
} else {
  const bin = useDefaultBrowser ? null : findBrowser();
  if (!bin) {
    // 回退：系统默认浏览器（无 CDP，shot.mjs 会自动走 headless 截图）
    const platform = process.platform;
    try {
      if (platform === "win32") {
        execFileSync("cmd", ["/c", "start", "", target], { stdio: "ignore" });
      } else if (platform === "darwin") {
        execFileSync("open", [target], { stdio: "ignore" });
      } else {
        execFileSync("xdg-open", [target], { stdio: "ignore" });
      }
      console.log(`default browser: opened ${target}（未找到 Chrome/Edge，回退系统默认浏览器）`);
    } catch (e) {
      console.log(`无法自动打开浏览器，请手动访问: ${target} (${e.message})`);
    }
  } else {
    // 幂等：内部浏览器窗口已存在（CDP 活着且已打开本服务页面）→ 只导航，不开新窗
    let reused = false;
    const list = await cdpList(BROWSER_CDP_PORT);
    if (Array.isArray(list)) {
      const page = list.find((t) => t.type === "page" && (t.url || "").startsWith(origin) && t.webSocketDebuggerUrl);
      if (page) {
        reused = true;
        try {
          const client = cdp(page.webSocketDebuggerUrl);
          await client.open();
          await client.send("Page.enable");
          await client.send("Page.navigate", { url: target });
          client.close();
        } catch {}
        console.log(`internal browser: 复用已有窗口 → ${target}`);
      }
    }
    if (!reused) {
      const profileDir = resolve(skillDir, "tmp/browser-profile");
      mkdirSync(profileDir, { recursive: true });
      const child = spawn(
        bin,
        [
          "--new-window",
          `--remote-debugging-port=${BROWSER_CDP_PORT}`,
          "--remote-allow-origins=*",
          `--user-data-dir=${profileDir}`,
          "--window-size=1600,1000",
          "--no-first-run",
          "--no-default-browser-check",
          target,
        ],
        { detached: true, stdio: "ignore" },
      );
      child.unref();
      let cdpOk = false;
      for (let i = 0; i < 50; i++) {
        const l = await cdpList(BROWSER_CDP_PORT);
        if (Array.isArray(l) && l.some((t) => t.type === "page")) {
          cdpOk = true;
          break;
        }
        await sleep(200);
      }
      console.log(
        `internal browser: 已启动 → ${target}` +
          (cdpOk ? "（CDP 5178，shot.mjs 可直接截图实时画布）" : "（CDP 未就绪，shot.mjs 将回退 headless）"),
      );
      console.log("profile: tmp/browser-profile（持久保留，字体/缓存热身加速下次打开）");
    }
  }
}
console.log("打开/刷新自动恢复当前图；推送新图自动渐进播放；?nowatch=1 手动；?replay=1 动画重播；或 node scripts/replay_batches.mjs");
