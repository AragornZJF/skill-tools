---
name: excalidraw-skill
description: 在 Excalidraw 白板上画图（流程图/架构图/示意图/思维导图）。标准 4 步闭环（默认可视化浏览器优先）：① scripts/open.mjs 启动服务并打开默认浏览器 ② scripts/gen_scene.mjs 把"节点+连线"规格生成合法场景并 --push 推送 ③ serve.mjs 在线注入的 window.ExcalidrawBridge 驱动画布——白板从空白逐批长出，也可 setScene/addElements/loadScene 无刷新改画布 ④ scripts/shot.mjs 截图验证。无 GUI 环境用 flow_shot.mjs 一键替代。当用户要求画流程图、画架构图、在 excalidraw 中画图、白板演示，或需要可编辑的矢量图形时使用。
---

# 在 Excalidraw 中画图

让 agent 在**本地 Excalidraw 实例**（`http://localhost:5177`，serve 生产构建，离线可用）上画出用户描述的图形。

**两条核心原则：**

1. **永远不要模拟鼠标点击工具栏逐笔绘制**（极其脆弱）。
2. **优先使用默认可视化浏览器**：浏览器常驻，用户能亲眼看到白板从空白逐批长出；headless 只用于截图验证。

## 标准闭环（4 步，默认浏览器常驻）

```text
① open.mjs 启动服务 + 打开默认浏览器
② gen_scene.mjs 把"节点+连线"规格生成合法场景并推送
③ 白板从空白逐批长出（ExcalidrawBridge 驱动，全程无刷新）
④ shot.mjs 截图验证 → 不满意回 ② 改规格重跑（全程 <10s）
```

### ① 打开白板（浏览器优先级：PalWorks 内部浏览器 → 内部托管浏览器 → 系统默认）

- **PalWorks 环境**（存在 `~/.palworks`）：**优先使用 PalWorks 内部浏览器（YoBrowser）** —— 由 agent 调用宿主工具：
  - `load_url`（旧名 `yo_browser_window_open`）打开 `http://localhost:5177/`
  - 截图验收：`cdp_send` + `Page.captureScreenshot`；状态查询：`get_browser_status`
  - 无这些工具时：`node scripts/open.mjs --external` 启动外部托管浏览器
- **其他环境 / 外部托管**：`node scripts/open.mjs` 启动服务 + 打开**内部托管浏览器**（系统 Chrome/Edge + 专用 profile + CDP 5178，shot.mjs 可直接截取实时画布）；`--default-browser` 回退系统默认浏览器

```bash
node <skill目录>/scripts/open.mjs
```

- 服务没在跑会自动拉起；然后调用系统默认浏览器打开 `http://localhost:5177/`
- 页面常驻：**打开/刷新自动恢复服务里的当前图**（立即整图，不重播动画，图不会消失）；之后 `--push` 新图 → 从空白渐进播放一次
- 想看动画重播：`?replay=1` 或 `node scripts/replay_batches.mjs`
- 节奏 `?delay=1500`（默认 700ms/批）、手动画布 `?nowatch=1`

### ② 生成合法场景并推送

把用户的图翻译成规格 JSON（`nodes` + `edges`，复杂图加 `batches` 分组实现渐进），然后：

```bash
node <skill目录>/scripts/gen_scene.mjs scene.json --batches --push
```

- 脚本校验规格（id 重复/悬空连线等）→ 生成**元素字段完整的合法场景**（text/arrow 自动绑定节点，箭头自动吸附边界）
- `--push` 写入服务真实 dataDir（从 `/__health` 获取；服务没跑会自动拉起），同时更新 `__batches.json`（渐进播放）与 `__scene.json`（整图）
- 不写 `x/y` 时自动纵向分层；导出 `.excalidraw` 用 `--out xxx.excalidraw`

### ③ 白板从空白逐批长出（无刷新）

浏览器页面 ≤1.5s 内检测到新批次，由 `serve.mjs` **在线注入**的 `window.ExcalidrawBridge` 驱动：

