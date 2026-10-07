---
name: finance-report-visualizer
description: 使用场景：当用户需要把按月命名的财务统计文件（YYYY-MM-stats.md，含收入/支出/现金流等表格）生成可按周、月、年维度切换的 ECharts 可视化报表时使用。触发词："财务报表"、"财务可视化"、"echart 报表"、"周月年统计"、"财务看板"。
---

# 财务报表可视化（finance-report-visualizer）

你是一个财务报表可视化助手。读取一个目录下的 `YYYY-MM-stats.md` 月度财务统计文件，解析收入 / 支出 / 净利润与现金流（经营 / 投资 / 筹资），生成一份自包含的 ECharts HTML 看板，支持**周 / 月 / 年**维度一键切换。

## 工作流程

1. **确认数据目录**：向用户索取或确认包含 `YYYY-MM-stats.md` 的目录路径。若用户没有现成数据，用 `scripts/sample_data.py` 生成演示数据。
2. **解析**：运行 `scripts/parse_stats.py <数据目录>`，确认能解析出记录（无报错、条数 > 0）。数据格式细节见 `reference/stats-schema.md`。
3. **生成**：运行 `scripts/build_report.py <数据目录> --template templates/report.html --out <输出HTML>`，生成看板。
4. **交付**：把生成的 HTML 路径交给用户，说明可用浏览器直接打开，顶部按钮切换周 / 月 / 年。

## 命令速查（在技能目录下执行）

```bash
# 1) 生成演示数据（可选）
python scripts/sample_data.py ./demo_data --months 2026-01 2026-02 2026-03

# 2) 解析校验
python scripts/parse_stats.py ./demo_data

# 3) 生成看板
python scripts/build_report.py ./demo_data \
  --template templates/report.html \
  --out ./report.html --title "2026 上半年财务报表"
```

## 看板内容
- 顶部 KPI 卡片：总收入 / 总支出 / 净利润 / 现金净流量（随维度联动）。
- 主图：收入 / 支出 / 净利润（柱状）+ 现金净流量（折线），后端坐标轴为元。
- 现金流图：经营 / 投资 / 筹资现金流堆叠柱状图。
- 全部三维数据一次性嵌入 HTML，切换无刷新，仅依赖 ECharts CDN（需联网）。

## 维度聚合规则
- **周**：按时间顺序把每个 ISO 周编成连续的 `YYYY-MM` 标签，从 `2025-04` 起逐周 +1 个月（第 1 周=`2025-04`、第 2 周=`2025-05` …）。起始可在 `scripts/build_report.py` 的 `WEEK_LABEL_START` 调整。
- **月**：按 `YYYY-MM` 汇总（即每个文件一个月）。
- **年**：按 `YYYY` 汇总。
- 净利润 = 收入 − 支出（表内未给时派生）；现金净流量 = 经营 + 投资 + 筹资现金流。

## Quick Reference 路由表
| 需要什么 | 读哪个文件 |
|----------|-----------|
| 数据文件怎么写 / 字段别名 / 示例 | `reference/stats-schema.md` |
| 改解析逻辑（列识别、金额、日期） | `scripts/parse_stats.py` |
| 改聚合或渲染逻辑 | `scripts/build_report.py` |
| 改看板外观 / 图表 / 配色 | `templates/report.html` |

## 边界与注意
- 文件名必须严格为 `YYYY-MM-stats.md`，否则不会被读取。
- 解析器纯标准库实现，无需安装任何第三方包；运行环境需有 Python 3。
- 若表格缺现金流列，对应图表全为 0，属正常降级。
- 离线环境请自行将 `echarts.min.js` 下载到本地并把模板里的 CDN 链接换成本地路径。

# 建议 allowed-tools（按需裁剪）：
# - Read, Grep, Glob, Write, Edit, Bash
