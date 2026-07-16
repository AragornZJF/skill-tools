# AI 文档阅读助手·超级马里奥掘金者 🪙🍄✨❓🧪

> 把一篇文章当成一座"矿山"——文字是一块块等待敲击的砖块，奋力一跳，从中敲出**金币、蘑菇、星星、问号**，还能测测你是否真懂。

一个 [Claude Code Skill](https://docs.claude.com/en/docs/claude-code/skills)，用于**深度阅读任意文章**。三种模式，一套闭环：

| 模式 | 做什么 | 产出 |
|------|--------|------|
| 🪙 **淘金模式**（默认） | 四阶段深度分析，把文章"敲"出最大价值 | 结构化的核心观点 / 行动步骤 / 隐藏洞见 / 延伸疑惑 |
| 🗺️ **GPS 模式** | 把文章核心概念织成可交互的知识图谱 | 离线单一压缩 HTML 知识图（节点—关系—分类） |
| 🧪 **测验模式** | 基于布鲁姆六层次逐层出题，一题一答 | 总分 / 错题解析 / 正确答案参考 |

---

## 为什么是马里奥（隐喻不是装饰）

每个游戏元素对应一种**不同的价值层**。它是记忆抓手，也防止把分析糊成一团总结：

| 元素 | 含义 | 价值层 |
|------|------|--------|
| 🪙 **金币** | 文章本身讲清楚的核心观点 | 最显眼、最该先记的 |
| 🍄 **蘑菇** | 能立刻去做、让你变强的行动步骤 | power-up，知识变动作 |
| ✨ **星星** | 作者没明说、藏在字里行间的洞见 | 超越文本的二次综合 |
| ❓ **问号** | 通向下一关的延伸疑惑 | 单次阅读 → 持续探索 |
| 🧪 **试管** | 按布鲁姆六层次测试掌握程度 | 诊断薄弱环节，反哺后续学习 |

五者各管一层，**不合并、不跳过、不只做总结**。

---

## 核心特性

- **淘金四阶段固定契约**：通读全文 → 提炼金块（恰好 3 条行动步骤）→ 意料之外（隐藏洞见）→ 延伸疑惑。固定标题 + emoji 作为"信号灯"，逐字一致。
- **测验模式六层次评估**：基于布鲁姆认知六层次（记忆→理解→应用→分析→评价→创造），一题一答逐层递进，出总分、错题解析、正确答案参考。
- **从"问号"延续对话**：第四步的每个问题都是下一轮的入口，阅读不是一次性的事。
- **三模式无缝衔接**：淘金提炼的核心概念 → 测验检验掌握程度 → GPS 把薄弱概念织成图谱。
- **官方渲染器背书**：GPS 的 HTML 由 [`knowledge-graph-map`](https://www.npmjs.com/package/knowledge-graph-map)（作者江枫，MIT）生成——同模板、同主题、同布局，**与在线版视觉 100% 一致**。
- **默认离线单一压缩 HTML**：ECharts / 模板 / Font Awesome / picker 全部内联 + minify、移除未使用的 Tailwind，单个 `.html` 断网双击即开（无子资源，`file://` 下最稳）。`--folder` 可改为文件夹形态（JS/CSS 拆独立文件）。
- **2 种布局 × 4 套主题**：力导向 / 辐射状 × 暗色科技 / 自然清新 / 暖阳落日 / 深海幽蓝，运行时还能在页面里实时切换。

---

## 快速上手

### 1. 触发 Skill

在 Claude Code 里直接说出你的意图，无需记命令。例如：

```
帮我淘金这篇文章：D:\articles\某篇.md
精读这篇，提炼出能立刻做的行动点
把这篇文章的核心概念做个知识图谱
这篇文章讲了什么？帮我挖掘一下
```

Skill 会自动判断走淘金模式、GPS 模式还是测验模式；意图模糊时先跑淘金，结束再提议进入 GPS 或测验。

### 2. 三种模式可以连用

推荐闭环：**先淘金**（挖出核心概念）→ **测验**（检验掌握程度，暴露薄弱点）→ **再 GPS**（把薄弱概念织成图谱，看全貌 + 强化理解）。

---

## 目录结构

```
doc-reader-mario/
├── SKILL.md                  # Skill 入口（模式判断 + 两模式总纲 + 注意事项）
├── README.md                 # 本文件
├── agents/
│   └── openai.yaml           # OpenAI agent 接口清单（展示名 / 触发描述 / 默认 prompt）
├── references/
│   ├── gold-miner.md         # 淘金模式详细指南（四阶段细则 + 原始 Prompt 出处）
│   ├── gps-guide.md          # GPS 模式详细指南（JSON schema + 校验 + 主题/布局速查）
│   └── bloom-test.md         # 测验模式详细指南（六层次细则 + 反馈规则 + 样例）
├── scripts/
│   ├── offline-bundle.js     # 离线化脚本：默认产单一压缩 HTML（--folder 出文件夹），与在线版视觉一致
│   └── vendor-cache/         # 依赖缓存（首次联网下载，之后生成完全离线）
│       ├── echarts.min.js
│       ├── fontawesome-all.min.css
│       └── fa-solid-900.woff2
└── templates/
    ├── sample-graph.json     # 完整 JSON 样例（本 Skill 自身的 16 节点知识图谱）
    └── sample-graph-output/  # 已离线化 demo（--folder 形态：index.html + vendor/ + js/ + css/）
```

> **Progressive Disclosure**：`SKILL.md` 只放总纲；某一步拿不准深浅时，再去读 `references/` 里对应的展开；`scripts/` 与 `templates/` 是可独立运行的资源。

---

## GPS 渲染流水线

```
文章 ──淘金提炼──▶ graph.json(中间产物，用完即删) ──knowledge-graph-map CLI──▶ 在线版 HTML（CDN 引用）
                                                          │
                                          offline-bundle.js│全内联 + minify + 移除 Tailwind
                                                          ▼
                                            离线单一压缩 HTML（*.html，双击即开）✅
```

**渲染（生成在线版 HTML，由 knowledge-graph-map 完成）：**
```bash
npx knowledge-graph-map -f graph.json --theme dark-tech --layout force \
  -o <topic-slug>-knowledge-graph.html --no-open
```

**离线化（默认执行，产单一压缩 HTML）：**
```bash
node <skill目录>/scripts/offline-bundle.js <topic-slug>-knowledge-graph.html
```

默认产出**单一压缩 HTML**（同名 `.html`，覆盖输入）——ECharts / 模板 / Font Awesome / picker 全部内联 + minify，移除未使用的 Tailwind，无外部引用，**双击即离线打开**（单文件无子资源，`file://` 下最稳）。

离线化做的事（已审计验证，非主观判断）：
- **ECharts** → 内联（内联前把源码里的字面量 `</script>` 转义，防 HTML 解析器提前截断）。
- **Font Awesome** → 内联 CSS + solid 字体以 base64 嵌入（图标完全相同）。
- **模板逻辑 / 页面样式 / picker** → 提取后 **minify** 再内联（不碰 `//` 注释、保留换行，ASI 安全；echarts/FA 已压缩，跳过）。
- **Tailwind Play** → **移除**（模板全部 class 都是自定义 CSS 或图标类，零样式贡献，外观不变）。

> **体积**：约 1.7MB（echarts ~1MB + FA woff2 ~210KB 占大头，本就是压缩版）。minify 只省模板部分（实测 ~2KB，<1%）；要大幅瘦身需换自定义 graph-only echarts 构建。

**`--folder` 文件夹形态**（可选）：JS/CSS 拆成独立文件，HTML 只剩 `<script src>`/`<link>`，双击 `index.html` 打开：

```
<topic-slug>-knowledge-graph/
├── index.html              # <script src> + <link> 引本地 JS/CSS
├── vendor/{echarts.min.js, fontawesome.min.css, fa-solid-900.woff2}
├── js/{graph.js, theme-picker.js}
└── css/{page.css, theme-picker.css}
```

---

## 依赖与安装

- **运行环境**：Claude Code。
- **GPS 渲染**：需要 Node.js（首次 `npx knowledge-graph-map` 临时联网下载，之后有缓存）。
  - 无 Node 时：安装 Node，或装官方 skill —— `npx knowledge-graph-map --install-skill`。
- **淘金模式**：纯文本分析，零外部依赖。

---

## 与 `knowledge-graph-map` 的关系

[`knowledge-graph-map`](https://www.npmjs.com/package/knowledge-graph-map) 是本体系 GPS 模式的**官方渲染器**，它本身也提供 `/knowledge-graph` Claude Code Skill。

本 Skill 是**更大的阅读闭环**：淘金（提炼概念）+ GPS（织成图谱）。GPS 阶段直接复用官方渲染器，**不重复实现**——单一数据源、零漂移。

---

## 致谢与出处

- 淘金模式的角色设定与四阶段结构，源自 **江枫** 的《超级马里奥淘金者》Prompt（version 0.2），完整原文见 `references/gold-miner.md`。
- GPS 渲染器：[`knowledge-graph-map`](https://www.npmjs.com/package/knowledge-graph-map)（[Gitee 镜像](https://gitee.com/scedm/knowledge-graph-map)），作者江枫，MIT。

---

## 许可

遵循上游 `knowledge-graph-map` 的 MIT 许可。原始文章与 Prompt 版权归原作者所有，本项目仅作为阅读分析工具引用。