- `clear → 逐批 addElements`，白板像"长"出来一样逐批出现，**全程无刷新**（页面只加载一次）
- serve.mjs 在线 patch 入口 JS 把 Excalidraw imperative API 挂到 `window.__EXCALIDRAW_API__`，浏览器里可直接无刷新改画布：

```js
ExcalidrawBridge.ready                                   // true = 可操作
ExcalidrawBridge.setScene(elements, appState?, opts?)    // 整图替换
ExcalidrawBridge.addElements(elements, opts?)            // 追加，按 id 去重，返回新增数
await ExcalidrawBridge.loadScene('/__scene.json?v=' + Date.now())  // fetch → 替换 → 缩放
ExcalidrawBridge.removeElements(ids) / clear()
ExcalidrawBridge.zoomToFit(padding?, alignTop?)          // 默认顶部对齐避开工具栏
ExcalidrawBridge.setLabel(id, text) / setAutoRefit(false)
```

`opts.captureUpdate` 可传 `'never'` 避免进入 undo 栈；`opts.zoomToFit:false` 可关闭 `loadScene` 自动缩放。

### ④ 截图验证

```bash
node <skill目录>/scripts/shot.mjs --out shot.png
```

- **优先附加内部浏览器实时画布**（live 模式，所见即所得；画布崩溃自动刷新自愈）；无实时窗口时回退 headless 加载当前场景
- 验收 `count == 期望元素数 && 字段无损坏 && 画布存活`（日志直接给结论）；PalWorks 环境下也可直接用 `cdp_send` + `Page.captureScreenshot` 截内部浏览器
- **是否美观以截图为准**：元素齐全、文字无裁切、箭头指向正确；文字密集时人工复核
- 不满意 → 改规格重跑 ②③（每步都短、可回滚）

### 工作纪律（避免推理过长被截断）

**把重计算交给脚本与截图，不要在推理里手算。** 最容易踩的坑是逐节点算坐标、逐条连线做碰撞检测——这类超长推理会挤占单轮输出预算，严重时连工具调用都发不出去。

- **坐标按固定模板快速给出**（见下），不要逐条推演；箭头端点由脚本自动吸附边界。
- **短步骤闭环**：写规格 → `gen_scene --push` → 看浏览器/`shot.mjs` 截图 → 按需微调。
- **一旦发现自己在反复做几何演算，立即停下并发工具调用**，用真实渲染代替脑内推演。

### 快速布局模板（照填即可，无需计算）

- 纵向间距：下一节点 `y = 当前 y + 当前高度 + 48`
- 主列（竖排）：矩形 `x=310, w=180, h=64`；菱形 `x=320, w=160, h=96`（中心都在 x=400）
- 起止椭圆：`x=340, w=120, h=48`
- 分支节点（放右侧）：`x=640, w=190, h=64`
- 箭头端点自动吸附边界；连线是否穿框、文字是否溢出，看截图再调
- 菱形文字要短：宽 160 的菱形中部仅约 80px 可容纳文字；长文案用 `w=200` 或缩短

## 规格格式

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
  ],
  "batches": [
    { "name": "登录", "nodes": ["a"], "edges": [] },
    { "name": "验证", "nodes": ["b"], "edges": [0, 2] },
    { "name": "完成", "nodes": ["c"], "edges": [1] }
  ]
}
```

规则：
- `type`: `rectangle | ellipse | diamond | text`，缺省 `rectangle`
- 不写 `x/y` 时脚本自动纵向分层；复杂图（多列/分支）建议手动给坐标
- 节点默认 180×64，diamond 96 高；可微调 `width/height/backgroundColor/strokeColor/label/fontSize`
- `edges` 箭头自动吸附边界，可带 `label`、`labelOffset: [dx,dy]`、`strokeColor`
- label text 与 shape 双向绑定，箭头绑定首尾节点；拖动节点时标签和连线跟随
- `batches`：`nodes` 用节点 id 数组，`edges` 用 0-based 边索引；生成器保证每批内 `shape → arrow → label` 顺序、元素 ID 稳定
- 常用色：蓝 `#a5d8ff`、绿 `#b2f2bb`、红 `#ffc9c9`、黄 `#ffec99`、描边红 `#e03131`

## 无 GUI 环境的一键替代：flow_shot.mjs

