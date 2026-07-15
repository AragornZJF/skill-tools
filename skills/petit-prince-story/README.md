# petit-prince-story

把 markdown 文档按章节自动画成《小王子》手绘风格故事分镜 SVG。

小王子常驻一颗星球，章节主旨决定星球上迎来哪位象征角色，每章配一句 ≤12 字金句、寓意。安静、克制、有呼吸感的故事速写。

## 快速上手

### 前置条件

- 已安装 [Claude Code](https://claude.ai) 或 [OpenCode](https://opencode.ai/zh)（二选一即可）
- 已配置好模型，如 DeepSeek V4、Kimi Code、Qwen Plus、GLM-5.2 等

### 方式一：npm / npx 一键安装（推荐）

在你的项目目录下运行：

```bash
npx petit-prince-story
```

这会把 `.claude/skills/petit-prince-story/` 复制到当前项目。已安装过想覆盖，加 `--force`：

```bash
npx petit-prince-story --force
```

> 如需用 skill 自带的 `scripts/` 合成 GIF，需在本项目额外安装依赖：
> `npm i @resvg/resvg-js pngjs gif-encoder`

### 方式二：克隆仓库

将本项目克隆到本地后，直接在该目录启动 Claude Code 即可（skill 已随仓库携带）。

### 步骤

**1. 在项目目录中启动 Claude Code**

```bash
cd petit-prince-story
claude
```

Claude 会自动加载 `.claude/skills/petit-prince-story/SKILL.md`，skill 即就绪。

**2. 输入你的 markdown 文档**

```text
把这份 markdown 画成小王子风格的故事分镜
```

粘贴或引用你的 markdown 内容。

**3. 获得分镜**

Claude 会：展示 7 步工作流 → 按章节解析 → 出分镜表（章/角色/金句/寓意）让你确认 → 逐幕生成 SVG → QA 检查 → 合成展示。

### 带参数用法

在对话中自然指定画风、尺寸、合成方式：

| 参数 | 对话示例 |
|------|---------|
| `style` | "用 **watercolor** 水彩画风" |
| `size` | "尺寸改成 **800x600**" |
| `composite` | "合成 **grid** 网格" / "**scroll** 长卷" |

## 画风与参数

| 画风 | 说明 |
|------|------|
| `line`（默认） | 纯描边 `#141414`，仅瞳孔实心，朱砂色 `#C0392B` 点睛 |
| `watercolor` | 同一几何构图 + 柔色填充（沙黄、墨绿、芥末、赭狐） |

| 参数 | 取值 | 默认 |
|------|------|------|
| `style` | `line` / `watercolor` | `line` |
| `size` | `WxH` | `600x800` |
| `composite` | `grid` / `scroll` / `none` | `grid` |

完整示例：

```text
把这份 markdown 用小王子风格画成故事分镜，watercolor 画风，合成 grid
```

### 查看结果

- 单张 SVG 保存到 `assets/illustrations/`
- 合成图保存为 `grid-3x2.svg` 或 `scroll.svg`
- 打开 `gallery.html` 交互浏览：键盘 **← →** 翻页、触摸滑动、自动播放

## Skill 架构

petit-prince-story 是一个 Claude Code skill，采用「主文件 + 参考文件」分层设计：

- **主文件**（`SKILL.md`）— 精简，只放核心定位、参数定义、工作流步骤和输出口径
- **参考文件**（`references/` 下 6 个文件）— 详细内容下沉到独立文件，Claude 按需读取，避免一次塞满上下文

```
.claude/skills/petit-prince-story/
├── SKILL.md                 # 主文件：定位 + 参数 + 工作流 + 输出口径
├── references/
│   ├── svg-style.md         # 画风规则（line/watercolor）+ 配色
│   ├── characters.md        # 6 角色象征 + 决策表 + 统一 SVG 片段
│   ├── composition.md       # 竖卡解剖 + 自适应尺寸 + 合成方式
│   ├── scene-template.svg   # 600×800 骨架模板（带注释）
│   ├── qa-checklist.md      # 必过项 / 失败信号 / 迭代方法
│   └── gallery-template.html# 画廊页面模板
├── scripts/
│   └── generate-scenes-gif.js # SVG → 动画 GIF
└── agents/
    └── openai.yaml          # 跨平台 agent 接口
```

## 角色决策表

| 内容信号词 | 客人 |
|---|---|
| 爱 / 独特 / 珍视 / 骄傲 / 牵挂 | 🌹 玫瑰 |
| 洞察 / 看清 / 责任 / 驯养 / 友谊 | 🦊 狐狸 |
| 叙述 / 童真丧失 / 成人世界 / 回忆 / 坠落 | 👨‍✈️ 飞行员 |
| 生命 / 死亡 / 离别 / 神秘 / 转折 / 谜 | 🐍 蛇 |
| 节奏 / 定时 / 反复 / 值守 / 轮询 | 🪔 点灯人 |
| 旅程 / 探索 / 无强主题 | 王子独行 |


## 六条铁律

1. **语义贴切** — 角色映射准确
2. **构图统一** — 复用王子定义，只换客人 + 标题 + 金句
3. **无重叠** — 王子与客人间距 ≥80px，文字不出框
4. **宁缺毋滥** — 星点 ≤12，不要多余道具
5. **每幕环境唯一** — 相同客人出现多幕时，星空布局、星点坐标、氛围层重新设计
6. **意料之外的吸引** — 每幕提供一个让人"咦？"的视觉收获

## 工作流

0. **流程告知** — 先回复 7 步工作流概览，让用户确认
1. **消化正文** — 按 H2/H3 切章节，决策表选角色，提炼 ≤12 字金句
2. **出分镜表** — 列出每幕角色、金句、寓意，让用户确认结构
3. **生成 SVG** — 套 `scene-template.svg` 骨架，逐幕绘制
4. **QA 检查** — 必过项 / 失败信号逐项过
5. **保存交付** — SVG 存至 `assets/illustrations/`，合成网格 / 长卷
6. **生成画廊** — 输出 `gallery.html` 交互浏览页
7. **（可选）导出 GIF** — 运行脚本生成动画

## 项目结构

```
petit-prince-story/
├── .claude/skills/petit-prince-story/  # skill 核心（见上方架构）
├── assets/illustrations/               # 已生成的分镜 SVG
├── gallery.html                        # 交互式画廊浏览页
├── grid-3x2.svg                        # 网格合成图样例
├── samples/                            # 样例展示
├── package.json                        # 依赖（GIF 生成用）
├── README.md                           # 本文档
└── README.en.md                        # English version
```
