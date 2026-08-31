# 提示词框架速查（14 个）

> 生成 SKILL.md 正文指令时按需阅读。来源：prompt-framework.md。

## 速查表

| 框架 | 全称 | 一句话用途 | 核心组件 |
|---|---|---|---|
| RTF | Role, Task, Format | 入门级三件套：角色+任务+输出格式 | 角色 / 任务 / 格式 |
| APE | Action, Purpose, Expectation | 侧重行动与意图，让 AI 理解"为什么" | 行动 / 目的 / 期望 |
| CARE | Context, Action, Result, Example | 提供完整上下文与范例，精确输出 | 背景 / 行动 / 结果 / 示例 |
| RACE | Role, Action, Context, Expectation | RTF 扩展，加入更丰富上下文 | 角色 / 行动 / 背景 / 期望 |
| TRACE | Task, Request, Action, Context, Examples | 详尽框架，适合复杂多步推理 | 任务 / 请求 / 行动 / 背景 / 示例 |
| ROSES | Role, Objective, Scenario, Expected Solution, Steps | 面向问题解决场景 | 角色 / 目标 / 场景 / 期望方案 / 步骤 |
| CO-STAR | Context, Objective, Style, Tone, Audience, Response Format | 内容创作与文案，关注风格与受众 | 背景 / 目标 / 风格 / 语调 / 受众 / 响应格式 |
| TAG | Task, Action, Goal | 简洁目标驱动 | 任务 / 行动 / 目标 |
| ERA | Expectation, Role, Action | 期望置首，优先理解目标 | 期望 / 角色 / 行动 |
| RISE | Role, Input, Steps, Expectation | 处理给定输入并按步骤执行 | 角色 / 输入 / 步骤 / 期望 |
| ICIO | Instruction, Context, Input, Output | 适合链式思考与少样本学习 | 指令 / 背景 / 输入 / 输出 |
| COAST | Context, Objective, Actions, Scenario, Task | 全面框架，情境+目标+任务 | 背景 / 目标 / 行动 / 场景 / 任务 |
| CBR | Context, Background, Request | 请求前充分铺垫背景 | 背景 / 前提 / 请求 |
| 三段式提示词 | 角色/前提 + 任务/要求 + 示例/格式 | 结构化提示词的起点 | 角色前提 / 任务要求 / 示例格式 |

## 选框架指南

生成 SKILL.md 正文指令时，按需求类型选择：

| 需求类型 | 推荐框架 |
|---|---|
| 多步骤流程类技能 | TRACE、RISE（步骤清晰可执行） |
| 角色扮演/专家身份类 | RTF、ROSES |
| 内容创作/文案类 | CO-STAR |
| 简单任务/轻量指令 | TAG、APE |
| 需要示例锚定的输出 | CARE、ICIO、三段式提示词 |

## 使用要点

- 三段式提示词是最佳起点：设定背景 → 下达指令 → 规定输出。
- 正文用祈使句；语义化命名（"你是一个财务分析师"）而非机械步骤编号。
- 框架是参考不是枷锁——正文以可执行为先，不必机械套满所有组件。
