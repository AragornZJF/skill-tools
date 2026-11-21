---
name: excalidraw-skill
description: 在 Excalidraw 白板上画图（流程图/架构图/示意图/思维导图）。工作流：用 scripts/gen_scene.mjs 把"节点+连线"规格生成合法场景，flow_shot.mjs 一键完成"生成→渐进加载显示→截图验证"（白板从空白逐批长出，全程无刷新）；serve.mjs 在线注入 window.ExcalidrawBridge，浏览器里可直接 setScene/addElements/loadScene 无刷新改画布；gen_scene.mjs --out 可导出 .excalidraw。当用户要求画流程图、画架构图、在 excalidraw 中画图、白板演示，或需要可编辑的矢量图形时使用。
---

# 在 Excalidraw 中画图

让 agent 在**本地 Excalidraw 实例**（`http://localhost:5177`，serve 生产构建，离线可用）上画出用户描述的图形。

**核心原则：永远不要模拟鼠标点击工具栏逐笔绘制**（极其脆弱）。

**标准闭环**：写规格 JSON → `flow_shot.mjs`（生成场景 → 白板渐进显示 → 截图验证）→ 看截图微调。全程无刷新（脚本验证 `nav=1`）。

## 工作纪律（避免推理过长被截断）

**把重计算交给脚本与截图，不要在推理里手算。** 最容易踩的坑是逐节点算坐标、逐条连线做碰撞检测——这类超长推理会挤占单轮输出预算，严重时连工具调用都发不出去。

- **坐标按固定模板快速给出**（见下），不要逐条推演；箭头端点由脚本自动吸附边界。
- **是否美观以渲染后的截图为准**：写完规格就生成、截图看一眼，不对再改。
- **短步骤闭环**：写规格 → `flow_shot` → 看截图 → 按需微调。每步都短、可回滚。
- **一旦发现自己在反复做几何演算，立即停下并发工具调用**，用真实渲染代替脑内推演。

### 快速布局模板（照填即可，无需计算）

- 纵向间距：下一节点 `y = 当前 y + 当前高度 + 48`
- 主列（竖排）：矩形 `x=310, w=180, h=64`；菱形 `x=320, w=160, h=96`（中心都在 x=400）
- 起止椭圆：`x=340, w=120, h=48`
- 分支节点（放右侧）：`x=640, w=190, h=64`
- 箭头端点自动吸附边界；连线是否穿框、文字是否溢出，看截图再调
- 菱形文字要短：宽 160 的菱形中部仅约 80px 可容纳文字；长文案用 `w=200` 或缩短

## 前置条件

本地服务由脚本自动拉起（无需手动）。确认状态：

```bash
curl -s http://localhost:5177/__health
# 含 skillVersion / bridge:true / dataDir 即正常
```

两种执行方式：

1. **一键脚本（首选）**：`scripts/flow_shot.mjs`，只需 Node + Chrome/Edge。
2. **浏览器常驻 + Bridge API**：浏览器打开后可反复调用 `ExcalidrawBridge`，适合边聊边画。

## 工作流

### 第 1 步：把用户的图翻译成规格文件

写 JSON（如 `scene.json`），用 `nodes` + `edges` 描述，**复杂图加 `batches` 分组实现渐进**：

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

### 第 2 步：一键生成 + 渐进显示 + 截图验证

```bash
node <skill目录>/scripts/flow_shot.mjs \
  --scene scene.json \
  --out shot.png \
  --export scene.excalidraw
```

脚本自动完成三步：

1. **生成**：`gen_scene --batches` → 写到服务 `data/__batches.json`
2. **渐进显示**：打开白板，从空白画布逐批绘出（元素一批批"长"出来）
3. **截图验证**：采样元素数确认渐进序列，播放结束后截图，日志打印验收信息

输出示例：

```text
[1/3] JSON 已生成: 6 批 / 55 元素 → data/__batches.json
[2/3] 渐进验证: 0 → 8 → 17 → 24 → 33 → 45 → 55  ✓ 逐批出现
[3/3] 截图: shot.png
      验收: {"count":55,"nav":1}  （nav=1 = 全程无刷新）
```

其他输入形式：

```bash
node scripts/flow_shot.mjs --batches data/__batches.json --out shot.png   # 已有批次文件
node scripts/flow_shot.mjs --scene-json data/__scene.json --out shot.png  # 无 batches 时整图（单批）
```

常用参数：`--out`（截图路径）、`--export`（.excalidraw）、`--url`、`--viewport`、`--browser`、`--cdp-port`。

> 服务未启动会自动拉起。零外部依赖（Node 22 原生 `WebSocket`/`fetch`）。

### 第 3 步：看截图微调

