0a. 用最多 500 个并行 Sonnet subagent 学习 `specs/*` 中的应用规格。
0b. 阅读 @IMPLEMENTATION_PLAN.md。
0c. 参考：应用源代码位于 `build/` 下。查看 `build/` 目录结构了解布局。

1. 你的任务是用并行 subagent 按规格实现功能。遵循 @IMPLEMENTATION_PLAN.md 选择最重要的条目来处理。在改动之前，用 Sonnet subagent 搜索代码库（不要假设没有实现）。最多可用 500 个并行 Sonnet subagent 做搜索/读取，仅用 1 个 Sonnet subagent 做构建/测试。需要复杂推理时（调试、架构决策）使用 Opus subagent。
2. 实现功能或解决问题后，运行被你改动的那个单元的测试。如果功能缺失，你的工作就是按应用规格补充它。Ultrathink。
3. 当发现问题时，立即用 subagent 将发现更新到 @IMPLEMENTATION_PLAN.md。解决后，更新并移除该条目。
4. 测试通过后，更新 @IMPLEMENTATION_PLAN.md，然后 `git add -A`，然后 `git commit` 附带描述改动的消息。提交后 `git push`。

99999. 重要：编写文档时，记录为什么这样做——测试和实现的重要性。
999999. 重要：单一事实来源，不要迁移/适配器。如果与你工作无关的测试失败，把它们作为增量的一部分一并解决。
9999999. 一旦没有构建或测试错误，就创建一个 git tag。如果没有 git tag，从 0.0.0 开始，补丁号递增 1，例如 0.0.1（如果 0.0.0 不存在）。
99999999. 如果需要调试问题，可以添加额外的日志。
999999999. 用 subagent 保持 @IMPLEMENTATION_PLAN.md 与最新发现同步——未来工作依赖它来避免重复劳动。尤其在你的轮次结束后要更新。
9999999999. 当你学到关于如何运行应用的新知识时，用 subagent 更新 @AGENTS.md，但保持简洁。例如，如果你多次运行命令才找到正确的命令，就应该更新该文件。
99999999999. 对于你注意到的任何 bug，用 subagent 解决它们或在 @IMPLEMENTATION_PLAN.md 中记录，即使与当前工作无关。
999999999999. 完整实现功能。占位符和桩代码浪费精力和时间重复做同样的工作。
9999999999999. 当 @IMPLEMENTATION_PLAN.md 变得很大时，用 subagent 定期清理其中已完成的条目。
99999999999999. 如果在 specs/* 中发现不一致，使用 Opus 4.5 subagent 请求 'ultrathink' 来更新 specs。
999999999999999. 重要：保持 @AGENTS.md 仅含操作性内容——状态更新和进度记录属于 `IMPLEMENTATION_PLAN.md`。臃肿的 AGENTS.md 会污染每个未来循环的上下文。
