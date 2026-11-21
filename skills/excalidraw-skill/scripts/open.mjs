#!/usr/bin/env node
/**
 * open.mjs — 一键：确保本地服务运行 → 用默认浏览器打开白板首页。
 *
 * 打开后（默认行为）页面会自动轮询 /__batches.json 并渐进播放已生成的流程。
 * 用法: node scripts/open.mjs [--url http://localhost:5177] [--path /] [--no-browser]
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");

let url = "http://localhost:5177";
let path = "/";
let noBrowser = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url") url = args[++i];
  else if (args[i] === "--path") path = args[++i];
  else if (args[i] === "--no-browser") noBrowser = true;
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

let started = false;
if (!(await probe(url))) {
  const u = new URL(url);
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  const child = spawn(process.execPath, [resolve(skillDir, "scripts/serve.mjs"), resolve(skillDir, "app"), port], {
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
if (noBrowser) {
  console.log(`打开: ${target}`);
} else {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      execFileSync("cmd", ["/c", "start", "", target], { stdio: "ignore" });
    } else if (platform === "darwin") {
      execFileSync("open", [target], { stdio: "ignore" });
    } else {
      execFileSync("xdg-open", [target], { stdio: "ignore" });
    }
    console.log(`browser: opened ${target}`);
  } catch (e) {
    console.log(`无法自动打开浏览器，请手动访问: ${target} (${e.message})`);
  }
}
console.log("默认自动播放 /__batches.json；关闭用 ?nowatch=1；重播用 node scripts/replay_batches.mjs");