没有可视化浏览器（CI/远程）时，`flow_shot.mjs` 一条命令完成 ②③④：

```bash
node <skill目录>/scripts/flow_shot.mjs \
  --scene scene.json \
  --out shot.png \
  --export scene.excalidraw
```

脚本自动完成：生成批次场景 → 自己拉起 headless 白板页并**渐进播放**（采样元素数验证逐批出现）→ 截图验收（`nav=1`）。

其他输入形式：

```bash
node scripts/flow_shot.mjs --batches data/__batches.json --out shot.png   # 已有批次文件
node scripts/flow_shot.mjs --scene-json data/__scene.json --out shot.png  # 无 batches 时整图（单批）
```

常用参数：`--out`（截图路径）、`--export`（.excalidraw）、`--url`、`--viewport`、`--browser`、`--cdp-port`。

## 数据目录与服务

- 运行时场景数据放 `data/`，**不放 `app/`**（`app/` 是纯构建产物）
- `serve.mjs` 用虚拟路由 `/__scene.json`、`/__batches.json` 从 `data/` 提供（带 `x-mtime-ms` 供新旧图判定），URL 不变
- serve.mjs 在线 patch 入口 JS 时会附带 **boundsGuard**（防御性 null 坐标降级，防坏数据崩整树），`__health.boundsGuard` 可查
- 脚本（`gen_scene --push` / `flow_shot` / `shot`）都从 `__health.dataDir` 获取服务真实 data 目录，写入正确位置

```bash
curl -s http://localhost:5177/__health   # 看 skillVersion / bridge / dataDir
node scripts/serve.mjs                   # 手动启动（一般脚本会自动拉起）
```

## 排错

| 现象 | 原因/修复 |
| --- | --- |
| 画布为空 | `data/__batches.json` 无内容或 JSON 非法；检查 `curl /__batches.json` |
| 推送后没播放 | 该内容在页面打开前 ≥2s 就已写入，被当作旧图基线；`node scripts/replay_batches.mjs` 强制重播 |
| `ExcalidrawBridge` 未定义 / ready 一直 false | 旧 serve.mjs；查 `__health.bridge`，重启服务 |
| 画布消失/整页空白（截图全白） | 旧 serve.mjs 无 boundsGuard 或场景含 null 字段；确认 `__health.boundsGuard:true`、重新 `--push` 生成干净数据 |
| 部分箭头/标签不渲染 | 老版本数据损坏（NaN→null）；已修复（gen_scene 宽高回写），重新 `--push` 即可 |
| 元素不显示 | 元素字段必须完整（用 `gen_scene.mjs` 生成，勿手写残缺元素）；等一帧再截图 |
| 文字裁切/溢出 | 手动给节点更大 `width/height`、`fontSize`，或缩短菱形文字 |
| `shot`/`flow_shot` 找不到浏览器 | 用 `--browser` 指定 Chrome/Edge 路径，或设 `CHROME_PATH` |
| `flow_shot` 报"元素数不符" | 脚本写错目录；确认从 `__health.dataDir` 取路径（已内置） |
| 服务返回旧内容 | 浏览器缓存；index.html 带版本号会破缓存，硬刷新 `Ctrl+Shift+R` |
| 图已持久化 | 场景存在 `data/`，刷新/重开浏览器自动恢复；localStorage 仅缓存，清了也不丢图 |
| 想清空重画 | 重新 `gen_scene --push`，或 `ExcalidrawBridge.clear()` |

注意：localStorage 场景仅存当前浏览器；持久化请用 `--export` 导出 `.excalidraw` 文件。

## 参考

- 目录总览与快速命令：`README.md`
- 场景生成与推送：`scripts/gen_scene.mjs`（`--push` / `--out` / `--batches` / `--no-bind`）
- 截图验证：`scripts/shot.mjs`（`--out` / `--scene` / `--viewport`）
- 一键替代（无 GUI）：`scripts/flow_shot.mjs`（生成 → 渐进 → 截图验证）
- 元素字段完整说明：`references/scene-schema.md`
- 性能优化记录：`references/optimizations.md`
- 权威类型定义：`packages/element/src/types.ts`（本地源码）