- 一次全画布截图检查：元素齐全、文字无裁切、箭头指向正确
- 文字密集时用 clip 区域放大复核
- 修改规格后重跑 `flow_shot`，全程 <10s

## 浏览器常驻模式（先开页面，再生成图）

```bash
node <skill目录>/scripts/open.mjs   # 启动服务 + 打开浏览器
```

页面打开 `http://localhost:5177/` 后保持轮询：

- **默认不播打开时已有的旧图**（避免重复）；之后 `data/__batches.json` 内容变化就播一次新图
- 想再看一遍：`node scripts/replay_batches.mjs`
- 想打开即播放已有图：URL 加 `?replay=1`
- 节奏：`?delay=1500`（默认 700ms/批）
- 关闭自动播放（手动画布）：`?nowatch=1`
- 窗口 resize（含最大化）自动重新适配；关闭用 `?norefit=1`

实测（6 批）：`0 → 8 → 17 → 24 → 33 → 45 → 55`，`nav=1` 无刷新。

## Bridge API（浏览器 agent / 手动迭代）

`serve.mjs` 在线 patch 入口 JS，把 Excalidraw imperative API 挂到 `window.__EXCALIDRAW_API__`，并提供惰性封装 `window.ExcalidrawBridge`。调用这些方法**不 reload、不跳页**，画布即时更新。

```js
ExcalidrawBridge.ready                                   // true = 可操作
ExcalidrawBridge.onReady(b => { /* b 可用时回调 */ })
ExcalidrawBridge.api                                     // 原始 API（updateScene/getFiles/...）
ExcalidrawBridge.getElements() / getAppState()
ExcalidrawBridge.setScene(elements, appState?, opts?)    // 整图替换
ExcalidrawBridge.addElements(elements, opts?)            // 追加，按 id 去重，返回新增数
ExcalidrawBridge.removeElements(ids) / clear()
ExcalidrawBridge.zoomToFit(padding?, alignTop?)          // 默认顶部对齐避开工具栏
ExcalidrawBridge.setLabel(id, text)
await ExcalidrawBridge.loadScene(url, opts?)             // fetch 场景 → setScene → 缩放
ExcalidrawBridge.setAutoRefit(false)                     // 关闭 resize 自动适配
```

`opts.captureUpdate` 可传 `'never'` 避免进入 undo 栈；`opts.zoomToFit:false` 可关闭 `loadScene` 自动缩放。

场景文件由 `gen_scene` 生成到 `data/`：

```bash
node scripts/gen_scene.mjs scene.json > data/__scene.json
```

## 数据目录与服务

- 运行时场景数据放 `data/`，**不放 `app/`**（`app/` 是纯构建产物）
- `serve.mjs` 用虚拟路由 `/__scene.json`、`/__batches.json` 从 `data/` 提供，URL 不变
- `flow_shot.mjs` 从 `__health.dataDir` 获取服务真实 data 目录，写入正确位置

```bash
curl -s http://localhost:5177/__health   # 看 skillVersion / bridge / dataDir
node scripts/serve.mjs                   # 手动启动（一般脚本会自动拉起）
```

## 排错

| 现象 | 原因/修复 |
| --- | --- |
| 画布为空 | `data/__batches.json` 无内容或 JSON 非法；检查 `curl /__batches.json` |
| 渐进播了两次 | 已修复：打开时不播旧图；若仍出现，确认用 `flow_shot.mjs` 且 bridge-client 为最新 |
| `ExcalidrawBridge` 未定义 / ready 一直 false | 旧 serve.mjs；查 `__health.bridge`，重启服务 |
| 元素不显示 | 元素字段必须完整（用 `gen_scene.mjs` 生成，勿手写残缺元素）；等一帧再截图 |
| 文字裁切/溢出 | 手动给节点更大 `width/height`、`fontSize`，或缩短菱形文字 |
| `flow_shot` 报"元素数不符" | 脚本写错目录；确认从 `__health.dataDir` 取路径（已内置） |
| 服务返回旧内容 | 浏览器缓存；index.html 带版本号会破缓存，硬刷新 `Ctrl+Shift+R` |
| 想清空重画 | 重新跑 `flow_shot`，或 `ExcalidrawBridge.clear()` |

注意：localStorage 场景仅存当前浏览器；持久化请用 `--export` 导出 `.excalidraw` 文件。

## 参考

- 目录总览与快速命令：`README.md`
- 场景生成脚本：`scripts/gen_scene.mjs`（`--out` / `--batches` / `--no-bind`）
- 一键闭环脚本：`scripts/flow_shot.mjs`（生成 → 渐进 → 截图验证）
- 元素字段完整说明：`references/scene-schema.md`
- 性能优化记录：`references/optimizations.md`
- 权威类型定义：`packages/element/src/types.ts`（本地源码）
