# Skill Tools

一套面向 AI 协作的技能（Skill）集合，覆盖思维学习、内容创作、可视化、视频处理、文档管理等场景。每个技能以 `SKILL.md` 形式定义触发词与工作流，可被 AI Agent 按需调用。

## 目录

skills 目录下共收录 25 个可用技能（`finding-your-unknowns` 仅有说明文档，无标准 `SKILL.md`），按功能归入 8 个分类文件夹：

```
skills/
├── thinking-learning/          # 思维与学习方法
│   ├── bloom-test/             # 布鲁姆认知测验
│   ├── feynman-tech/           # 费曼学习法
│   ├── finding-your-unknowns/  # 发现你的未知（仅说明文档）
│   ├── knowledge-deconstructor/# 知识三维解构
│   ├── smart-goal-coach/       # SMART 目标管理
│   └── system-thinking/        # 系统性思维分析
├── docs-knowledge/             # 文档与知识管理
│   ├── doc-reader/             # 文档精读助手
│   ├── knowledge-graph/        # 知识图谱生成
│   ├── md2html/                # Markdown 转 HTML
│   └── petit-prince-story/     # 小王子风格分镜
├── content-creation/           # 内容创作
│   ├── auto-skill-forge/       # 元技能工厂
│   ├── prompt-framework/       # 提示词框架
│   └── title-designer/         # 标题设计
├── visualization/              # 可视化
│   ├── mermaid-generator/      # Mermaid 图表生成
│   └── svg-visualizer/         # SVG 可视化
├── video-processing/           # 视频处理
│   ├── video-clip-assistant/   # 视频自动剪辑
│   ├── video-editor/           # 视频剪辑工具箱
│   ├── video-generator-seedance/ # AI 视频生成
│   └── video2txt/              # 视频转文字
├── audio/                      # 音频
│   └── tts-wangwang/           # 文字转语音
├── dev-tools/                  # 开发工具
│   ├── git-commit/             # Git 提交工作流
│   ├── goal-loop/              # 目标构建循环
│   ├── ui2code-copilot/        # 设计稿转代码 Copilot
│   └── uiux-prototype-generator/ # UI/UX 原型生成
└── life-planning/              # 人生规划
    ├── gaokao-planner/         # 高考志愿规划
    └── human3-evaluation/      # 人生发展评估
```

## 技能总览

### 思维与学习方法

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `feynman-tech` | 费曼学习法实践工具，通过「概念->教给别人->回顾->简化」四步闭环解决「学完就忘」问题 | 费曼学习、feynman、费曼模式 |
| `bloom-test` | 布鲁姆认知六层次测验系统，逐层出题（记忆->理解->应用->分析->评价->创造），一题一答、即时反馈 | 测验、布鲁姆、bloom-test、考一考 |
| `system-thinking` | 从「组成要素->生活化案例->要素关联与反馈回路->整体目的」四维度拆解任意系统 | 系统思维分析、system-thinking、帮我系统性地拆解 |
| `knowledge-deconstructor` | 对任意知识点做三维系统性解构（是什么->解决了什么->如何掌握），输出标准化报告 | 知识解构、三维解构、拆透 |
| `smart-goal-coach` | 用 SMART 原则把宽泛目标转化为清晰可执行方案，目标不合理时给出改进建议 | 目标管理、SMART、定目标、目标拆解 |
| `finding-your-unknowns` | 协助识别「你不知道自己不知道」的盲区，让 AI 补位（仅有说明文档） | - |

### 文档与知识管理

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `doc-reader` | 「超级马里奥掘金者」文档阅读助手，淘金模式提炼核心观点/行动步骤/隐藏洞见，GPS 模式生成交互式 HTML 知识图谱 | 精读、淘金、帮我读这篇文章、做个知识图谱 |
| `knowledge-graph` | 根据主题词或 Markdown 文档生成交互式 HTML 知识图谱，支持力导向/辐射状布局与 4 套主题 | 知识图谱、概念关系、文档转图谱 |
| `md2html` | reference 型 Markdown 转 HTML 技能，设计前先读设计准则，支持 4 变体投票设计流程 | markdown转html、md2html、设计网页 |
| `petit-prince-story` | 将 Markdown 文档转换为《小王子》手绘风格的故事分镜 SVG 场景，多章可合成纵向长卷 | 把文档画成小王子风格的图、markdown转小王子分镜 |

