# Skill 编写标准（skill-standards）

> 生成技能的 SKILL.md 与 frontmatter 时按需阅读。来源：agentskills.io 规范 + writing-skills SDO 要点。

## 1. Frontmatter

- 仅两个字段：`name` + `description`（最多 1024 字符）。
- `name`：只含字母、数字、连字符（无括号、无特殊字符）。
- 不要加入其他字段；`allowed-tools` 以注释形式给出建议。

## 2. description = 触发条件，不是流程概述

**这是最重要的规则。** description 只描述"何时使用"，**绝不概述技能的工作流程**——否则代理会只跟 description 走而跳过正文。

```yaml
# ❌ 坏：概述流程（代理会照此执行而跳过正文）
description: 使用场景：按计划执行任务时，为每个任务派发子代理并在任务间做代码审查

# ❌ 坏：过多过程细节
description: 用于 TDD——先写测试、看它失败、写最小代码、重构

# ✅ 好：只写触发条件
description: 使用场景：当需要按实现计划执行独立任务时使用

# ✅ 好：触发条件 + 症状
description: 使用场景：当测试存在竞态条件、时序依赖或通过/失败不一致时使用
```

**写法模板（中文）：**
```
使用场景：当用户[具体场景/症状]时使用。触发词：[关键词1]、[关键词2]、[关键词3]。
```

## 3. description 内容要求

- 第三人称（会被注入系统提示）。
- 具体触发词、症状、情境：错误信息、症状、同义词、工具名、文件类型。
- 技术无关的触发词保持技术无关；技能本身技术相关则明确写出。
- 例：`description: 使用场景：当用户要求创建、设计或生成 Skill 时使用。触发词："造个skill"、"创建技能"、"把XX做成skill"。`

## 4. 命名

- 动词开头 / 动名词，描述"做什么"：
  - ✅ `creating-skills`、`condition-based-waiting`、`debugging-with-logs`
  - ❌ `skill-creation`、`async-test-helpers`（名词化、含糊）
- 用核心洞察命名：`root-cause-tracing` > `debugging-techniques`。

## 5. SKILL.md 正文

- <500 行；频繁加载的技能更短（<200 行目标）。
- 祈使句（imperative form）。
- 语义化命名 / 意图驱动：写"你是一个财务分析师"，不写"执行步骤 1-2-3"。
- 一个技能只管一件事（SRP）。
- 渐进式披露：
  - Quick Reference 路由表放 SKILL.md（何时读哪个 reference）；
  - 细节下沉 reference/（超 100 行带目录）；
  - 不重复已在 reference 中的内容。
- 代码示例：一个高质量可运行示例 > 多个平庸示例；不做多语言稀释。

## 6. 不要包含的辅助文件

生成的技能**不包含**：README.md、INSTALLATION_GUIDE.md、QUICK_REFERENCE.md、CHANGELOG.md 等。技能只含干活所需信息。

## 7. allowed-tools（注释形式）

```yaml
# 建议 allowed-tools（按需裁剪）：
# - Read, Grep, Glob, Write, Edit, Bash
```

权限最小化：只给干活需要的工具。审计类技能不给写权限；生成类技能不给修改权限。
