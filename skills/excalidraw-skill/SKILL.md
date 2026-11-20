---
name: excalidraw-skill
description: 在 Excalidraw 白板上画图（流程图/架构图/示意图/思维导图）。工作流：用 scripts/gen_scene.mjs 把"节点+连线"规格生成合法的 Excalidraw scene JSON，浏览器打开本地实例（http://localhost:5177，serve 生产构建，离线可用），通过 localStorage 注入场景并刷新渲染，最后截图验证。仅有 shell 时可用 scripts/inject_and_shot.mjs 零依赖完成注入+截图；gen_scene.mjs --out 可导出 .excalidraw。当用户要求画流程图、画架构图、在 excalidraw 中画图、白板演示，或需要可编辑的矢量图形时使用。
---

# 在 Excalidraw 中画图

目标：让 agent 在**本地 Excalidraw 实例**上画出用户描述的图形。有浏览器 agent 时走手动注入；只有 shell 时优先用 `scripts/inject_and_shot.mjs` 一键完成。

**核心原则：永远不要模拟鼠标点击工具栏逐笔绘制**（极其脆弱）。正确路径是
**生成 scene JSON → 注入页面 → 刷新 → 截图验证**，三步内完成。

## 工作纪律（避免"推理过长被截断"）

**把重计算交给脚本与截图，不要在推理里手算。** 本技能最容易踩的坑，是在思考阶段
逐节点算坐标、逐条连线做"是否穿框"的碰撞检测——这类超长推理会挤占单轮输出预算，
严重时**连工具调用都发不出去**（表现为：思考到一半戛然而止、画布没有任何变化）。

- **坐标按固定模板快速给出**（见下），不要逐条推演；箭头端点由脚本自动吸附边界。
- **是否美观以渲染后的截图为准**：写完规格就生成、注入、截图看一眼，不对再改；
  不要试图在脑内一次性算到完美。
- **短步骤闭环**：写规格 → 生成 → 注入 → 截图 → 按需微调。每步都短、可回滚。
- **一旦发现自己在反复做几何演算，立即停下并发工具调用**，用真实渲染代替脑内推演。

### 快速布局模板（照填即可，无需计算）

- 纵向间距：下一节点的 `y = 当前 y + 当前高度 + 48`
- 主列（竖排）：矩形 `x=310, w=180, h=64`；菱形 `x=320, w=160, h=96`（中心都在 x=400）
- 起止椭圆：`x=340, w=120, h=48`
- 分支节点（放右侧）：`x=640, w=190, h=64`
- 箭头端点 **自动吸附边界**，无需计算；连线是否穿框、文字是否溢出，看截图再调

## 前置条件

- 本地已 serve 生产构建：`http://localhost:5177`（见下方"本地化运行"）
- 两种执行方式二选一：
  1. **一键脚本（推荐）**：`scripts/inject_and_shot.mjs`，只需 Node + Chrome/Edge，无需浏览器 agent
  2. **浏览器 agent 手动注入**：需要具备 ① 打开 URL ② 页面上下文执行 JS ③ 截图（可配合 autoglm-browser-agent 等 skill）

## 本地化运行（推荐，离线可用）

**skill 自带完整生产构建产物**：`<skill目录>/app/`（约 23MB，来自
excalidraw 仓库 `excalidraw-app/build/`，已剔除 source map），
因此本技能完全自包含，不依赖仓库路径，拷走即用。

**每次画图前先做幂等检测**（服务可能已在运行）：

```bash
curl -s http://localhost:5177/__health
```

- 返回含 `skillVersion` 的 JSON → 新版服务已就绪，跳过启动
- 只返回 404 / 连接失败 → 说明没启动或仍是旧版 `serve.mjs`，需要按下面方式启动/替换
- 连接失败或版本过旧 → 后台启动（零参数，默认 serve 内置 `app/`；Windows）。
  `<skill目录>` 指本 SKILL.md 所在目录（agent 运行时从自身 skill 配置取得）：

```bash
powershell -Command "Start-Process -FilePath node -ArgumentList '"<skill目录>/scripts/serve.mjs"' -WindowStyle Hidden"
sleep 2 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5177   # 期望 200
```

之后浏览器一律打开 **`http://localhost:5177`**（不用 excalidraw.com）。

同步/更新内置产物（源码更新后才需要，平时跳过）：

