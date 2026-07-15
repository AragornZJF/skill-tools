"""
bootstrap_evolution.py  Inject self-evolution capability into an existing skill.

Usage:
    python bootstrap_evolution.py --skill-path /path/to/existing-skill

What it does:
1. Creates scripts/evolve/ with evolution engine scripts
2. Creates references/ with evolution-log.jsonl and version-log.jsonl
3. Appends a Self-Evolution section to SKILL.md (if not already present)
4. Does NOT overwrite existing files
"""

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone

EVOLUTION_SECTION = """

---

## Self-Evolution

This skill can improve itself over time. After completing any meaningful task:

### 1. Reflect
Analyze: What went well? What went wrong? What was learned? What would you do differently?

### 2. Record
```bash
python scripts/evolve/record_learning.py --category <category> --summary "..." --detail "..."
```

### 3. Evaluate
Does this learning warrant a permanent change? Only for: reusable patterns, wrong instructions, new tool knowledge, common mistakes, script bugs.

### 4. Propose & Confirm
Show the user the diff. Wait for explicit confirmation.

### 5. Apply
```bash
python scripts/evolve/apply_change.py --file <path> --old "..." --new "..."
```

### 6. Version
```bash
python scripts/evolve/version_bump.py --type minor --reason "..."
```

Safety rules:
- Never delete YAML frontmatter name or description
- Never modify more than 30%% of a file in a single evolution
- Always get user confirmation before applying changes
"""

EVOLUTION_SCRIPTS = [
    "reflect.py",
    "record_learning.py",
    "apply_change.py",
    "version_bump.py",
]


def get_script_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "templates", "evolution-scripts")


def copy_evolution_scripts(skill_dir: str) -> bool:
    src_dir = get_script_dir()
    if not os.path.isdir(src_dir):
        print(f"ERROR: Evolution scripts template not found at {src_dir}", file=sys.stderr)
        return False

    evolve_dir = os.path.join(skill_dir, "scripts", "evolve")
    os.makedirs(evolve_dir, exist_ok=True)

    copied = 0
    for script in EVOLUTION_SCRIPTS:
        src = os.path.join(src_dir, script)
        dst = os.path.join(evolve_dir, script)
        if os.path.isfile(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)
            print(f"   scripts/evolve/{script}")
            copied += 1
        elif os.path.exists(dst):
            print(f"   scripts/evolve/{script} (already exists, skipped)")

    init_file = os.path.join(evolve_dir, "__init__.py")
    if not os.path.exists(init_file):
        with open(init_file, "w") as f:
            f.write("")
        print(f"   scripts/evolve/__init__.py")

    return copied > 0 or os.path.exists(os.path.join(evolve_dir, EVOLUTION_SCRIPTS[0]))


def init_logs(skill_dir: str) -> bool:
    ref_dir = os.path.join(skill_dir, "references")
    os.makedirs(ref_dir, exist_ok=True)

    evo_path = os.path.join(ref_dir, "evolution-log.jsonl")
    if not os.path.exists(evo_path):
        with open(evo_path, "w") as f:
            f.write("")
        print(f"   references/evolution-log.jsonl")
    else:
        print(f"   references/evolution-log.jsonl (already exists)")

    ver_path = os.path.join(ref_dir, "version-log.jsonl")
    if not os.path.exists(ver_path):
        initial = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "0.1.0",
            "type": "initial",
            "reason": "Self-evolution bootstrapped by auto-skill-forge",
        }
        with open(ver_path, "w") as f:
            f.write(json.dumps(initial) + "\n")
        print(f"   references/version-log.jsonl")
    else:
        print(f"   references/version-log.jsonl (already exists)")
    return True


def inject_evolution_section(skill_dir: str) -> bool:
    skill_path = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(skill_path):
        print(f"ERROR: No SKILL.md found at {skill_path}", file=sys.stderr)
        return False

    with open(skill_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "## Self-Evolution" in content:
        print(f"   SKILL.md (already has Self-Evolution section, skipped)")
        return True

    with open(skill_path, "a", encoding="utf-8") as f:
        f.write(EVOLUTION_SECTION)

    print(f"   SKILL.md (appended Self-Evolution section)")
    return True


def main():
    parser = argparse.ArgumentParser(description="Bootstrap self-evolution into an existing skill")
    parser.add_argument("--skill-path", required=True, help="Path to the existing skill directory")
    args = parser.parse_args()

    skill_dir = os.path.abspath(args.skill_path)

    if not os.path.isdir(skill_dir):
        print(f"ERROR: Skill directory not found: {skill_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"\n Bootstrapping self-evolution into: {skill_dir}\n")

    logs_ok = init_logs(skill_dir)
    scripts_ok = copy_evolution_scripts(skill_dir)
    section_ok = inject_evolution_section(skill_dir)

    if logs_ok and scripts_ok and section_ok:
        print(f"\n Self-evolution bootstrapped successfully!")
    else:
        print(f"\n Bootstrapped with warnings (see above)")


if __name__ == "__main__":
    main()
