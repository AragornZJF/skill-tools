# Auto-Skill Forge

一个用于创建**自进化 Skill** 的元 Skill（meta-skill）。

本工具不仅可以帮助你快速生成新的 AI Skill，还会为每个生成的 Skill 内置一套自我进化机制，使其能够在使用过程中不断反思、学习和改进。

---

## 目录

- [功能概述](#功能概述)
- [快速开始](#快速开始)
  - [创建一个新的自进化 Skill](#创建一个新的自进化-skill)
  - [为已有 Skill 添加自进化能力](#为已有-skill-添加自进化能力)
- [目录结构](#目录结构)
- [脚本说明](#脚本说明)
  - [forge_new.py](#forge_newpy)
  - [bootstrap_evolution.py](#bootstrap_evolutionpy)
  - [evolve/ 目录](#evolve-目录)
- [自进化生命周期](#自进化生命周期)
- [元进化：改进 Forge 本身](#元进化改进-forge-本身)
- [安全规则](#安全规则)
- [贡献与扩展](#贡献与扩展)

---

## 功能概述

`auto-skill-forge` 提供两种核心能力：

1. **从零创建 Skill**：通过简单的命令行参数生成一个完整的、可自进化的 Skill。
2. **为已有 Skill 注入进化能力**：在现有 Skill 目录中追加进化引擎和日志系统，无需重写原有逻辑。

每个生成的 Skill 都会包含：

- 一份标准的 `SKILL.md` 说明文档
- 一套 `scripts/evolve/` 进化引擎脚本
- `references/` 目录下的进化日志和版本日志

---

## 快速开始

### 创建一个新的自进化 Skill

```bash
python scripts/forge_new.py \
  --name "my-awesome-skill" \
  --description "当用户说 X 时，执行 Y" \
  --instructions "这是 Skill 的核心执行指令..." \
  --output-dir "/path/to/your/skills"
```

执行后会在输出目录下创建 `my-awesome-skill/`，包含完整的 Skill 文件结构。

### 为已有 Skill 添加自进化能力

```bash
python scripts/bootstrap_evolution.py --skill-path /path/to/existing-skill
```

该命令会：

- 在 `scripts/evolve/` 下注入进化脚本
- 在 `references/` 下创建日志文件
- 在 `SKILL.md` 末尾追加自进化说明（如果还没有的话）
- 不会覆盖已有文件

---

## 目录结构

```text
auto-skill-forge/
├── SKILL.md                          # Skill 核心定义（给 AI 使用）
├── README.md                         # 本文件（给开发者/人类使用）
├── scripts/                          # 锻造器脚本
│   ├── forge_new.py                  # 创建新 Skill
│   ├── bootstrap_evolution.py        # 为已有 Skill 注入进化能力
│   └── evolve/                       # （可选）锻造器自身的进化引擎
├── templates/                        # 模板文件
│   ├── self-evolving-skill.md        # 新 Skill 的 SKILL.md 模板
│   └── evolution-scripts/            # 进化引擎脚本模板
│       ├── reflect.py
│       ├── record_learning.py
│       ├── apply_change.py
│       └── version_bump.py
├── references/                       # 锻造器自身的进化日志
└── evals/                            # 评估/测试用例
```

---

## 脚本说明

### forge_new.py

用于从零生成一个自进化 Skill。

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `--name` | 是 | Skill 名称，建议使用 kebab-case |
| `--description` | 是 | Skill 的触发描述，会写入 YAML frontmatter |
| `--instructions` | 是 | Skill 的核心执行指令 |
| `--output-dir` | 是 | 输出目录 |
| `--custom-scripts-dir` | 否 | 自定义脚本目录，会复制到生成的 Skill 中 |

**示例：**

```bash
python scripts/forge_new.py \
  --name "email-drafter" \
  --description "当用户要求写邮件时触发" \
  --instructions "根据用户提供的要点，撰写正式、简洁的商务邮件。" \
  --output-dir "C:\Users\zhangjiangfeng\.workbuddy\skills"
```

### bootstrap_evolution.py

用于给已有 Skill 添加自进化能力。

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `--skill-path` | 是 | 已有 Skill 的目录路径 |

**示例：**

```bash
python scripts/bootstrap_evolution.py --skill-path "C:\Users\zhangjiangfeng\.workbuddy\skills\my-old-skill"
```

### evolve/ 目录

每个生成的 Skill 都会包含以下进化脚本：

| 脚本 | 作用 |
|------|------|
| `reflect.py` | 引导对刚完成的任务进行反思 |
| `record_learning.py` | 将学习到的经验记录到 `references/evolution-log.jsonl` |
| `apply_change.py` | 在获得用户确认后，安全地修改 Skill 文件 |
| `version_bump.py` | 升级 Skill 版本号并记录原因 |

---

## 自进化生命周期

每个生成的 Skill 在完成任务后，会进入以下自进化循环：

```text
任务完成 → 反思 → 记录 → 评估 → 提议 → 用户确认 → 应用 → 升级版本
```

1. **Reflect（反思）**：回答"哪里做得好？哪里做得不好？学到了什么？"
2. **Record（记录）**：用 `record_learning.py` 把经验写入日志
3. **Evaluate（评估）**：判断这次经验是否值得永久修改 Skill
4. **Propose（提议）**：向用户展示 diff，解释修改原因
5. **Apply（应用）**：用户确认后，用 `apply_change.py` 修改文件
6. **Version（升级版本）**：用 `version_bump.py` 更新版本号

---

## 元进化：改进 Forge 本身

当你用 `auto-skill-forge` 创建了多个 Skill 后，可能会发现一些通用规律或改进点。你可以反过来改进锻造器本身：

1. 在 `references/meta-evolution-log.jsonl` 中记录洞察
2. 改进模板 `templates/self-evolving-skill.md`
3. 改进进化脚本 `templates/evolution-scripts/`
4. 提升 `auto-skill-forge` 自身的版本号

---

## 安全规则

为了降低自进化带来的风险，所有生成的 Skill 都遵循以下规则：

- 绝不删除 YAML frontmatter 中的 `name` 和 `description`
- 优先追加新内容，而不是修改已有内容
- 单次进化不修改超过一个文件的 30%
- 应用任何改动前必须获得用户明确确认
- 生成的 Skill 只能修改自己目录下的文件

---

## 贡献与扩展

如果你想扩展 `auto-skill-forge` 的能力，可以考虑：

- 在 `templates/evolution-scripts/` 中添加更智能的反思/评估脚本
- 在 `evals/` 中添加标准化测试用例
- 改进 `templates/self-evolving-skill.md` 模板，使其支持更多 Skill 类型
- 为 `forge_new.py` 增加更多命令行选项（如作者、许可证、依赖等）

---

**版本：** 0.1.0  
**用途：** 创建会自我进化的 AI Skill
