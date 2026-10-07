# VERIFICATION — gtd-triage

日期：2026-10-06
验证级别：Gate 1 静态自检（快车道五步，Gate 2 实跑未执行）

## 检查项

| 检查项 | 结果 |
|---|---|
| frontmatter 仅含 name + description | ✅ |
| description 含「做什么」+「何时触发」（帮我整理任务/处理待办/分诊待办/这些事怎么安排/周回顾/倾倒多条杂事） | ✅ |
| 正文指令为祈使句 | ✅ |
| 正文 < 500 行（实际约 60 行） | ✅ |
| 决策流四问：无确定性计算（不需要 scripts/）；输出格式已内联正文（不需要 templates/）；知识量远小于 500 行（不需要 reference/）；无危险操作（不需要 allowed-tools） | ✅ |
| 无冗余文件（无 README/CHANGELOG 等），仅 SKILL.md + 本报告 | ✅ |
| 防重名：已安装技能列表与 output/ 均无 GTD/任务分诊类技能 | ✅（注：`~/.agents/skills/` 目录本身受权限限制未能直接列出，以当前会话已加载技能列表为准） |
| 图源一致性：八分类与流程图逐一对应（Trash→丢弃、Reference→参考、Someday→将来也许、Project Planning→立项拆解、DO IT→立刻做、Calendar→日历、Hotlist→热区清单、Waiting→等待） | ✅ |

## 未做项与建议

- Gate 2 实跑试测未执行：快车道不强制。建议安装后用 3-5 条真实待办试跑一轮，观察：是否逐条分类、信息不足时是否追问、输出是否符合表格格式。
- 后续迭代：实跑中发现指令缺口，回到实现步补 SKILL.md 对应段落即可。
