# excalidraw-skill

一个自包含、零 npm 依赖的 Excalidraw 画图技能：把「节点 + 连线」描述转换成可编辑的 Excalidraw 场景，在本地白板中注入并截图验证。

核心原则：**不要模拟鼠标点击工具栏逐笔绘制**。正确路径是：

```text
写规格 → 生成 scene JSON → 注入 localStorage → reload → 截图验证
```

---

## 目录结构

```text
excalidraw-skill/
├── README.md                  # 本文件：目录总览 + 快速入口
├── SKILL.md                   # 使用说明书：怎么画、有哪些规矩、出问题怎么办
├── scripts/                   # 三个核心脚本（均零 npm 依赖）
│   ├── gen_scene.mjs          # 规格 → Excalidraw scene / .excalidraw / 批次场景
│   ├── inject_and_shot.mjs    # 一键：启服务 + 注入 + reload + 截图
│   └── serve.mjs              # 本地静态服务器，托管内置 app/
├── references/                # 参考资料（改脚本时才用得上）
│   ├── scene-schema.md        # 元素字段、绑定字段、batches 格式速查
│   └── optimizations.md       # 性能优化记录、实测数据、踩坑修复
└── app/                       # 打包好的 Excalidraw 程序（约 23MB，离线可用）
    ├── index.html             # 入口文件
    ├── assets/                # 网页 JS / CSS
    ├── fonts/                 # 本地字体，避免 CDN 延迟
    ├── screenshots/           # 构建自带截图资源
    ├── sw.js                  # 由 serve.mjs 返回空 SW，防止 workbox 拦截 /__blank
    ├── service-worker.js      # 同上
    └── version.json           # 构建版本标记
```

> `app/__scene.json` 不是技能自带文件。它是旧手动注入流程的运行时产物；
> 当前推荐的一条龙脚本直接把场景传给页面，不再往 `app/` 里写运行时数据。

`tmp/` 不是技能自带目录。`inject_and_shot.mjs` 会在需要时自动创建它，用来放临时
Chrome profile 和截图；可以随时删除，脚本下次会重建。

---

## 快速开始

### 方式 A：一键执行（推荐，只需 shell）

```bash
# 一次性整图导入
node scripts/inject_and_shot.mjs \
  --scene scene.json \
  --out shot.png \
  --export scene.excalidraw
```

脚本会自动：

1. 检查 `http://localhost:5177`，必要时后台启动 `scripts/serve.mjs`
2. 启动 Chrome/Edge headless
3. CDP 打开 `/__blank`
4. 注入 `localStorage`
5. 导航到 `/` 并等待 canvas
6. 截图

### 方式 B：按批次追加 / 渐进注入（大图推荐）

在规格里写 `batches`：

```jsonc
{
  "nodes": [ /* 全部节点 */ ],
  "edges": [ /* 全部连线 */ ],
  "batches": [
    { "name": "需求阶段", "nodes": ["start", "collect"], "edges": [0] },
    { "name": "设计阶段", "nodes": ["design", "code"],  "edges": [1, 2] }
  ]
}
```

然后：

```bash
node scripts/gen_scene.mjs scene.json --batches --out scene.batches.json
node scripts/inject_and_shot.mjs --batches scene.batches.json \
  --out shot.png --export scene.excalidraw
```

每批一次 reload，最后统一截图。视角始终按完整场景计算，不会随批次跳动。

### 方式 C：手动浏览器 agent 注入

适合已有浏览器自动化能力的环境，细节见 `SKILL.md`「第 3 步」：

```bash
node scripts/serve.mjs                                  # 如未启动
node scripts/gen_scene.mjs scene.json > app/__scene.json
# 在页面上下文执行 SKILL.md 中的注入 JS，然后截图
```

画完可以删掉 `app/__scene.json`，避免污染构建产物目录。

---

## 关键约定

- `gen_scene.mjs` 默认输出单行压缩 JSON：`{ elements, appState }`
- `--out xxx.excalidraw` 导出可直接打开/分享的可编辑文件
- 节点 label 与 shape 双向绑定；arrow 绑定首尾节点；`--no-bind` 可关闭
- 边端点自动吸附节点边界，复杂图建议手写 `x/y`
- 中文宽度按全角估算，避免标签被裁切
- 绘制层级固定为 `shape → arrow → label`
- localStorage 键：`excalidraw` 和 `excalidraw-state`；URL 带 `#json=` 时 URL 场景优先

---

## 服务与健康检查

```bash
curl -s http://localhost:5177/__health
```

返回含 `skillVersion` 的 JSON 表示新版服务已就绪。只返回 404 或连接失败，说明服务未启动或仍是旧版 `serve.mjs`。

---

## 文档地图

| 想了解什么 | 看哪里 |
| --- | --- |
| 画图流程、规矩、排错 | `SKILL.md` |
| 字段含义、batches 格式 | `references/scene-schema.md` |
| 为什么这样设计、性能数据 | `references/optimizations.md` |
| 目录结构和快速命令 | 本文件 `README.md` |
