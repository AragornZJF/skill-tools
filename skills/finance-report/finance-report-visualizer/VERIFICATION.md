# 验证报告（VERIFICATION）

- 技能：`finance-report-visualizer`
- 验证日期：2026-08-21
- 结论：**验证通过（Gate 1 + Gate 2 双过）**

## Gate 1 · 静态自检
- [x] frontmatter 仅 `name` + `description`；`name` 仅含字母/连字符
- [x] description 为触发条件（含场景 + 触发词），非流程概述，第三人称
- [x] 目录结构完整：SKILL.md + scripts/(parse_stats/build_report/sample_data) + templates/ + reference/
- [x] SKILL.md < 500 行，含 Quick Reference 路由表
- [x] 引用路径真实存在（scripts / templates / reference 均核对）
- [x] 分层：计算在 scripts、格式在 templates、规范在 reference，无公式留在 SKILL.md
- [x] allowed-tools 以注释给出
- [x] 无 README/CHANGELOG 等辅助文件混入技能目录
- [x] 命名合规：动词化 `finance-report-visualizer`

## Gate 2 · 实跑试测
环境：Python 3.13（标准库，无第三方依赖）。

**场景 A · 主路径（5 个月演示数据）**
1. `sample_data.py` 生成 `2025-11`~`2026-03` 共 5 个 `YYYY-MM-stats.md`。
2. `parse_stats.py` 解析出 **151 条**记录（30+31+31+28+31=151，与日历一致）。
3. `build_report.py` 生成 `report.html`：周 23 项 / 月 5 项 / 年 2 项。
4. HTML 无 `/*__DATA__*/`、`/*__TITLE__*/` 占位符残留；内联 JSON 含 week/month/year 三维。
5. 交叉校验：全量求和 收入 1,841,800 / 支出 1,189,300 / 净利润 652,500 / 现金净流量 489,900，与月维度 `totals` 完全一致 ✅

**场景 B · 边界（最小两列表格）**
- 仅含 `日期 | 收入 | 支出`，无现金流列。
- 结果：净利润自动派生为 收入−支出（=10,000）；三类现金流及现金净流量全部降级为 0 ✅
- 无报错，看板正常生成。

## 使用方式
```bash
cd <技能目录>
# 生成演示数据（可选）
python scripts/sample_data.py ./demo_data --months 2026-01 2026-02 2026-03
# 解析校验
python scripts/parse_stats.py ./demo_data
# 生成看板
python scripts/build_report.py ./demo_data --template templates/report.html --out ./report.html --title "我的财务报表"
```
浏览器打开 `report.html`，用顶部「按周 / 按月 / 按年」切换维度。

## 已知约束
- 文件名须严格为 `YYYY-MM-stats.md`。
- 看板依赖 ECharts CDN（jsdelivr），离线环境需替换为本地 `echarts.min.js`。
- 解析器纯标准库，运行需 Python 3。
