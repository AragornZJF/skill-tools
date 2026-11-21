# excalidraw-skill

自包含、零 npm 依赖的 Excalidraw 画图技能：把「节点 + 连线」规格转成可编辑的 Excalidraw 场景，在本地白板中**渐进绘制**并截图验证。

核心原则：**不要模拟鼠标点击工具栏逐笔绘制**。标准闭环：

```text
写规格 JSON → flow_shot.mjs 生成场景 → 白板自动渐进加载 → 截图验证
```

全程无刷新（CDP 采样验证 `nav=1`）；Bridge 由 `serve.mjs` 在线注入，无需重新构建 app。

---

## 目录结构

```text
excalidraw-skill/
├── README.md                  # 本文件：目录总览 + 快速入口
├── SKILL.md                   # 使用说明书：怎么画、有哪些规矩、出问题怎么办
├── scripts/
│   ├── gen_scene.mjs          # 规格 → Excalidraw scene / .excalidraw / 批次场景
│   ├── flow_shot.mjs          # ★ 标准闭环：生成 → 渐进显示 → 截图验证
│   ├── serve.mjs              # 本地静态服务器 + 在线注入 Bridge + 虚拟场景路由
│   ├── bridge-client.js       # 注入到页面的 Bridge 客户端（window.ExcalidrawBridge）
│   ├── open.mjs               # 启动服务 + 打开浏览器
│   └── replay_batches.mjs     # 触发已打开页面重播
├── references/                # 参考资料（改脚本时才用得上）
│   ├── scene-schema.md        # 元素字段、绑定字段、batches 格式速查
│   └── optimizations.md       # 性能优化记录、实测数据、踩坑修复
├── data/                      # 运行时场景数据（__scene.json / __batches.json）
└── app/                       # 打包好的 Excalidraw 程序（约 23MB，纯构建产物）
```

`serve.mjs` 通过虚拟路由 `/__scene.json`、`/__batches.json` 从 `data/` 提供场景，`app/` 保持纯净。
`tmp/` 是脚本自动创建的临时目录（Chrome profile、截图），可随时删除。

---

## 快速开始

### 画一张图（一条命令）

```bash
node scripts/flow_shot.mjs --scene scene.json --out shot.png --export scene.excalidraw
```

它在内部完成三步：

1. 规格 JSON（含 `batches`）→ `gen_scene.mjs` 生成批次场景 → 写到服务 `data/__batches.json`
2. 打开本地白板，从空白画布**逐批绘出**（无需 URL 参数）
3. 采样元素数确认渐进过程，播放结束后截图

输出示例：

```text
[1/3] JSON 已生成: 6 批 / 55 元素 → data/__batches.json
[2/3] 渐进验证: 0 → 8 → 17 → 24 → 33 → 45 → 55  ✓ 逐批出现
[3/3] 截图: shot.png
      验收: {"count":55,"nav":1}（nav=1 表示全程无刷新）
```

其他输入形式：

```bash
node scripts/flow_shot.mjs --batches data/__batches.json --out shot.png   # 已有批次文件
node scripts/flow_shot.mjs --scene-json data/__scene.json --out shot.png  # 无 batches 时整图（单批）
```

### 浏览器常驻模式（先开页面，再生成图）

```bash
node scripts/open.mjs   # 启动服务（如未运行）+ 打开浏览器
```

打开 `http://localhost:5177/` 后页面保持轮询：

- **打开时不播旧图**（避免重复）；之后只要 `data/__batches.json` 内容变化，就播一次新图
- 想再看一遍：`node scripts/replay_batches.mjs`
- 想打开即播放已有图：URL 加 `?replay=1`
- 节奏调节：`?delay=1500`（默认 700ms/批）
- 关闭自动播放（手动画布）：`?nowatch=1`
- 窗口最大化自动重新适配（可选 `?norefit=1` 关闭）

### 在浏览器里用 Bridge API

`serve.mjs` 把 Excalidraw imperative API 挂到 `window.ExcalidrawBridge`，不刷新即可改画布：

```js
ExcalidrawBridge.ready                                   // true = 可操作
await ExcalidrawBridge.loadScene('/__scene.json?v=' + Date.now());
ExcalidrawBridge.addElements(newElements);               // 追加，按 id 去重
ExcalidrawBridge.setScene(elements, appState);           // 整图替换
ExcalidrawBridge.zoomToFit();                            // 缩放居中
```

完整方法表见 `SKILL.md`「Bridge API」。

---

## 规格格式（含 batches）

```jsonc
{
  "nodes": [
    { "id": "start", "type": "ellipse", "label": "开始" },
    { "id": "step",  "type": "rectangle", "label": "处理" }
  ],
  "edges": [ { "from": "start", "to": "step" } ],
  "batches": [
    { "name": "起点", "nodes": ["start"], "edges": [] },
    { "name": "处理", "nodes": ["step"],  "edges": [0] }
  ]
}
```

`batches` 的 `edges` 是 0-based 边索引；生成器保证每批内 `shape → arrow → label` 顺序。
详见 `references/scene-schema.md`。

---

## 关键约定

- `gen_scene.mjs` 默认输出单行压缩 JSON：`{ elements, appState }`
- `--out xxx.excalidraw` 导出可直接打开/分享的可编辑文件
- 箭头端点自动吸附节点边界；复杂图建议手写 `x/y`
- 中文宽度按全角估算，避免标签被裁切
- localStorage 键：`excalidraw` / `excalidraw-state`

## 服务

```bash
curl -s http://localhost:5177/__health   # 含 skillVersion / bridge / dataDir
```

服务未启动时会由脚本自动拉起，也可用 `node scripts/serve.mjs` 手动启动。

## 文档地图

| 想了解什么 | 看哪里 |
| --- | --- |
| 画图流程、规矩、排错 | `SKILL.md` |
| 字段含义、batches 格式 | `references/scene-schema.md` |
| 为什么这样设计、性能数据 | `references/optimizations.md` |
| 目录结构和快速命令 | 本文件 |
