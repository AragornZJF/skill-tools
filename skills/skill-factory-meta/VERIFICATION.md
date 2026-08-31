# VERIFICATION — skill-factory

> 日期：2026-08-07（第 2 轮迭代后重新验证）
> 依据：reference/verification-checklist.md 双层门禁

## 变更记录

- 第 2 轮：frontmatter 引号包裹、澄清问题示例、新增第 9 步交付
- 第 3 轮：新增第 6 步"设计整体确认"（整体定稿闸门，确认后才进入实现）——九步改十步
- 第 4 轮：新增"复杂度分级入口"（三问评估）——简单需求走五步快车道，复杂需求走十步全流程
- 第 5 轮：十步全流程简化为七步（澄清+方案合并、分节+写文档合并、plans+实现合并），保留双闸门与双层验证
- 第 6 轮：产物结构调整——01-design/02-plans/03-skill 改为 docs/（日期命名 design/plan）+ skill/

1. frontmatter description 改用单引号包裹（内嵌双引号保持字面），消除严格 YAML 解析器边界风险
2. 第 2 步补充 3 个多选问题模板示例（新鲜代理可直接套用）
3. 新增第 9 步"交付"：产物路径 / 审查要点 / 安装命令 / 后续迭代方式

## Gate 1 · 静态自检 — ✅ 全部通过（重验）

- [x] frontmatter 合法：PyYAML 解析确认仅 name + description 两键（注释被正确忽略）
- [x] description 是触发条件而非流程概述（含触发词）
- [x] description 第三人称
- [x] 目录结构完整：SKILL.md + reference/（本技能无确定性计算/标准输出模板，按决策流无需 scripts/templates/assets）
- [x] SKILL.md 90 行 < 500（变更后）
- [x] 含 Quick Reference 路由表
- [x] 引用文件路径真实存在（find 确认 4 个 reference 文件）
- [x] 分层自检三连通过（无公式、无模板约束格式、高频流程在 SKILL.md / 低频细节在 reference）
- [x] allowed-tools 注释形式给出
- [x] 无辅助文件混入
- [x] 命名合规：skill-factory

## Gate 2 · 实跑试测 — ✅ 通过（走查演练，重验）

- **沙箱**：已刷新为最新版 `_sandbox/skill-factory/`（与正式产物一致）
- **重验点**：
  - 复杂度分级三问可执行：简单需求（如"把XX模板化"）正确路由到五步快车道，指令无歧义
  - 七步流程合并点无歧义：第 2 步（澄清+方案）、第 3 步（分节+增量落盘）、第 5 步（清单+实现）
  - 步骤编号唯一（快车道 1-5 + 七步 1-7），十步引用已清零
  - 第 4 步整体确认与第 3 步逐节确认差异清晰，修订回退指向正确（第 3 步）
  - 产物结构路径一致：docs/（design+plan 日期命名）与 skill/ 引用齐全，旧路径（01-design/02-plans/03-skill）残留清零
  - 第 7 步交付含安装命令（`cp -r output/<技能名>/skill/<skill-name> ~/.agents/skills/`），迭代回退指向正确（第 5 步）

## 已知局限

- 本环境无子代理工具，Gate 2 以"走查演练"替代真实子代理调用
- 建议在真实运行时（pi / Claude Code）以新会话加载本技能，对真实需求做一次端到端确认

## 结论

**验证通过。** 可交付人工审查。沙箱（`output/_sandbox`）与测试样本（`output/_test-sample`）保留供审查，确认后可直接删除。
