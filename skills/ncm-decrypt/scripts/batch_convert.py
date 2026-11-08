# -*- coding: utf-8 -*-
"""Batch NCM converter with automatic output validation.

Scans a folder for *.ncm files, converts each one, validates the output,
classifies the result and writes a plain-text report.

Usage:
    python batch_convert.py [folder] [--overwrite] [--report PATH]

Result classes:
    OK    converted + validation VALID
    WARN  converted but validation SUSPECT/INVALID (check manually)
    FAIL  conversion raised an error (reason in report)
    SKIP  output already exists (use --overwrite to redo)
"""
import argparse
import datetime
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ncm_convert            # noqa: E402
import validate_mp3 as V      # noqa: E402

STATUS_ICON = {"OK": "[OK]  ", "WARN": "[WARN]", "FAIL": "[FAIL]", "SKIP": "[SKIP]"}


def main() -> int:
    ap = argparse.ArgumentParser(description="Batch convert NCM files with validation")
    ap.add_argument("folder", nargs="?", default=".", help="folder to scan (default: current)")
    ap.add_argument("--overwrite", action="store_true", help="redo even if output exists")
    ap.add_argument("--report", default=None, help="report path (default: <folder>/batch_report.txt)")
    args = ap.parse_args()

    folder = os.path.abspath(args.folder)
    if not os.path.isdir(folder):
        print("not a folder:", folder)
        return 2

    ncm_files = sorted(fn for fn in os.listdir(folder) if fn.lower().endswith(".ncm"))
    print("scanned %d .ncm file(s) in %s" % (len(ncm_files), folder))

    rows = []
    counts = {"OK": 0, "WARN": 0, "FAIL": 0, "SKIP": 0}
    for fn in ncm_files:
        path = os.path.join(folder, fn)
        stem = os.path.splitext(path)[0]
        existing = [stem + ext for ext in (".mp3", ".flac") if os.path.exists(stem + ext)]
        if existing and not args.overwrite:
            rows.append((fn, "SKIP", "", "", "output exists: %s" % os.path.basename(existing[0])))
            counts["SKIP"] += 1
            continue
        try:
            r = ncm_convert.convert(path)
        except Exception as e:
            rows.append((fn, "FAIL", "", "", "%s: %s" % (type(e).__name__, e)))
            counts["FAIL"] += 1
            traceback.print_exc()
            continue
        v = V.validate_file(r["out"])
        status = "OK" if v["verdict"] == "VALID" else "WARN"
        info = "%s | %s | %s" % (v["verdict"], v.get("format", "?"), v["reason"])
        rows.append((fn, status, os.path.basename(r["out"]),
                     "%.2fMB" % (r["size"] / 1048576), info))
        counts[status] += 1
        if r["cover"]:
            print("  cover saved:", os.path.basename(r["cover"]))

    # console summary
    print()
    print("%-6s %-40s %-42s %s" % ("status", "source", "output", "note"))
    for fn, st, out, size, note in rows:
        print("%-6s %-40s %-42s %s %s" % (STATUS_ICON[st], fn[:40], out[:42], size, note))
    print()
    print("summary: OK=%d WARN=%d FAIL=%d SKIP=%d" %
          (counts["OK"], counts["WARN"], counts["FAIL"], counts["SKIP"]))

    # report file
    report = args.report or os.path.join(folder, "batch_report.txt")
    with open(report, "w", encoding="utf-8") as f:
        f.write("NCM batch report  %s\n" % datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        f.write("folder: %s\n" % folder)
        f.write("-" * 100 + "\n")
        for fn, st, out, size, note in rows:
            f.write("%-5s | %-50s | %-45s | %-8s | %s\n" % (st, fn, out, size, note))
        f.write("-" * 100 + "\n")
        f.write("summary: OK=%d WARN=%d FAIL=%d SKIP=%d\n" %
                (counts["OK"], counts["WARN"], counts["FAIL"], counts["SKIP"]))
    print("report written:", report)

    return 0 if counts["FAIL"] == 0 and counts["WARN"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
