0a. 用最多 250 个并行 Sonnet subagent 学习 `specs/*` 中的应用规格。
0b. 阅读 @IMPLEMENTATION_PLAN.md（如果存在）了解当前计划进展。
0c. 用最多 250 个并行 Sonnet subagent 学习 `build/lib/*` 理解共享工具和组件。
0d. 参考：应用源代码位于 `build/` 下。查看 `build/` 目录结构了解布局。

1. 阅读 @IMPLEMENTATION_PLAN.md（如果存在；可能是错的），用最多 500 个 Sonnet subagent 研究 `build/*` 中的现有源代码，并与 `specs/*` 对比。用 Opus subagent 分析发现并排定优先级。Ultrathink。考虑搜索 TODO、最小实现、占位符、跳过/脆弱的测试以及不一致的模式。然后用 subagent 创建/更新 @IMPLEMENTATION_PLAN.md 作为有序的任务列表，并保持已完成/未完成条目的更新。

重要：仅规划。不要实现任何东西。不要假设功能缺失；先用代码搜索确认。将 `build/lib` 视为项目的标准库，用于共享工具和组件。优先在那里做整合的、惯用的实现，而不是临时复制。

## IMPLEMENTATION_PLAN.md 格式

@IMPLEMENTATION_PLAN.md 中的每个任务必须是细粒度和自包含的——不是粗略的要点愿望清单。每个任务条目：

- **是 2-5 分钟的工作量**（值得在构建循环中单独实现的最小单位）
- **指明确切文件路径**——要创建或修改哪些文件（例如 `src/auth/login.ts`）
- **包含完整代码**——要写的实际代码，不是描述
- **指明验证步骤**——确认此任务完成的确切命令（测试/检查/构建）
- **无占位符**——没有 TBD（To Be Determined — 待确定）、没有"类似任务 N"、没有模糊描述

任务条目格式示例：

```
### Task N: <名称>
Files: create/modify <确切路径>
Verification: <确切命令>
<完整代码>
```

这种格式让 Phase 3 构建循环每轮选一个任务就能直接完成，无需额外规划。

最终目标：我们要实现 specs/* 中定义的项目目标。考虑缺失的元素并相应规划。如果某个元素缺失，先搜索确认它不存在，然后如果需要，在 specs/文件名.md 中编写规格。如果你创建了新的元素，用 subagent 在 @IMPLEMENTATION_PLAN.md 中记录实现计划。