```bash
# <excalidraw源码仓库> = 本地 excalidraw 源码仓库位置（仅同步产物时需要，平时跳过）
cd <excalidraw源码仓库>/excalidraw-app && yarn build:app:docker
APP=<skill目录>/app
rm -rf $APP && cp -r build/. $APP/ && find $APP -name '*.map' -delete
# 产物刷新后浏览器刷新即生效（index.html 恒为 no-cache），无需重启服务
```

**Service Worker 说明**：构建产物自带 workbox SW，会拦截同源导航并回退 `index.html`，
使"干净页"`/__blank` 实际启动 app，进而让 app 的 beforeunload 保存覆盖注入的场景
（注入必失败）。serve.mjs 已对 `/sw.js` 恒返回空 SW（无 fetch 监听、不拦截请求），
保证 `/__blank` 恒为空白画布页（观感等同清空画布），重新同步产物后依然有效。
若曾用**旧版 serve.mjs** 运行过，浏览器可能仍注册着 workbox SW，执行一次以下代码并刷新即可：

```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))
```

## 工作流

### 第 1 步：把用户的图翻译成规格文件

写一个 JSON 文件（如 `scene.json`），用 `nodes`（节点）+ `edges`（连线）描述：

```json
{
  "background": "#ffffff",
  "nodes": [
    { "id": "a", "type": "rectangle", "label": "用户登录" },
    { "id": "b", "type": "diamond", "label": "验证通过?", "backgroundColor": "#a5d8ff" },
    { "id": "c", "type": "rectangle", "label": "进入首页", "backgroundColor": "#b2f2bb" }
  ],
  "edges": [
    { "from": "a", "to": "b" },
    { "from": "b", "to": "c", "label": "是" },
    { "from": "b", "to": "a", "label": "否", "strokeColor": "#e03131" }
  ]
}
```

规则：
- `type`: `rectangle | ellipse | diamond | text`，缺省 `rectangle`
- 不写 `x/y` 时脚本自动做纵向分层布局；复杂图（多列、分支汇聚）建议手动给坐标
- 节点默认 180×64，diamond 96 高；可用 `width/height/backgroundColor/strokeColor/label/fontSize` 微调
- `edges` 的箭头端点自动吸附到节点边界中点方向，可带 `label`、`labelOffset: [dx,dy]`、`strokeColor`
- 生成的 label text 与 shape 双向绑定（`containerId` / `boundElements`），箭头也绑定首尾节点；拖动节点时标签和连线跟随。用 `--no-bind` 可关闭
- 常用色：蓝 `#a5d8ff`、绿 `#b2f2bb`、红 `#ffc9c9`、黄 `#ffec99`、描边红 `#e03131`

### 第 2 步：生成 scene JSON

```bash
node <skill目录>/scripts/gen_scene.mjs scene.json > scene.out.json
# 自检（可选）: node <skill目录>/scripts/gen_scene.mjs --demo > demo.json
# 直接导出可编辑文件（推荐持久化）:
node <skill目录>/scripts/gen_scene.mjs scene.json --out scene.excalidraw --pretty
# 生成渐进注入用的批次场景（含 full + batches）:
node <skill目录>/scripts/gen_scene.mjs scene.json --batches --out scene.batches.json
```

输出的 `{ "elements": [...], "appState": {...} }` 已补全所有必填字段
（id/seed/versionNonce/boundElements 等），为**单行压缩 JSON**，可直接整段内联进注入脚本。
文字宽度已按 CJK 全角 ≈ 1.0×字号 估算，中文标签不会被渲染裁切。

### 一键执行（只有 shell 时推荐）

```bash
node <skill目录>/scripts/inject_and_shot.mjs \
  --scene scene.json \
  --out shot.png \
  --export scene.excalidraw
```

**大图推荐：渐进注入（按批次追加）**

```bash
# 规格里写 batches，生成批次场景（同时保留 full 完整场景）
node <skill目录>/scripts/gen_scene.mjs scene.json --batches --out scene.batches.json
# 一键逐批 append + reload，最后统一截图
node <skill目录>/scripts/inject_and_shot.mjs --batches scene.batches.json \
  --out shot.png --export scene.excalidraw
```

脚本自动完成：确保本地服务（必要时后台启动）→ 启动 Chrome/Edge headless → CDP 打开 `/__blank` → 注入 localStorage → 导航到 `/` → 等待 canvas → 截图。零外部依赖（Node 22 原生 `WebSocket`/`fetch`），不需要浏览器 agent。

常用参数：

