#!/usr/bin/env python3
"""解析目录下 YYYY-MM-stats.md 财务统计文件，输出结构化记录 JSON。

纯标准库实现，无第三方依赖，便于安装到任意应用环境。
用法:
    python parse_stats.py <data_dir> [--out records.json]
"""
import argparse
import json
import os
import re
import sys
from datetime import date

# 仅匹配 YYYY-MM-stats.md
FILE_RE = re.compile(r"^(\d{4})-(\d{2})-stats\.md$")

# 列名 → 记录字段（支持中英文别名，精确优先、子串兜底）
COLUMN_MAP = [
    ("date", ["日期", "date", "时间"]),
    ("revenue", ["收入", "营收", "revenue", "sales"]),
    ("expense", ["支出", "成本", "费用", "expense", "cost"]),
    ("net_profit", ["净利润", "利润", "netprofit", "net"]),
    ("cf_operating", ["经营现金流", "经营活动现金流", "operating"]),
    ("cf_investing", ["投资现金流", "投资活动现金流", "investing"]),
    ("cf_financing", ["筹资现金流", "筹资活动现金流", "financing"]),
]


def split_row(line):
    """把 `| a | b |` 这样的行拆成单元格列表。"""
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def find_columns(header_cells):
    """返回 {field: index}。先精确匹配，再子串兜底。"""
    norm = [c.strip() for c in header_cells]
    lower_norm = [n.lower() for n in norm]
    mapping = {}

    # 第一遍：精确相等
    for field, aliases in COLUMN_MAP:
        for i, name in enumerate(lower_norm):
            if name in [al.lower() for al in aliases]:
                mapping[field] = i
                break
    # 第二遍：子串（仅补缺失，且别名长度 >= 2 防误伤）
    for field, aliases in COLUMN_MAP:
        if field in mapping:
            continue
        for i, name in enumerate(lower_norm):
            if any(al.lower() in name for al in aliases if len(al) >= 2):
                mapping[field] = i
                break
    return mapping


def to_number(s):
    """宽松解析金额：去逗号/货币符号，括号表示负数，空值记 0。"""
    if s is None:
        return 0.0
    s = str(s).strip().replace(",", "").replace("，", "")
    if s in ("", "-", "—", "N/A", "na", "无", "元", "¥"):
        return 0.0
    neg = False
    if s.startswith("(") and s.endswith(")"):
        neg = True
        s = s[1:-1]
    s = s.replace("%", "").replace("¥", "").replace("元", "").replace("$", "").strip()
    if s in ("", "-"):
        return 0.0
    try:
        v = float(s)
    except ValueError:
        return 0.0
    return -v if neg else v


def resolve_date(raw, year, month):
    """把单元格里的日期解析为 date，按文件名年月补齐。"""
    raw = raw.strip()
    m = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$", raw)
    if m:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    m = re.match(r"^(\d{1,2})[-/](\d{1,2})$", raw)
    if m:
        return date(year, month, int(m.group(1)))
    m = re.match(r"^(\d{1,2})$", raw)
    if m:
        return date(year, month, int(m.group(1)))
    return date(year, month, 1)


def parse_file(path, year, month):
    """解析单个 YYYY-MM-stats.md，返回记录列表。"""
    records = []
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    table_start = None
    for i, line in enumerate(lines):
        if line.strip().startswith("|"):
            table_start = i
            break
    if table_start is None:
        return records

    header = split_row(lines[table_start])
    cols = find_columns(header)
    if "date" not in cols:
        return records
    max_idx = max(cols.values())

    for line in lines[table_start + 1:]:
        s = line.strip()
        if not s.startswith("|"):
            continue
        cells = split_row(s)
        if all(set(c) <= set("-: ") for c in cells):  # 分隔行 |---|---|
            continue
        if len(cells) <= max_idx:
            continue

        d = resolve_date(cells[cols["date"]], year, month)
        rec = {
            "date": d.isoformat(),
            "revenue": to_number(cells[cols["revenue"]]) if "revenue" in cols else 0.0,
            "expense": to_number(cells[cols["expense"]]) if "expense" in cols else 0.0,
            "cf_operating": to_number(cells[cols["cf_operating"]]) if "cf_operating" in cols else 0.0,
            "cf_investing": to_number(cells[cols["cf_investing"]]) if "cf_investing" in cols else 0.0,
            "cf_financing": to_number(cells[cols["cf_financing"]]) if "cf_financing" in cols else 0.0,
        }
        rec["net_profit"] = (
            to_number(cells[cols["net_profit"]])
            if "net_profit" in cols
            else rec["revenue"] - rec["expense"]
        )
        records.append(rec)
    return records


def parse_dir(data_dir):
    """解析目录下所有 YYYY-MM-stats.md，返回按日期排序的记录列表。"""
    all_records = []
    if not os.path.isdir(data_dir):
        raise NotADirectoryError(f"数据目录不存在: {data_dir}")
    for name in sorted(os.listdir(data_dir)):
        m = FILE_RE.match(name)
        if not m:
            continue
        year, month = int(m.group(1)), int(m.group(2))
        all_records.extend(parse_file(os.path.join(data_dir, name), year, month))
    all_records.sort(key=lambda r: r["date"])
    return all_records


def main():
    ap = argparse.ArgumentParser(description="解析 YYYY-MM-stats.md 财务统计文件")
    ap.add_argument("data_dir", help="含 YYYY-MM-stats.md 的目录")
    ap.add_argument("--out", help="输出 JSON 路径，默认打印到 stdout")
    args = ap.parse_args()

    records = parse_dir(args.data_dir)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"已解析 {len(records)} 条记录 -> {args.out}", file=sys.stderr)
    else:
        print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
