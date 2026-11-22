# 性能优化记录（为什么现在是极致速度）

本文汇总本技能为「快速画图」做的全部优化：**改了什么、为什么、怎么验证**。
目标：一次画图约 4~9 次工具调用、应用加载约 0.5s。

---

## 一、服务端（scripts/serve.mjs）

| # | 优化 | 原因 | 效果 |
| --- | --- | --- | --- |
| 1 | **ETag + 304 协商缓存**：所有资源带 ETag，命中 `If-None-Match` 直接 304 | 旧版全量 `no-cache`，每次加载完整重传所有资源 | 二次加载几乎零传输 |
| 2 | **不可变资源 immutable**：字体(woff2/ttf)与 Vite 哈希文件名资源 → `Cache-Control: public, max-age=31536000, immutable` | 构建产物内容不变，无需每次请求 | 主 CSS(204KB)、几十个字体分片零请求 |
| 3 | **本地优先资源**：在线改写 HTML/CSS/JS，把 CDN 资源根 `https://excalidraw.nyc3.cdn.digitaloceanspaces.com/oss/` 替换为本地 `/` | 构建产物 `EXCALIDRAW_ASSET_PATH` 与 `Assistant` 字体的 `@font-face` 都指向 CDN；**CDN 单字体实测 1.47s** | 资源全部本地，`cdnResourceCount=0` |
| 4 | **去掉外部统计脚本**：移除 index.html 里的 simpleanalytics 动态脚本 | 无谓的联网依赖 | 少一次外部请求 |
| 5 | **`/assets/*` 版本号破缓存**：改写 index.html 时给 `/assets/xxx` 加 `?v=<mtime>` | 旧的 immutable 缓存会继续引用 CDN 地址，浏览器不回收 | 构建/改写更新后缓存自动失效 |
| 6 | **空 Service Worker**：`/sw.js`、`/service-worker.js` 恒返回空 SW（无 fetch 监听） | 构建自带的 workbox SW 会拦截同源导航、把 `/__blank` 回退成 app，导致注入被覆盖 | 干净页稳定可用 |
| 7 | **`/__blank` 空白画布页**：返回全屏、无滚动条、跟随主题的空白 HTML（无 app JS） | 注入需要一张同源、无 app、不会回写的页面；且不能出现 404/Not Found | 中转观感等同"画布清空" |
| 8 | **Windows 路径修复**：`path.normalize` 会把 `/` 变成 `\`，需转回 `/` | 否则 `startsWith("/__")` 等前缀判断永远失效 | 干净页/资源判断正确 |
| 9 | **Vite 哈希正则修复**：哈希为 base64url（含 `_`），`-[A-Za-z0-9_-]{6,}` | 旧的 `[0-9a-fA-F]` 匹配不到 `index-_VvfBPZD.css`，被当普通资源 | immutable 判定正确 |
| 10 | **SPA 回退收敛**：带扩展名的未知路径 → 404；仅无扩展名路径回退 index.html | 避免未知资源被回退成 HTML | 行为可预期 |

> 全部 HTML/CSS/JS 在线改写对 `*.html|*.css|*.js|*.mjs` 生效；ETag 基于改写后内容长度 + 源文件 mtime，稳定可缓存。

---

## 二、场景生成（scripts/gen_scene.mjs）

| # | 优化 | 原因 | 效果 |
| --- | --- | --- | --- |
| 1 | **CJK 宽度估算**：全角字符按 `1.0 × fontSize`、拉丁按 `0.62 × fontSize` 估宽 | 旧版统一按 0.62 估算，中文实际更宽，声明边界小于实际 → Excalidraw 裁掉首尾字符（"提示：请输入完整"显示成"示：请输入完"） | 中文标签不裁切，**消除一整轮返工重注入** |
| 2 | **单行压缩输出**：`JSON.stringify(out)`（去掉美化缩进） | 便于整段内联；也减小服务目录文件体积 | 30KB → 更小的单行 JSON |

---

## 三、注入流程（SKILL.md 第 3/4 步）

| # | 优化 | 原因 | 效果 |
| --- | --- | --- | --- |
| 1 | **单次 reload 注入 + `setItem` 静音**：reload 前把 `Storage.prototype.setItem` 对 `excalidraw`/`excalidraw-state` 两键静音 | Excalidraw 离开页面时会用内存场景回写 localStorage，覆盖注入数据；旧方案需要"空白中转页 + 两次导航" | **无中转页、无第二次导航**，仅 1 次 reload 出图 |
| 2 | **缩放/居中内置于 appState**：把 `zoom/scrollX/scrollY` 按视口算好写进 `excalidraw-state` | 旧流程要发 `Shift+1`（2 次键盘 CDP 调用） | 省去 Shift+1，且每次自动适配视口 |
| 3 | **场景走服务目录 + fetch**：`gen_scene.mjs ... > app/__scene.json`，页面 `fetch('/__scene.json')` | 免去把 20KB+ JSON 内联进注入脚本（省一次大段读取/回填） | 更少 token、更快 |
| 4 | **追加 / 渐进注入**：分批 `prev.concat(slice)`（按 id 去重）+ reload，可把图分批"长"出来 | 支持"逐个加入画布" | 每批一次 reload（~0.6s） |
| 5 | **中间不截图、末次验收**：分批时每批只"注入 + 等一次 reload"，全部完成后验收一次 | 中间截图 + 图像分析是纯额外往返 | 4 批约 9 次调用（比每批截图 ~12 次更快） |
| 6 | **顶部预留避开工具栏**：注入时 `padTop=90` 顶部对齐（不垂直居中），并按 `vh-padTop-padBottom` 计算 zoom | 画布顶部有 ~60px 悬浮工具栏，垂直居中的高图会让顶部节点被遮住 | 图完整可见 |

---

## 四、实测数据

```
CDN 单字体:            1.472s   → 本地加载（即时）
assetPath:            [CDN,"/"] → ["/","/"]
cdnResourceCount:     4        → 0
loadEnd:              ~696ms   → ~426~613ms
单次注入:             'injected 42 elements, zoom=0.75 (single reload)'
reload 后:            storedCount 42 / hasATM true / marker false（回写被成功静音）
服务端:               root 200+etag → 304；asset immutable → 304；/__blank 200 空白画布
```

---

## 五、关键坑与修复（避免重蹈覆辙）

1. **Service Worker 拦截导航**：workbox SW 把任意同源导航回退到 index.html，使"干净页"实际启动 app → 注入被覆盖。
   修复：服务端恒返回空 `sw.js`（对重新同步构建产物也有效）。
2. **beforeunload 回写覆盖**：在已加载 app 的页面 `set localStorage + reload`，app 离开时会用内存旧场景覆盖。
   修复：reload 前静音 `Storage.prototype.setItem`（第 3 步）。
3. **CJK 文字裁切**：宽度按拉丁估算导致中文越界被裁。修复：`measureText` 按全角宽度。
4. **404 观感**：中转页不要出现 `404 / Not Found`。修复：`/__blank` 返回空白画布页。
5. **旧版 serve.mjs 遗留的 workbox SW**：浏览器可能仍注册着旧 SW，注销一次后刷新即可：
   `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`

---

## 六、如需进一步提速

- **不需要"逐步出现"过程** → 直接用第 3 步整图注入（1 次 reload，最快）。
- **想连续动画级逐元素出现** → 需要改 Excalidraw 生产构建暴露实时 API（当前架构下每次追加都需 reload）。

---

## 七、2026-11-21 增强：从“快”到“稳 + 通用”

| # | 增强 | 原因 | 效果 |
| --- | --- | --- | --- |
| 1 | **`scripts/flow_shot.mjs` 零依赖 CDP 执行器**（原 `inject_and_shot.mjs`） | 很多 agent 环境只有 shell，没有浏览器 agent；手写 CDP 验证可行但不应每次重写 | 自动确保服务 → headless Chrome/Edge → 生成场景 → 渐进显示 → 截图验证；Node 22 原生 `WebSocket`/`fetch`，零 npm 依赖 |
| 2 | **`gen_scene.mjs --out xxx.excalidraw`** | localStorage 只属于当前浏览器，跨浏览器/清缓存会丢 | 一条命令导出可打开、可编辑、可分享的 `.excalidraw` 文件 |
| 3 | **默认绑定 text / arrow 到节点** | 原先 label 和 arrow 都是独立元素，手动拖动节点时不会跟随 | shape 设置 `boundElements`，text 设置 `containerId`，arrow 设置 `startBinding/endBinding`；`--no-bind` 可关闭 |
| 4 | **绘制层级 shape → arrow → label** | 原先每个节点 `shape+label` 连续输出，箭头可能压住节点文字 | 所有箭头先于所有标签绘制，文字更清晰 |
| 5 | **输入校验 + 清晰告警** | 非法 type 静默回退、重复 id / 悬空边难排查 | 输出到 stderr：重复 id、缺失节点、非法尺寸、自环警告；错误直接退出 1 |
| 6 | **`/__health` 健康探针** | 只看 HTTP 200 无法区分新旧 `serve.mjs`；旧进程会带回 workbox SW | `curl http://localhost:5177/__health` 返回 `skillVersion`、根目录、空 SW/空白页/改写状态 |
| 7 | **一键脚本自动起服务** | 只有 shell 时还要先手动起 `serve.mjs` | `flow_shot.mjs` 检测失败会后台启动内置 `app/`，再继续生成截图 |
| 8 | **`gen_scene.mjs --batches`** | 大图一次性注入虽然快，但用户常希望“逐步长出来”；手写批次切片容易打乱依赖 | 规格增加 `batches`（节点 id + 边索引分组），一次生成 `full + batches`，元素 ID 全局稳定；每批按 `shape → arrow → label` 排序 |
| 9 | **`flow_shot.mjs` 渐进播放**（原 `inject_and_shot.mjs --batches`） | 渐进绘制原来靠 reload 逐批注入，会闪屏；现在通过 Bridge `addElements` 无刷新逐批长出来 | 写 `data/__batches.json` → 页面 watch 检测变化 → clear → 逐批 addElements；采样元素数确认渐进序列，最后统一截图 |
| 10 | **批次模式视角锁定** | 若每批按自身边界缩放，画面会随批次增加不断跳动 | zoom/scroll 始终用 `full` 完整场景计算，从第一批到截图视角一致 |

