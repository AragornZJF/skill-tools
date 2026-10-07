#!/usr/bin/env python3
"""月度统计脚本：读取指定月份所有每日 md 文件，解析表格行，计算收支统计。

用法：
    python monthly_stats.py <bills_dir> <year> <month>

输出（JSON 格式）：
    {
      "period": "2026-08",
      "total_count": 15,
      "total_expense": -3250.00,
      "total_income": 5000.00,
      "net_amount": 1750.00,
      "by_payment": [
        {"method": "微信", "count": 8, "amount": -1850.00},
        {"method": "支付宝", "count": 5, "amount": -1400.00},
        {"method": "银行卡", "count": 2, "amount": 5000.00}
      ],
      "daily_records": [
        {"date": "2026-08-01", "count": 2, "amount": -350.00},
        ...
      ]
    }
"""

import sys
import os
import json
import re
import glob
from collections import defaultdict


def parse_daily_file(filepath, file_date=""):
    """解析单个每日 md 文件，提取所有账单记录。

    表格行格式：
    | 14:30 | -128.50 | 张三 货款 | 微信 | 2026081514300567890 |

    file_date: 从文件名提取的日期（如 "2026-08-15"）

    返回记录列表：[{"time": "14:30", "date": "2026-08-15", "amount": -128.50,
                    "payee": "张三 货款", "method": "微信", "id": "..."}, ...]
    """
    records = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except (IOError, UnicodeDecodeError):
        return records

    for line in lines:
        line = line.strip()
        # 匹配表格行：| time | amount | payee | method | id |
        if line.startswith("|") and not line.startswith("|---") and not line.startswith("| 时间"):
            parts = [p.strip() for p in line.split("|")]
            # split 后首尾会有空字符串
            parts = [p for p in parts if p != ""]

            if len(parts) >= 5:
                try:
                    # 尝试解析金额
                    amount_str = parts[1].replace(",", "").replace("￥", "").replace("¥", "").strip()
                    amount = float(amount_str)
                except (ValueError, IndexError):
                    continue

                record = {
                    "time": parts[0],
                    "date": file_date,
                    "amount": amount,
                    "payee": parts[2],
                    "method": parts[3],
                    "id": parts[4],
                }
                records.append(record)

    return records


def calculate_stats(all_records, year, month):
    """计算统计数据。"""
    total_count = len(all_records)
    total_expense = sum(r["amount"] for r in all_records if r["amount"] < 0)
    total_income = sum(r["amount"] for r in all_records if r["amount"] > 0)
    net_amount = total_expense + total_income

    # 按支付方式分组
    by_method = defaultdict(lambda: {"count": 0, "amount": 0.0})
    for r in all_records:
        method = r["method"]
        by_method[method]["count"] += 1
        by_method[method]["amount"] += r["amount"]

    by_payment = [
        {"method": m, "count": v["count"], "amount": round(v["amount"], 2)}
        for m, v in sorted(by_method.items(), key=lambda x: abs(x[1]["amount"]), reverse=True)
    ]

    # 按天分组（使用从文件名提取的日期）
    daily = defaultdict(lambda: {"count": 0, "amount": 0.0})
    for r in all_records:
        date_key = r.get("date", "")
        daily[date_key]["count"] += 1
        daily[date_key]["amount"] += r["amount"]

    daily_records = [
        {"date": d, "count": v["count"], "amount": round(v["amount"], 2)}
        for d, v in sorted(daily.items()) if d
    ]

    return {
        "period": f"{year}-{month:02d}",
        "total_count": total_count,
        "total_expense": round(total_expense, 2),
        "total_income": round(total_income, 2),
        "net_amount": round(net_amount, 2),
        "by_payment": by_payment,
        "daily_records": daily_records,
    }


def main():
    if len(sys.argv) != 4:
        print("用法: python monthly_stats.py <bills_dir> <year> <month>", file=sys.stderr)
        sys.exit(1)

    bills_dir = sys.argv[1]
    year = int(sys.argv[2])
    month = int(sys.argv[3])

    # 构建月度目录路径
    month_dir = os.path.join(bills_dir, f"{year}-{month:02d}")

    if not os.path.isdir(month_dir):
        result = {
            "period": f"{year}-{month:02d}",
            "total_count": 0,
            "total_expense": 0.0,
            "total_income": 0.0,
            "net_amount": 0.0,
            "by_payment": [],
            "daily_records": [],
            "warning": f"目录不存在: {month_dir}"
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # 读取该月所有每日 md 文件（排除 stats 文件）
    pattern = os.path.join(month_dir, "*.md")
    md_files = sorted(glob.glob(pattern))

    all_records = []
    for md_file in md_files:
        if "stats" in os.path.basename(md_file):
            continue
        # 从文件名提取日期（如 2026-08-15.md → 2026-08-15）
        basename = os.path.basename(md_file)
        file_date = basename.replace(".md", "")
        records = parse_daily_file(md_file, file_date)
        all_records.extend(records)

    stats = calculate_stats(all_records, year, month)
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
