#!/usr/bin/env node
/**
 * replay_batches.mjs — 让已经打开 ?watch=... 的白板页面重新渐进播放一遍。
 *
 * 原理：watch 用内容 hash 判重，本脚本给批次文件加一个 _replayAt 标记改变内容，
 * 页面下一轮轮询（默认 1.5s 内）检测到变化就会 clear → 逐批重画。
 *
 * 用法: node scripts/replay_batches.mjs [--url http://localhost:5177]
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, "..");

let url = "http://localhost:5177";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--url") url = args[++i];
}

let servedRoot;
try {
  const healthUrl = new URL("/__health", url);
  // Windows 上 Node fetch 可能把 localhost 解析到 ::1，而 serve 只监听 127.0.0.1
  if (healthUrl.hostname === "localhost") healthUrl.hostname = "127.0.0.1";
  const r = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
  const h = await r.json();
  servedRoot = h.servedRoot;
  if (!h.bridge) console.warn("警告: 该服务未启用 Bridge");
} catch (e) {
  console.error(`无法访问 ${url}: ${e.message}`);
  process.exit(1);
}

// 写到 data/ 目录（serve.mjs 的虚拟路由从这里读取），app/ 里不放运行时文件。
const targets = [join(resolve(servedRoot, ".."), "data/__batches.json"), join(skillDir, "data/__batches.json")];
const seen = new Set();
let first;
for (const p of targets) {
  if (seen.has(p)) continue;
  seen.add(p);
  try {
    const data = JSON.parse(await readFile(p, "utf8"));
    data._replayAt = Date.now(); // 改变内容 → hash 变化 → 触发重播
    await writeFile(p, JSON.stringify(data));
    if (!first) first = data;
    console.log(`replay marked: ${p}`);
  } catch (e) {
    console.warn(`跳过 ${p}: ${e.message}`);
  }
}
if (!first) {
  console.error("没有找到 __batches.json，请先运行 gen_scene --batches 生成");
  process.exit(1);
}
console.log(`✓ 已触发重播：${first.batches?.length ?? "?"} 批 / ${first.full?.elements?.length ?? "?"} 元素`);
console.log("  若页面未自动重画，确认地址栏曾以 ?watch=/__batches.json 打开过。");