### 内容创作

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `title-designer` | 根据内容描述创作 3-5 个不同风格（悬念/数字/问题/情感/热点）的高转化标题选项 | 标题、起标题、标题设计、title-designer |
| `prompt-framework` | 内置 14 个提示词工程框架（RTF、CO-STAR、ICIO、RISE 等），自动选定最合适框架生成可用提示词 | 帮我写提示词、优化prompt、prompt framework |
| `auto-skill-forge` | 元技能工厂，用于创建带自进化能力的新技能，或为现有技能注入自我反思与改进机制 | 造个skill、创建skill、auto-skill、自进化skill |

### 可视化

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `mermaid-generator` | 根据流程、架构或结构描述自动生成符合 Mermaid 语法的图表代码，支持流程图/时序图/类图/状态图/ER 图/甘特图等 | 画mermaid图、生成mermaid代码、把这个流程画成图 |
| `svg-visualizer` | 以「技术插画师+可视化专家+教育内容设计师」三重角色，将概念转化为符合 W3C 标准的高质量 SVG 图形 | 画图、可视化、svg、图解、把…可视化 |

### 视频处理

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `video-editor` | 基于 moviepy + ffmpeg 的本地视频剪辑工具箱，支持裁剪/合并/分割、加文字字幕、配乐、变速、提取音频等 | 剪辑视频、加字幕、合并视频、加背景音乐、竖屏转换 |
| `video-clip-assistant` | 基于 FFmpeg 自动提取精彩片段、生成字幕、裁剪时长，支持 9:16/1:1/16:9 多平台导出 | 自动剪辑视频、提取关键词片段、生成字幕并烧录 |
| `video-generator-seedance` | 使用火山引擎 SD1.5pro API 生成视频，支持文本到视频与图生视频，异步处理 | AI 视频生成、文生视频、图生视频 |
| `video2txt` | 从视频 URL 提取字幕/讲稿并交付为 .docx，支持 YouTube、Bilibili 等，非中文视频同时生成原文与译文 | 帮我把视频转成文字、视频讲稿、字幕文档、transcript |

### 音频

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `tts-wangwang` | 通过免费 TTS 接口将文字转换为 MP3 语音文件，支持 90+ 种语音选择与多种风格 | 语音、读出来、转语音 |

### 开发工具

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `git-commit` | 交互式 Git 提交工作流，遵循 Conventional Commits 规范，7 步逐步确认生成提交信息，绝不静默提交 | git commit、提交代码、commit message、写提交信息 |
| `goal-loop` | 三阶段工作流：需求探索->实现计划->无头构建-测试-提交循环（Ralph Loop） | 探索需求、写实现计划、goal loop、自主构建 |
| `ui2code-copilot` | 设计稿转代码 Copilot。分两阶段扫描前端项目生成上下文规范，再基于规范将 UI 设计稿转化为符合项目约定的生产级代码 | init context、扫描代码、设计稿还原、design to code、实现 UI |
| `uiux-prototype-generator` | 全栈产品原型专家（PM+设计师+前端），基于 ROSES 框架生成 iPhone 15 Pro 尺寸高保真移动端 HTML 原型 | 原型设计、高保真原型、APP原型、uiux |

### 人生规划

| 技能 | 简介 | 触发词示例 |
| --- | --- | --- |
| `gaokao-planner` | 基于 ROSES 框架，根据预估分数、选科、兴趣与地域偏好提供冲/稳/保院校推荐与专业前景分析 | 高考志愿、志愿填报、选大学选专业、冲稳保 |
| `human3-evaluation` | HUMAN 3.0 人生发展评估系统，评估心智/身体/精神/职业四象限发展层级，识别元类型与生活方式原型 | 人生发展评估、四象限评估、我处在哪个层级 |

## 技能结构

每个技能目录下至少包含一个 `SKILL.md`，用于声明技能名称、描述、触发词与执行工作流。典型结构如下：

```
skills/<category>/<skill-name>/
├── SKILL.md          # 技能定义（描述、触发词、工作流、脚本引用）
├── scripts/          # 可选：技能调用的脚本/模板资源
└── ...
```

## 使用方式

在支持 Skill 机制的 AI 编码助手（如 opencode）中，直接用自然语言描述需求即可触发对应技能--命中触发词后，技能的工作流会自动注入到对话上下文中。例如：

- 「帮我用费曼学习法学一下 RAG」-> 触发 `feynman-tech`
- 「把这个流程画成 mermaid 图」-> 触发 `mermaid-generator`
- 「帮我提交代码」-> 触发 `git-commit`

> 详见各技能目录下的 `SKILL.md` 获取完整的触发条件与工作流说明。