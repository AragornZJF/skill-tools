#!/usr/bin/env node
/**
 * serve.mjs — 零依赖静态服务器，用于本地托管 excalidraw 生产构建（excalidraw-app/build）。
 *
 * 用法:
 *   node serve.mjs [目录] [端口]     # 默认: 本 skill 自带的 app/ 目录，端口 5177
 * 示例:
 *   node serve.mjs                       # serve <skill>/app （内置构建产物）
 *   node serve.mjs C:/path/to/build 5177 # serve 任意目录
 *
 * 幂等检测: curl -s -o /dev/null -w "%{http_code}" http://localhost:5177
 * 返回 200 说明已在运行，无需重复启动。
 *
 * 性能设计（为浏览器 agent 反复加载提速）:
 *   - 所有资源带 ETag，命中 If-None-Match 直接 304，不重传 body
 *   - 字体/哈希文件名资源（构建产物不可变）返回 Cache-Control: immutable，二次加载零请求
 *   - index.html 在线改写：CDN 资源根 → 本地 `/`（字体等全部本地加载，消除 CDN 拖慢/离线失败），
 *     并去掉外部统计脚本；同时恒为 no-cache + ETag 协商，产物更新后刷新即生效
 *   - `/__blank` → 空白画布注入页（无 app JS，注入时短暂中转，观感等同"画布清空"，见 SKILL.md）
 *   - 其他未知路径: 带扩展名 → 404；无扩展名 → SPA 回退 index.html
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 默认 serve 本 skill 自带的构建产物 app/（与脚本同级的上级目录）
const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(scriptDir, "..", "app"));
const port = Number(process.argv[3] ?? 5177);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

// 不可变资源：字体文件 + 带内容哈希的文件名（Vite 哈希为 base64url：字母/数字/-/_）
const HASHED_FILE = /-[A-Za-z0-9_-]{6,}\.(?:js|mjs|css|woff2?|ttf|png|svg|webp)$/i;
const FONT_EXT = new Set([".woff", ".woff2", ".ttf"]);

// 恒返回的空 Service Worker：阻止构建产物自带的 workbox SW 拦截同源导航。
// 否则导航到 /__blank 会被 SW 回退成 index.html（app 启动），注入时 app 的
// beforeunload 保存会用内存旧场景覆盖 localStorage 新场景。空 SW 无 fetch 监听
// 即不拦截任何请求。放在服务端保证"重新同步构建产物"后依然生效。
const NOOP_SW = `// excalidraw-draw: 空 Service Worker（由 serve.mjs 恒返回，勿依赖构建产物）
`;

// "干净注入页"：渲染成一张空白画布（无 app JS，不启动应用、不注册 SW），
// 注入时短暂中转，观感等同"画布被清空"，而非空白网页或 404 / Not Found。
// 主题跟随应用：读取 localStorage 的 excalidraw-theme 决定浅色/深色背景。
const BLANK_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Excalidraw Whiteboard</title><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff}html.dark,html.dark body{background:#121212}body{-webkit-user-select:none;user-select:none}</style><script>try{var t=localStorage.getItem('excalidraw-theme');var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}</script></head><body></body></html>`;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    // 注意：Windows 上 path.normalize 会把 / 变成 \，必须转回 /，
    // 否则 startsWith("/__") 前缀判断永远失效
    const p = normalize(decodeURIComponent(url.pathname))
      .replace(/\\/g, "/")
      .replace(/^(\.\.\/)+/, "");
    // /sw.js、/service-worker.js 恒返回空 SW（不拦截导航），保证干净页不被 SW 回退成 app
    if (p === "/sw.js" || p === "/service-worker.js") {
      res.writeHead(200, {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-cache",
      });
      res.end(NOOP_SW);
      return;
    }
    // /__blank 作为"干净注入页"：返回空白画布页（无 app JS，且无 404 观感）。
    // 仅精确匹配，避免劫持 /__scene.json 等其它 /__ 资源。
    if (p === "/__blank") {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      });
      res.end(BLANK_HTML);
      return;
    }
    let file = join(root, p);
    let s = await stat(file).catch(() => null);
    if (s?.isDirectory()) {
      file = join(file, "index.html");
      s = await stat(file).catch(() => null);
    }
    if (!s) {
      // 带扩展名的未知路径 → 404；其余无扩展名路径 → SPA 回退 index.html
      if (extname(p)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
      file = join(root, "index.html"); // SPA 回退
      s = await stat(file).catch(() => null);
      if (!s) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("not found");
        return;
      }
    }
    let data = await readFile(file);
    const ext = extname(file).toLowerCase();
    // 文本类产物在线改写：把 CDN 资源根替换为本地 /（字体等全部本地加载），
    // 并去掉 simpleanalytics 外部统计脚本。避免 CDN 延迟与离线失败，加快启动。
    if (ext === ".html" || ext === ".css" || ext === ".js" || ext === ".mjs") {
      let text = data.toString("utf8");
      text = text.split("https://excalidraw.nyc3.cdn.digitaloceanspaces.com/oss/").join("/");
      if (ext === ".html") {
        text = text.replace(/<script>\/\/ need to load this script dynamically[\s\S]*?<\/script>/, "");
        // 给 /assets/* 引用加版本参数：构建/改写更新后强制刷新浏览器缓存
        // （避免旧的 immutable 缓存继续引用 CDN）
        const v = Math.round(s.mtimeMs);
        text = text.replace(/"\/assets\/([^"??]+)"/g, (m, f) => `"/assets/${f}?v=${v}"`);
      }
      data = Buffer.from(text, "utf8");
    }
    const etag = `W/"${data.length}-${Math.round(s.mtimeMs * 1000)}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, { etag });
      res.end();
      return;
    }
    const immutable = FONT_EXT.has(ext) || HASHED_FILE.test(file);
    res.writeHead(200, {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      etag,
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`[excalidraw-draw] serving ${root}`);
  console.log(`[excalidraw-draw] http://localhost:${port}`);
});
