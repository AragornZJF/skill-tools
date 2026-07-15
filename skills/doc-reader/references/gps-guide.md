# GPS 模式 · 详细指南（知识图谱全景导航）

本文件是 `SKILL.md` GPS 模式的展开。它规定了**图谱数据的 schema、提取规则、校验**，以及如何调用官方渲染器生成 HTML。

**响应开头**：GPS 响应也先输出 skill 引导块（见 SKILL.md 开头的引导模板，以「我是你的 AI 文档阅读助手·超级马里奥掘金者」开头），再给图谱流程/结果。

---

## 渲染分工（重要）

HTML 图谱的**渲染由专用工具 `knowledge-graph-map` 完成**（npm 包，作者江枫，MIT；本体系的官方渲染器）。它内置 2 种布局、4 套主题、数据校验，并支持 CLI 与 Claude Code Skill 双模式。

**你的职责不是手写 HTML**，而是：
1. 从文章里**提炼出符合下方 schema 的图谱数据（JSON）**；
2. 调用渲染器把 JSON 变成交互式 HTML。

> 为什么这样分工：淘金模式已经把文章的"金币/核心概念"提炼出来了——它们正好就是图谱的节点。淘金与 GPS 天然衔接，单一数据源、零重复造轮子。

---

## 两个用途（决定你怎么构图）

1. **看清全貌**：让读者一眼看懂文章的概念骨架和连接方式。
2. **自测理解**：盖住图，让读者用自己的话讲清核心概念的关系——讲得明白，才是真懂。

所以节点要选得**准**（核心概念，不是边角词），关系要标得**清**（用动词，不是泛泛的"相关"），分类要**有逻辑**（不是随机分组）。

---

## JSON Schema（必须严格遵守）

```json
{
  "meta": {
    "title": "图谱标题",
    "layout": "force",
    "theme": "dark-tech"
  },
  "nodes": [
    { "id": "1", "name": "概念名称", "category": "分类名", "weight": 85 }
  ],
  "links": [
    { "source": "1", "target": "2", "relation": "关系类型" }
  ],
  "categories": ["分类1", "分类2"]
}
```

**字段要点：**
- `meta.title`：图谱标题（默认取文件名）。
- `meta.layout`：`force`（力导向，默认）或 `radial`（辐射状）。
- `meta.theme`：`dark-tech` | `nature-fresh` | `warm-sunset` | `ocean-deep`。
- `nodes[].id`：**字符串**，全图唯一（`"1"`、`"2"`… 或语义化短词都可）。
- `nodes[].name`：中文显示名。
- `nodes[].category`：**必须**能在 `categories[]` 里找到同名项，否则节点不上色。
- `nodes[].weight`：重要度 **1–100**，决定节点大小。参考量级：
  - 核心概念 **80–100**（对应淘金的"金币"）
  - 子类概念 **50–79**
  - 细节概念 **20–49**
  - 关键词 **10–30**
- `links[].source` / `target`：必须引用**已存在**的 node id。
- `links[].relation`：用**动词**，如 包含 / 指导 / 生成 / 使用 / 要求 / 实现 / 集成 / 规定。避免"相关""联系"这种无信息量的词。
- `categories`：字符串数组，顺序即图例顺序；颜色由主题调色板自动分配。

> 完整可用样例见 `templates/sample-graph.json`。

---

## 校验规则（写完 JSON 自查，任何一条不过都要修）

这些来自渲染器的 `validate.js`，不通过会被 CLI 拒绝：

1. `nodes` 非空数组。
2. **节点数量 ≤ 500**（但为了可读，建议控制在 ~50–80 以内；太多读者看不懂）。
3. **节点 ID 唯一**——重复会报错。
4. **weight 落在 1–100**（整数/小数均可）。
5. **关系引用有效**：每条 link 的 `source` / `target` 都能在 `nodes` 里找到。
6. **无环形引用**：检测到**任意**环路即报错（注意：比文章里写的"深度>5"更严格——任何环都会被拒）。设计关系时保持单向、有层级，别让 A→B→A。

---

## 提取流程（从文章到 JSON）

1. **通读 + 复用淘金成果**：淘金第一步的"金币/核心观点"直接拿来当高分节点。
2. **选概念**：圈出承载主旨的核心概念（名词短语），剔除"的、了、是"这类无意义词。
3. **归类**：按内在逻辑分组（如：核心框架 / 实现阶段 / 技术实现 / 约束）。每组一个分类。
4. **定权重**：核心 80–100，支撑 50–79，细节 20–49（见上）。
5. **连关系**：问"A 和 B 是什么关系？"，用动词标注。
6. **自查**上面 6 条校验。
7. **写 JSON** → 调渲染器。（`graph.json` 是**中间产物**：knowledge-graph-map CLI 需文件输入，渲染完即可删除，不必留在用户目录；要复查提炼结果时临时保留即可。）

> 概念太少（<5）时，可适度**数据增强**：补几个文章里隐含但明显相关的关联概念，让图谱不显得空。

---

## 渲染：调用 `knowledge-graph-map` CLI

**首选方式——把 JSON 渲染成交互式 HTML：**

```bash
npx knowledge-graph-map -f graph.json \
  --theme dark-tech \
  --layout force \
  -o <文章名>-知识图谱.html \
  --no-open
```

