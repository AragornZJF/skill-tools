# Excalidraw Scene Schema 速查

注入到 localStorage 的数据分两份（键名定义见 `excalidraw-app/app_constants.ts` → `STORAGE_KEYS`）：

| localStorage 键 | 内容 | 格式 |
| --- | --- | --- |
| `excalidraw` | 元素数组 | `ExcalidrawElement[]` 的 JSON |
| `excalidraw-state` | 应用状态 | 对象（至少给 `viewBackgroundColor`） |

页面加载时：URL `#json=` 场景 > localStorage 场景。注入前确保地址栏没有 `#json=`。

## 元素公共字段（所有类型必备）

`gen_scene.mjs` 已自动补全；手动构造时可参考：

```jsonc
{
  "id": "唯一字符串", "type": "rectangle",
  "x": 0, "y": 0, "width": 100, "height": 60, "angle": 0,
  "strokeColor": "#1e1e1e", "backgroundColor": "transparent",
  "fillStyle": "solid",          // hachure | cross-hatch | solid
  "strokeWidth": 2, "strokeStyle": "solid",  // dashed/dotted 也可
  "roughness": 1, "opacity": 100,
  "groupIds": [], "frameId": null, "roundness": null,
  "seed": 12345,                 // 随机整数，roughjs 手绘种子
  "version": 1, "versionNonce": 67890,
  "isDeleted": false, "boundElements": null,
  "updated": 1700000000000, "link": null, "locked": false
}
```

缺失字段的容错：加载时 `restore()` 会补默认值，所以只需保证
`id/type/x/y/width/height/isDeleted:false` 正确即可渲染。

## 各类型特有字段

| type | 特有字段 |
| --- | --- |
| `rectangle` | `roundness: {type: 3}`（圆角）或 `null` |
| `ellipse` | 无额外 |
| `diamond` | 无额外 |
| `text` | `text`, `fontSize`, `fontFamily`(5=Excalifont, 1=Virgil, 2=Helvetica, 3=Cascadia), `textAlign`, `verticalAlign`, `containerId`(独立文本=null), `originalText`, `lineHeight`(1.25), `baseline`(≈fontSize), `autoResize` |
| `arrow` | `points: [[0,0],[dx,dy]]`（相对 x/y）, `startArrowhead: null`, `endArrowhead: "arrow"`, `startBinding/endBinding` 默认 `{elementId,focus,gap,fixedPoint}`（`--no-bind` 时为 null）, `lastCommittedPoint: null`, `roundness: {type: 2}` |
| `line` | 同 arrow 但 `endArrowhead: null` |
| `freedraw` | `points`, `pressures: []`, `simulatePressure: false` |

权威类型定义：本地源码 `packages/element/src/types.ts`；
默认值：`packages/common/src/constants.ts` 的 `DEFAULT_ELEMENT_PROPS`、`FONT_FAMILY`。

## 可编辑绑定（gen_scene 默认开启）

`gen_scene.mjs` 默认会把节点标签和箭头绑定到节点，手动拖动节点时标签/连线会跟随：

```jsonc
// shape
"boundElements": [{ "type": "text", "id": "<label-id>" }]

// label text
"containerId": "<shape-id>"

// arrow
"startBinding": { "elementId": "<from-shape-id>", "focus": 0, "gap": 4, "fixedPoint": null }
"endBinding":   { "elementId": "<to-shape-id>",   "focus": 0, "gap": 4, "fixedPoint": null }
```

需要“纯静态元素”时用：

```bash
node scripts/gen_scene.mjs scene.json --no-bind > scene.json
```

## 常用 appState 键

- `viewBackgroundColor`: 画布背景（如 `#ffffff`）
- `gridSize`: 网格（如 `20`，配合 `gridModeEnabled: true`）
- `theme`: `"light" | "dark"`
- 不要注入 `elements` 到 appState —— 元素只放 `excalidraw` 键

## 坐标系

- 原点在画布中心，y 向下为正；元素坐标即场景坐标（非屏幕像素）
- 缩放/居中由注入脚本写入 appState（zoom / scrollX / scrollY），无需手动 `Shift+1`

## 导出 `.excalidraw` 文件

`gen_scene.mjs --out xxx.excalidraw` 会在 scene 外包一层可直接打开/分享的文件结构：

```jsonc
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": { "viewBackgroundColor": "#ffffff", "gridSize": null },
  "files": {}
}
```

localStorage 只属于当前浏览器；需要持久化或发给别人时优先导出该文件。

## 批次场景（`--batches`）

规格可以额外写 `batches`，把完整流程拆成多个阶段逐批追加：

```jsonc
{
  "nodes": [ /* 全部节点 */ ],
  "edges": [ /* 全部连线 */ ],
  "batches": [
    {
      "name": "需求阶段",
      "nodes": ["start", "collect", "analyze", "d_review", "revise"],
      "edges": [0, 1, 2, 3, 4]   // 0-based 边索引；也支持边对象上的 id 字符串
    },
    {
      "name": "设计编码",
      "nodes": ["project", "plan", "design", "code"],
      "edges": [5, 6, 7]
    }
  ]
}
```

生成：

```bash
node scripts/gen_scene.mjs scene.json --batches --out scene.batches.json
```

输出结构：

```jsonc
{
  "full":  { "elements": [], "appState": {} },  // 完整场景，用于生成 .excalidraw 和计算 zoom
  "batches": [
    { "name": "需求阶段", "nodeIds": [], "elements": [], "appState": {} }
  ]
}
```

约束与保证：

- 每批元素按 `shape → arrow → label` 排序，绑定目标先于依赖元素出现
- 所有批次来自同一次生成，元素 ID 稳定一致，可安全按 id 去重合并
- 注入脚本始终用 `full` 的边界计算 `zoom/scrollX/scrollY`，视角不会随批次跳动
- 箭头可以引用上一批的节点（例如跨阶段连接），但不要引用尚未加入的后续节点
