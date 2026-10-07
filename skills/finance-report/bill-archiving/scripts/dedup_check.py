#!/usr/bin/env python3
"""去重检查脚本：扫描 bills 目录下所有 md 文件，检查转账单号是否已存在。

用法：
    python dedup_check.py <bills_dir> <transfer_id>

输出：
    DUPLICATE  - 该转账单号已存在
    NEW        - 该转账单号不存在（新记录）
"""

import sys
import os
import re
import glob


def check_duplicate(bills_dir, transfer_id):
    """扫描 bills_dir 下所有 .md 文件，检查 transfer_id 是否已存在。

    每日账单 md 文件中，转账单号出现在表格行的最后一列，格式：
    | 14:30 | -128.50 | 张三 货款 | 微信 | 2026081514300567890 |

    扫描所有行，检查最后一列是否包含 transfer_id。
    """
    if not os.path.isdir(bills_dir):
        print("NEW")
        return

    pattern = os.path.join(bills_dir, "**", "*.md")
    md_files = glob.glob(pattern, recursive=True)

    for md_file in md_files:
        # 跳过统计报告文件
        if "stats" in os.path.basename(md_file):
            continue

        try:
            with open(md_file, "r", encoding="utf-8") as f:
                content = f.read()
        except (IOError, UnicodeDecodeError):
            continue

        # 在整个文件内容中搜索转账单号
        if transfer_id in content:
            print("DUPLICATE")
            return

    print("NEW")


def main():
    if len(sys.argv) != 3:
        print("用法: python dedup_check.py <bills_dir> <transfer_id>", file=sys.stderr)
        sys.exit(1)

    bills_dir = sys.argv[1]
    transfer_id = sys.argv[2].strip()

    if not transfer_id:
        print("ERROR: 转账单号为空", file=sys.stderr)
        sys.exit(1)

    check_duplicate(bills_dir, transfer_id)


if __name__ == "__main__":
    main()