- `--scene <规格.json>` / `--demo` / `--batches <批次.json>`：输入来源；也可 `--scene-json <已生成场景.json>`
- `--out <截图.png>`：截图路径（默认 `<skill目录>/tmp/last-scene.png`）
- `--export <文件.excalidraw>`：同时导出可编辑文件
- `--url` / `--viewport` / `--browser` / `--cdp-port`：自定义实例、视口、浏览器、调试端口
- `--batch-delay <ms>`：批间等待（默认 600ms）；`--no-bind`：关闭节点绑定；`--keep-open`：保留 headless 浏览器便于调试

### 第 3 步：极速注入（单次 reload，无中转页）

> **原理**：Excalidraw 在页面离开时会用内存场景回写 localStorage，所以裸用
> `set localStorage + location.reload()` 会被旧场景覆盖。只需在 reload 前把
> `Storage.prototype.setItem` 对 `excalidraw` / `excalidraw-state` 两键“静音”，
> 让这次回写失效，注入数据即可存活——**无需任何中转页、无第二次导航**。

1. 把第 2 步生成的场景放到服务目录（一条命令即可，供页面 fetch）：
   `node <skill目录>/scripts/gen_scene.mjs scene.json > <skill目录>/app/__scene.json`
2. 在**当前已加载 app 的页面**执行一次 JS（取场景 → 静音回写 → 写入 → reload）：

```js
(async () => {
  const scene = await fetch('/__scene.json?v=' + Date.now()).then(r => r.json());
  const els = scene.elements;
  if (!Array.isArray(els) || !els.length) return 'EMPTY SCENE';
  const minX = Math.min(...els.map(e => e.x));
  const maxX = Math.max(...els.map(e => e.x + (e.width || 0)));
  const minY = Math.min(...els.map(e => e.y));
  const maxY = Math.max(...els.map(e => e.y + (e.height || 0)));
  const cx = (minX + maxX) / 2;
  const vw = innerWidth, vh = innerHeight;
  const padX = 40, padTop = 90, padBottom = 40; // padTop 避开顶部悬浮工具栏
  const zoom = Math.min((vw - padX * 2) / (maxX - minX), (vh - padTop - padBottom) / (maxY - minY), 1);
  const origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === 'excalidraw' || k === 'excalidraw-state') return; // 静音 app 回写
    return origSet.call(this, k, v);
  };
  origSet.call(localStorage, 'excalidraw', JSON.stringify(els));
  origSet.call(localStorage, 'excalidraw-state', JSON.stringify({
    viewBackgroundColor: '#ffffff',
    zoom: { value: zoom },
    scrollX: vw / (2 * zoom) - cx,
    scrollY: padTop / zoom - minY   // 顶部对齐，避免顶部节点被工具栏遮挡
  }));
  location.reload();
  return 'injected ' + els.length + ' elements, zoom=' + zoom.toFixed(2);
})()
```

3. 等 ~1.2s 直接截图。缩放/居中已写入 appState，**无需 Shift+1**。

**兜底（当前没有已加载的 app 页面时）**：先导航到空白画布页 `http://localhost:5177/__blank`
（无 app JS、不会回写、无 404 观感），用上面同一段 JS 写入，再 `location.href = '/'`。

### 第 4 步：验证与迭代

- 一次全画布截图检查：元素齐全、文字无裁切、箭头指向正确；文字密集时用 clip 区域放大特写复核
- 修改时**重新生成并整图覆盖注入**（重走第 3 步，全程 <10s）
- 在现有图上继续画 / 分批"长"出来：见下方"追加 / 渐进注入"

### 追加 / 渐进注入（把图分批"长"出来）

同一份场景切成若干批，逐批 append + reload，画布上就会逐步出现内容。
每批都读当前 `excalidraw` 并合并新元素（用第 3 步的 setItem 静音），再 reload；
**每批一次 reload（约 0.5s）**，所以是"逐步出现"而非连续动画。

**一键批量版（推荐）**：

```bash
node <skill目录>/scripts/gen_scene.mjs scene.json --batches --out scene.batches.json
node <skill目录>/scripts/inject_and_shot.mjs --batches scene.batches.json --out shot.png
```

`batches` 用 `nodes: [节点id...]` + `edges: [边索引...]` 分组；生成器自动保证每批内部
按 `shape → arrow → label` 排序，且所有批次共享同一套元素 ID。zoom/scroll 始终按
`full` 完整场景计算，视角不会随批次跳动。格式见 `references/scene-schema.md`。

