"""
version_bump.py  Bump version in SKILL.md frontmatter and log to version-log.jsonl.

Usage:
    python scripts/evolve/version_bump.py --type patch|minor|major --reason "Why this change"

Version scheme: MAJOR.MINOR.PATCH
- patch: bugfixes, small tweaks (0.1.0  0.1.1)
- minor: new features, significant improvements (0.1.0  0.2.0)
- major: breaking changes, rewrites (0.1.0  1.0.0)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone


SKILL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SKILL_PATH = os.path.join(SKILL_DIR, "SKILL.md")
VERSION_LOG = os.path.join(SKILL_DIR, "references", "version-log.jsonl")


def read_current_version() -> str:
    if not os.path.isfile(SKILL_PATH):
        print(f"ERROR: SKILL.md not found at {SKILL_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(SKILL_PATH, "r", encoding="utf-8") as f:
        for line in f:
            m = re.match(r'^version:\s*"?(\d+\.\d+\.\d+)"?\s*$', line)
            if m:
                return m.group(1)

    print("ERROR: Could not find 'version:' field in SKILL.md frontmatter", file=sys.stderr)
    sys.exit(1)


def bump_version(current: str, bump_type: str) -> str:
    parts = [int(x) for x in current.split(".")]
    if bump_type == "major":
        return f"{parts[0] + 1}.0.0"
    elif bump_type == "minor":
        return f"{parts[0]}.{parts[1] + 1}.0"
    elif bump_type == "patch":
        return f"{parts[0]}.{parts[1]}.{parts[2] + 1}"
    else:
        print(f"ERROR: Invalid bump type '{bump_type}'. Use: patch, minor, or major", file=sys.stderr)
        sys.exit(1)


def update_skill_md(new_version: str):
    with open(SKILL_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    updated = re.sub(
        r'^version:\s*"?\d+\.\d+\.\d+"?\s*$',
        f"version: {new_version}",
        content,
        count=1,
    )

    with open(SKILL_PATH, "w", encoding="utf-8") as f:
        f.write(updated)


def log_version(old: str, new: str, bump_type: str, reason: str):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": new,
        "previous_version": old,
        "type": bump_type,
        "reason": reason,
    }

    os.makedirs(os.path.dirname(VERSION_LOG), exist_ok=True)
    with open(VERSION_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Bump skill version")
    parser.add_argument("--type", required=True, choices=["patch", "minor", "major"], help="Version bump type")
    parser.add_argument("--reason", required=True, help="Why this change")
    args = parser.parse_args()

    current = read_current_version()
    new_version = bump_version(current, args.type)

    update_skill_md(new_version)
    log_version(current, new_version, args.type, args.reason)

    print(f" Version bumped: {current}  {new_version} ({args.type})")
    print(f"   Reason: {args.reason}")


if __name__ == "__main__":
    main()
