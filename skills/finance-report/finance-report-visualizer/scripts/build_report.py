#!/usr/bin/env python3
"""按周/月/年聚合财务记录，渲染 ECharts HTML 看板。

纯标准库实现。流程：
  1. 调用 parse_stats.parse_dir 读取目录下所有 YYYY-MM-stats.md
  2. 按 周 / 月 / 年 三个维度聚合收入/支出/净利润/三类现金流
  3. 把三维数据一次性嵌入 HTML 模板，前端无刷新切换

用法:
    python build_report.py <data_dir> --template templates/report.html --out report.html
"""
import argparse
import json
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_stats import parse_dir  # noqa: E402

METRICS = ["revenue", "expense", "net_profit", "cf_operating", "cf_investing", "cf_financing"]

# 周维度标签起始：第 1 个周 = 2025-04，之后按月递增（2025-05, 2025-06 ...）
WEEK_LABEL_START = date(2025, 4, 1)


def iso_week_monday(iso_year, iso_week):
    """返回某 ISO 周周一的日期，用于给周排序。"""
    jan4 = date(iso_year, 1, 4)
    monday_w1 = jan4 - timedelta(days=jan4.weekday())
    return monday_w1 + timedelta(weeks=iso_week - 1)


def build_week_label_map(records):
    """按时间顺序把每个 ISO 周映射成连续的 YYYY-MM 标签（从 WEEK_LABEL_START 起）。"""
    weeks = set()
    for rec in records:
        d = date.fromisoformat(rec["date"])
        y, w, _ = d.isocalendar()
        weeks.add((y, w))
    ordered = sorted(weeks, key=lambda yw: iso_week_monday(yw[0], yw[1]))
    mapping = {}
    for i, (y, w) in enumerate(ordered):
        total_months = (WEEK_LABEL_START.year * 12 + (WEEK_LABEL_START.month - 1)) + i
        yr = total_months // 12
        mo = total_months % 12 + 1
        mapping[(y, w)] = f"{yr}-{mo:02d}"
    return mapping


def bucket_of(rec, dim, week_map):
    d = date.fromisoformat(rec["date"])
    if dim == "week":
        y, w, _ = d.isocalendar()
        return week_map.get((y, w), f"{y}-W{w:02d}")
    if dim == "month":
        return f"{d.year}-{d.month:02d}"
    return str(d.year)


def aggregate(records):
    """返回 {week: {...}, month: {...}, year: {...}}。"""
    week_map = build_week_label_map(records)
    result = {}
    for dim in ("week", "month", "year"):
        groups = {}
        for rec in records:
            key = bucket_of(rec, dim, week_map)
            g = groups.setdefault(
                key,
                {
                    "revenue": 0.0,
                    "expense": 0.0,
                    "net_profit": 0.0,
                    "cf_operating": 0.0,
                    "cf_investing": 0.0,
                    "cf_financing": 0.0,
                },
            )
            for m in METRICS:
                g[m] += rec.get(m, 0.0)
        cats = sorted(groups.keys())
        series = {m: [round(groups[c][m], 2) for c in cats] for m in METRICS}
        series["cash_net"] = [
            round(groups[c]["cf_operating"] + groups[c]["cf_investing"] + groups[c]["cf_financing"], 2)
            for c in cats
        ]
        totals = {m: round(sum(series[m]), 2) for m in METRICS}
        totals["cash_net"] = round(sum(series["cash_net"]), 2)
        result[dim] = {"categories": cats, **series, "totals": totals}
    return result


def render(template_path, data, title, out_path):
    with open(template_path, encoding="utf-8") as f:
        html = f.read()
    payload = json.dumps(data, ensure_ascii=False)
    html = html.replace("/*__DATA__*/", payload)
    html = html.replace("/*__TITLE__*/", json.dumps(title, ensure_ascii=False))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)


def main():
    ap = argparse.ArgumentParser(description="生成财务报表 ECharts 看板")
    ap.add_argument("data_dir", help="含 YYYY-MM-stats.md 的目录")
    ap.add_argument("--template", required=True, help="report.html 模板路径")
    ap.add_argument("--out", required=True, help="输出 HTML 路径")
    ap.add_argument("--title", default="财务报表可视化")
    args = ap.parse_args()

    records = parse_dir(args.data_dir)
    if not records:
        print("未解析到任何记录，请检查数据目录与文件命名（应为 YYYY-MM-stats.md）。", file=sys.stderr)
        sys.exit(1)

    data = aggregate(records)
    render(args.template, data, args.title, args.out)
    print(
        f"已生成看板: {args.out}\n"
        f"  周维度 {len(data['week']['categories'])} 项 | "
        f"月维度 {len(data['month']['categories'])} 项 | "
        f"年维度 {len(data['year']['categories'])} 项",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