```js
// full = 场景全部 elements；FROM/TO 为本批范围
const slice = full.slice(FROM, TO);
const prev = JSON.parse(localStorage.getItem('excalidraw') || '[]');
const ids = new Set(prev.map(e => e.id));
const next = prev.concat(slice.filter(e => !ids.has(e.id))); // 按 id 去重
// …静音 setItem → 写入 next → location.reload()
```

- 首批 `next = slice` 直接覆盖（从空画布开始长）；追加到**已有**画布则先读 `prev` 再 concat
- 建议按流程分批（节点在前、连线在后），观感最自然
- **中间不必截图/验收**：每批只做"注入 + 等一次 reload（~0.6s）"，**全部完成后最后验收一次**即可
  （4 批约 9 次调用，比每批都截图 ~12 次更快；批间无需任何校验）
- 需要**整图一次性**出现（默认）时，直接用第 3 步即可（更快，1 次 reload 出图）

## 变体

- **在线兜底**：本地服务起不来时才用 `https://excalidraw.com`，注入方式完全相同
- **分享链接**（可选）：注入后用页面 UI 的分享按钮生成 `#json=` 链接发给用户
- **浏览器无法执行 JS 时（兜底）**：退化到键盘流——选中工具快捷键
  `R`矩形 `O`椭圆 `D`菱形 `A`箭头 `T`文字，画布拖拽绘制，`Esc`结束；
  仅适合极简草图

## 性能要点（为什么现在是极致速度）

- **单次 reload 注入 + setItem 静音**：无中转页、无第二次导航，写完直接 reload 出图（第 3 步）
- **本地优先资源**（serve.mjs 在线改写 HTML/CSS/JS）：CDN 资源根 → 本地 `/`，字体等全部本地加载；
  去掉外部统计脚本；`/assets/*` 自动加版本号破旧缓存
  （CDN 单字体实测 1.47s，本地化后 `loadEnd` 约 0.45~0.6s）
- **ETag/304 + 字体 immutable 缓存**：二次加载几乎零传输
- **场景走服务目录 + fetch**：免去把 20KB+ JSON 内联进脚本的大段读取/回填
- **缩放/居中内置于 appState**：省去 Shift+1 键盘事件
- **CJK 文字宽度已修正**（gen_scene.mjs measureText）：不会因文字裁切而返工重注入

> 全部优化的原因、实现与实测数据见 `references/optimizations.md`。

## 排错

| 现象 | 原因/修复 |
| --- | --- |
| 注入后画布为空 | elements 不是数组，或整体不是合法 JSON；先 `JSON.parse` 校验 |
| 服务返回 200 但注入总被旧图覆盖 | 可能是旧版 `serve.mjs` 仍在运行；查 `curl -s http://localhost:5177/__health`，无 `skillVersion` 就重启服务 |
| 单个元素不显示 | 检查 `isDeleted:false`、`width/height>0`、坐标是否远离可视区（Shift+1 修复缩放） |
| 文字重叠/溢出 | 手动给该节点更大 `width/height` 或调 `fontSize` |
| 注入后被旧图覆盖 | 没做 setItem 静音就 reload（app 离开时回写覆盖）：按第 3 步先静音 `excalidraw`/`excalidraw-state` 再写入 |
| 刷新后场景丢失 | 该标签页 URL 带 `#json=` 场景（URL 场景优先级更高），去掉 fragment 后重新注入 |
| 想清空重画 | `localStorage.removeItem("excalidraw"); location.reload();` |

注意：localStorage 场景仅存于当前浏览器，清缓存会丢；需要持久化时引导用户用分享链接或导出 `.excalidraw` 文件。

## 参考

- 目录总览与快速命令：`README.md`
- 场景生成/导出脚本：`scripts/gen_scene.mjs`（含 `--out` / `--batches` / `--no-bind`）
- 一键注入+截图脚本：`scripts/inject_and_shot.mjs`（零依赖 CDP 执行器）
- 元素字段完整说明：`references/scene-schema.md`
- 性能优化记录（改了什么/为什么/实测）：`references/optimizations.md`
- 权威类型定义（本地源码）：`packages/element/src/types.ts`
- 默认样式常量：`packages/common/src/constants.ts`（DEFAULT_ELEMENT_PROPS / FONT_FAMILY）
- localStorage 键名：`excalidraw-app/app_constants.ts`（STORAGE_KEYS）
