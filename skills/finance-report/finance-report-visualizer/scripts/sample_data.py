#!/usr/bin/env python3
"""生成演示用 YYYY-MM-stats.md 财务统计文件，便于首次试用技能。

用法:
    python sample_data.py <out_dir> [--months 2026-01 2026-02 ...]

会在 out_dir 下写出若干 `YYYY-MM-stats.md`，每个文件含一张 Markdown 表格，
字段：日期 | 收入 | 支出 | 经营现金流 | 投资现金流 | 筹资现金流。
数据带轻度随机波动，仅用于演示，不构成真实财务数据。
"""
import argparse
import math
import os
import random
from datetime import date

HEADER = "| 日期 | 收入 | 支出 | 经营现金流 | 投资现金流 | 筹资现金流 |"
SEP = "|------|------|------|-----------|-----------|-----------|"


def days_in_month(y, m):
    if m == 12:
        nxt = date(y + 1, 1, 1)
    else:
        nxt = date(y, m + 1, 1)
    return (nxt - date(y, m, 1)).days


def gen_month(y, m, seed_offset=0):
    rows = [HEADER, SEP]
    random.seed(y * 100 + m + seed_offset)
    for day in range(1, days_in_month(y, m) + 1):
        # 收入按工作日/周末轻微区分，叠加正弦季节波动
        weekday = date(y, m, day).weekday()
        base = 12000 + 4000 * math.sin((m - 1) / 12 * 2 * math.pi)
        rev = base * (1.15 if weekday < 5 else 0.7) + random.uniform(-1500, 1500)
        rev = max(2000, round(rev, -2))
        exp = round(rev * random.uniform(0.55, 0.75), -2)
        cf_op = round(rev - exp + random.uniform(-500, 500), -2)
        cf_inv = round(random.uniform(-3000, 800), -2)  # 投资多为净流出
        cf_fin = round(random.uniform(-1500, 1500), -2)  # 筹资正负不定
        rows.append(f"| {day:02d} | {rev:.0f} | {exp:.0f} | {cf_op:.0f} | {cf_inv:.0f} | {cf_fin:.0f} |")
    return "\n".join(rows) + "\n"


def main():
    ap = argparse.ArgumentParser(description="生成演示用 YYYY-MM-stats.md")
    ap.add_argument("out_dir")
    ap.add_argument("--months", nargs="*", default=None, help="形如 2026-01 的月份列表")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    months = args.months or ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03"]
    for ms in months:
        y, m = ms.split("-")
        y, m = int(y), int(m)
        content = gen_month(y, m)
        path = os.path.join(args.out_dir, f"{ms}-stats.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# {ms} 财务统计\n\n{content}")
        print(f"已生成 {path}", file=__import__("sys").stderr)


if __name__ == "__main__":
    main()