---

## 八、2026-11-22 排障：整页崩溃（React 树卸载）的根因与三层防御

现象：程序化注入场景后，画布间歇性消失（canvas 数 0、body 只剩 217 字节的 Suspense fallback）、
截图全白；控制台 `TypeError: Cannot read properties of null (reading 'x')`（calculateBounds）
+ `Error: Missing Provider from createIsolation`，React 整树卸载且不再恢复。

排查（CDP 时间线 + 最小复现矩阵）定位到 **两个独立根因**：

### 根因 1：gen_scene 显式坐标节点不补宽高 → NaN → JSON null
- 显式给 `x/y` 的节点跳过 autoLayout，而宽高默认值只在 autoLayout 分支里补；
  `buildScene` 的 `ref = {...n}` 又用的是原始节点（无 width）
- `borderPoint` 读 `undefined` → 坐标变 NaN → **`JSON.stringify` 把 NaN 序列化成 `null`**
- 场景文件里出现 `x: null / points: [[0,0],[null,null]]` 的箭头
- 应用 restore 后渲染时 `M(null)`（`typeof null == "object"` 陷阱）读 `null.x` 抛错
- 修复：`makeNode` 无条件回写默认宽高到节点（`n.width = shape.width`）

### 根因 2：app 的 initializeScene 与程序化更新竞态（应用自身 bug）
- boot 时异步恢复 localStorage/URL 场景的 `initializeScene` 在挂载后 1.5~2.5s 才落地，
  会把此前注入的内容清空/部分改写（字段置 null、元素丢失）
