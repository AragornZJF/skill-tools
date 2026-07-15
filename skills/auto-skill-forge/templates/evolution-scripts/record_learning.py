"""
record_learning.py  Record a learning entry to evolution-log.jsonl.

Usage:
    python scripts/evolve/record_learning.py \
        --category <category> \
        --summary "One-line summary" \
        --detail "Detailed description"

Categories: bugfix, discovery, optimization, pattern, failure, enhancement
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone


SKILL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EVOLUTION_LOG = os.path.join(SKILL_DIR, "references", "evolution-log.jsonl")

CATEGORIES = {"bugfix", "discovery", "optimization", "pattern", "failure", "enhancement"}


def get_current_version() -> str:
    skill_path = os.path.join(SKILL_DIR, "SKILL.md")
    if not os.path.isfile(skill_path):
        return "0.0.0"
    with open(skill_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("version:"):
                return line.split(":", 1)[1].strip().strip('"').strip("'")
    return "0.0.0"


def main():
    parser = argparse.ArgumentParser(description="Record a learning entry")
    parser.add_argument("--category", required=True, help=f"One of: {', '.join(sorted(CATEGORIES))}")
    parser.add_argument("--summary", required=True, help="One-line summary")
    parser.add_argument("--detail", required=True, help="Detailed description")
    parser.add_argument("--action", default="", help="What change this learning suggests (optional)")
    args = parser.parse_args()

    if args.category not in CATEGORIES:
        print(f"ERROR: Invalid category '{args.category}'. Choose from: {', '.join(sorted(CATEGORIES))}", file=sys.stderr)
        sys.exit(1)

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": get_current_version(),
        "category": args.category,
        "summary": args.summary,
        "detail": args.detail,
    }
    if args.action:
        entry["action_taken"] = args.action

    os.makedirs(os.path.dirname(EVOLUTION_LOG), exist_ok=True)

    with open(EVOLUTION_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f" Learning recorded [{args.category}]: {args.summary}")


if __name__ == "__main__":
    main()
