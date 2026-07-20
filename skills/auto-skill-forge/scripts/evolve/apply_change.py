"""
apply_change.py  Apply a self-modification to a skill's file with safety checks.

Usage:
    python scripts/evolve/apply_change.py \
        --file <relative-path> \
        --old "exact text to replace" \
        --new "replacement text"

Safety rules enforced:
- Never delete YAML frontmatter name or description
- Never modify more than 30% of a file
- Old string must exist (exactly once) in the target file
- Automatically creates a backup before modifying
"""

import argparse
import os
import shutil
import sys
import re
from datetime import datetime


SKILL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def validate_frontmatter(content: str, old: str, new: str):
    """Ensure we never delete name/description from YAML frontmatter."""
    if "---" not in content:
        return
    parts = content.split("---", 2)
    if len(parts) < 3:
        return
    frontmatter = parts[1]

    if "name:" in frontmatter and "name:" not in new and "name:" in old:
        print("ERROR: Cannot delete YAML frontmatter 'name' field", file=sys.stderr)
        sys.exit(1)
    if "description:" in frontmatter and "description:" not in new and "description:" in old:
        print("ERROR: Cannot delete YAML frontmatter 'description' field", file=sys.stderr)
        sys.exit(1)


def validate_change_size(content: str, old: str, new: str):
    """Ensure change doesn't exceed 30% of file."""
    if not content:
        return
    change_size = len(old) + len(new)
    ratio = change_size / len(content)
    if ratio > 0.30:
        print(f"ERROR: Change would affect {ratio:.1%} of the file (max 30%)", file=sys.stderr)
        sys.exit(1)


def count_occurrences(content: str, old: str) -> int:
    return content.count(old)


def main():
    parser = argparse.ArgumentParser(description="Apply a self-modification to a skill file")
    parser.add_argument("--file", required=True, help="Relative path from skill root (e.g. SKILL.md)")
    parser.add_argument("--old", required=True, help="Exact text to replace")
    parser.add_argument("--new", required=True, help="Replacement text")
    parser.add_argument("--force", action="store_true", help="Replace ALL occurrences when multiple matches found (default: require a unique match)")
    args = parser.parse_args()

    skill_root = os.path.abspath(SKILL_DIR)
    file_path = os.path.abspath(os.path.join(skill_root, args.file))
    if not (file_path == skill_root or file_path.startswith(skill_root + os.sep)):
        print("ERROR: File path escapes skill directory", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(file_path):
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    occurrences = count_occurrences(content, args.old)

    if occurrences == 0:
        print(f"ERROR: old string not found in {args.file}", file=sys.stderr)
        print("Tip: Make sure the exact text matches (including whitespace).", file=sys.stderr)
        sys.exit(1)

    if occurrences > 1 and not args.force:
        print(f"ERROR: Found {occurrences} matches. Provide more context in --old to make it unique.", file=sys.stderr)
        print("Use --force to replace ALL occurrences.", file=sys.stderr)
        sys.exit(1)

    validate_frontmatter(content, args.old, args.new)
    validate_change_size(content, args.old, args.new)

    backup_path = file_path + ".bak." + datetime.now().strftime("%Y%m%d%H%M%S")
    shutil.copy2(file_path, backup_path)
    print(f" Backup saved: {backup_path}")

    if occurrences > 1 and args.force:
        new_content = content.replace(args.old, args.new)
    else:
        new_content = content.replace(args.old, args.new, 1)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f" Applied change to {args.file}")


if __name__ == "__main__":
    main()