- `-f <file>`：输入 JSON 或 Markdown 文件。
- `--theme`：`dark-tech`（默认）| `nature-fresh` | `warm-sunset` | `ocean-deep`。
- `--layout` / `-l`：`force`（默认）| `radial`。
- `-o <path>`：输出路径（默认 `./knowledge-graph.html`）。
- `--no-open`：不自动弹浏览器（在 Claude Code 里建议加上，避免抢焦点；用户自己打开）。
- `--title`：覆盖标题。

生成后，把 HTML 路径告诉用户，提示在浏览器打开。**生成的 HTML 运行时还能切换主题与布局**（页面内置切换按钮），所以即便默认值不理想，用户也能在浏览器里即时调整。

**快捷方式——直接喂 Markdown：**

```bash
npx knowledge-graph-map -f 文章.md --layout radial --theme ocean-deep
```

CLI 会按标题层级（h1→核心 / h2→子类 / h3-h4→细节 / **加粗**→关键词）自动抽取节点。但**自动抽取不如你手工提炼准**——淘金已经帮你把真正的核心概念挑出来了，优先用手写 JSON。

**前置依赖**：需要 Node 环境（首次 `npx` 会临时下载包，需联网；之后有缓存）。无 Node 时，提示用户安装 Node，或安装官方 skill：`npx knowledge-graph-map --install-skill`。

---

## 离线化（默认执行，产出单一压缩 HTML）

`knowledge-graph-map` 生成的 HTML 默认从 CDN 加载 ECharts / Tailwind / Font Awesome。为了让产物**断网也能打开**，标准流程在渲染后跑一次离线化：

```bash
node <skill目录>/scripts/offline-bundle.js <topic-slug>-knowledge-graph.html
```

**默认产出单一压缩 HTML**（同名 `.html`，覆盖输入）——ECharts / 模板 / Font Awesome / picker 全部内联，并 minify 模板 JS / 页面 CSS / picker，移除未使用的 Tailwind。无任何外部引用，**双击即离线打开**（单文件无子资源，`file://` 下最稳）。

它做的事——**与在线版视觉 100% 一致**（已审计验证，非主观判断）：
- **ECharts** → 内联（源码内部含字面量 `</script>`，内联前转义为 `<\/script`，否则 HTML 解析器会提前截断 `<script>`）。
- **Font Awesome** → 内联 CSS + solid 字体以 base64 嵌入（图标完全相同）。
- **模板逻辑 / 页面样式 / picker** → 提取后 **minify** 再内联。minify 安全：不碰 `//` 注释（避免误伤字符串/正则里的 `//`）、保留换行（避免 ASI 断码）；echarts/FA 本就是压缩版，跳过。
- **Tailwind Play** → **移除**。模板的全部 class（`toolbar`/`btn`/`chart-container`/`ctrl-select`/`footer-tips`/`toolbar-controls`/`fas fa-*`）都是自定义 CSS 或图标类，Tailwind 零样式贡献，移除后外观不变。

> **关于体积**：单一文件约 1.7MB，其中 echarts（~1MB，本就是压缩版）+ FA woff2（~210KB base64）占绝对大头。minify 只能压模板/页面部分（实测省 ~2KB，<1%），headline 基本不变。要大幅瘦身只能换「自定义 graph-only echarts 构建」（~1MB → ~300KB），不在当前范围。

库首次联网下载后缓存进 `scripts/vendor-cache/`（`echarts.min.js` ~1MB / `fa-solid-900.woff2` / `fontawesome-all.min.css`），之后**生成也完全离线**。

**`--folder` 文件夹形态**：`node offline-bundle.js <input.html> --folder` 产出文件夹——JS/CSS 拆成独立文件、HTML 只剩 `<script src>`/`<link>` 引用，双击 `index.html` 离线打开：

```
<topic-slug>-knowledge-graph/
├── index.html              # <script src> + <link> 引本地 JS/CSS
├── vendor/{echarts.min.js, fontawesome.min.css, fa-solid-900.woff2}
├── js/{graph.js, theme-picker.js}
└── css/{page.css, theme-picker.css}
```

> 脚本源码：`scripts/offline-bundle.js`。用法：`node offline-bundle.js <input.html> [out.html]`（默认单一压缩 HTML，覆盖输入）/ `--folder`（文件夹）/ `--no-minify`（关 minify）。`--single` 为别名（=默认）。

---

## 主题与布局速查

**布局**

| 布局 | 说明 |
|------|------|
| `force` | 力导向（默认）。节点自然散开、聚簇，能看出概念群落。 |
| `radial` | 辐射状。节点排成环，核心居中层层展开，标签旋转可读。 |

**主题**

| 主题 | 风格 | 适用 |
|------|------|------|
| `dark-tech` | 深蓝黑底 + 霓虹色 | 技术主题（默认） |
| `nature-fresh` | 浅绿白底 + 绿色渐变 | 教育 / 科普 |
| `warm-sunset` | 暖黄底 + 红橙金 | 人文社科 |
| `ocean-deep` | 深海蓝 + 青蓝渐变 | 学术 / 科研 |

未指定时，**默认 `dark-tech` + `force`**；不过先问一句用户偏好更好。

---

## 与官方 skill 的关系

`knowledge-graph-map` 本身也提供 `/knowledge-graph` Claude Code Skill（`npx knowledge-graph-map --install-skill` 或 `npx skills add AragornZJF/knowledge-graph-map`）。本技能（超级马里奥掘金者）是**更大的阅读闭环**：淘金（提炼概念）+ GPS（织成图谱）。GPS 阶段直接复用官方渲染器，不重复实现。