- 若绑定箭头引用了被清掉的形状 → 绑定重算出 null 坐标 → 同样触发 calculateBounds 崩溃
- 历史上"能跑通"是时序运气：wipe 恰好落在播放前的延迟窗口内

### 三层防御（全部在 skill 层，不改 app 构建）
| 层 | 机制 | 作用 |
| --- | --- | --- |
| 数据层 | gen_scene 宽高回写 | 消灭 NaN/null 数据源头 |
| bridge 层 | 全量场景守卫（`lastFull` + 6s 周期检查：元素数缩水**或字段损坏** → 整图重放）+ `waitDomSettled`（boot 未稳不批量更新）+ 播放完成自愈 | wipe 竞态自愈，数据始终完整 |
| 渲染层 | serve.mjs 在线 patch 入口 JS：`M(e,t)` 判改 `typeof e=="object"&&e`（null 降级为 NaN 边界） | 即使字段再损坏，也只是坏元素不渲染，不崩整树（`__health.boundsGuard`） |

### 配套加固
- `bridge-client.js` watch 修复 `JSON.parse(text)` 残留引用（重构笔误导致首轮轮询静默失败、永远不播放）
- watch 用 `x-mtime-ms` 响应头区分"打开前旧图基线"与"打开后才推送的新图"，
  消除"先 push、浏览器后加载完成导致新图被误记为基线"的竞态
- `serve.mjs` 对 bridge-client.js 每请求读盘（改 bridge 不用重启服务）；SKILL_VERSION 递增破缓存
- `shot.mjs`：UI 稳定等待（canvas + toolbar）→ 元素数到位 → 内容完整性检查 → canvas 存活检查 → 截图
- `flow_shot.mjs`：截图前 canvas 存活检查；`__scene.json` 改写为完整场景（供 loadScene/shot 使用）

验证：崩溃矩阵（setScene17 / add9 / add17 × 3 轮）修复前 100% 崩溃 → 修复后 0 崩溃；
flow_shot 渐进序列 `2 → 8 → 17 ✓`，nav=1；shot.mjs `17 元素全部渲染 ✓`；截图目检 5 节点 5 箭头 2 边标签完整。
