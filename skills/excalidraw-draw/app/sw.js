// excalidraw-draw 本地技能：空 Service Worker（替代 workbox SW）
//
// 原因：workbox SW 会拦截同源导航并回退到 index.html，使"干净页" /__blank
// 实际启动了 Excalidraw app；该 app 在 beforeunload 时把内存里的旧场景写回
// localStorage，覆盖刚注入的新场景，导致注入必失败。
//
// 空 SW 不注册任何 fetch 事件监听 → 不拦截请求 → /__blank 走服务器真 404。
// 本技能由本地静态服务器提供离线能力，无需 PWA 预缓存。
//
// 注意：重新同步 app/ 构建产物（见 SKILL.md）会覆盖本文件，需重新写回。
