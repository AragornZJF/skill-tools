"""
forge_new.py  Create a new skill with built-in self-evolution capability.

Usage:
    python forge_new.py \
        --name "my-skill" \
        --description "Does X when Y happens" \
        --instructions "Core instructions for the skill body" \
        --output-dir "/path/to/skills"

The script:
1. Creates the skill directory
2. Writes SKILL.md from template (with evolution section baked in)
3. Copies evolution scripts into scripts/evolve/
4. Initializes evolution-log.jsonl and version-log.jsonl
5. Applies any custom scripts via --custom-scripts-dir (optional)
"""

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "..", "templates", "self-evolving-skill.md")
EVOLUTION_SCRIPTS_SRC = os.path.join(os.path.dirname(__file__), "..", "templates", "evolution-scripts")

EVOLUTION_SCRIPTS = [
    "reflect.py",
    "record_learning.py",
    "apply_change.py",
    "version_bump.py",
]


def load_template() -> str:
    try:
        with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"ERROR: Template not found at {TEMPLATE_PATH}", file=sys.stderr)
        sys.exit(1)


def render_template(template: str, name: str, description: str, instructions: str) -> str:
    # Convert literal \n to actual newlines if present
    instructions = instructions.replace("\\n", "\n")
    return (
        template
        .replace("{{SKILL_NAME}}", name)
        .replace("{{SKILL_DESCRIPTION}}", description)
        .replace("{{CORE_INSTRUCTIONS}}", instructions)
    )


def write_skill_md(output_dir: str, content: str) -> str:
    path = os.path.join(output_dir, "SKILL.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"   SKILL.md")
    return path


def copy_evolution_scripts(skill_dir: str):
    evolve_dir = os.path.join(skill_dir, "scripts", "evolve")
    os.makedirs(evolve_dir, exist_ok=True)

    if not os.path.isdir(EVOLUTION_SCRIPTS_SRC):
        print(f"   Evolution scripts source not found at {EVOLUTION_SCRIPTS_SRC}", file=sys.stderr)
        return

    for script_name in EVOLUTION_SCRIPTS:
        src = os.path.join(EVOLUTION_SCRIPTS_SRC, script_name)
        dst = os.path.join(evolve_dir, script_name)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print(f"   scripts/evolve/{script_name}")
        else:
            print(f"   scripts/evolve/{script_name} not found in template", file=sys.stderr)

    init_file = os.path.join(evolve_dir, "__init__.py")
    with open(init_file, "w") as f:
        f.write("")
    print(f"   scripts/evolve/__init__.py")


def init_logs(skill_dir: str):
    ref_dir = os.path.join(skill_dir, "references")
    os.makedirs(ref_dir, exist_ok=True)

    evo_log = os.path.join(ref_dir, "evolution-log.jsonl")
    if not os.path.exists(evo_log):
        with open(evo_log, "w") as f:
            f.write("")
    print(f"   references/evolution-log.jsonl")

    ver_log = os.path.join(ref_dir, "version-log.jsonl")
    if not os.path.exists(ver_log):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "0.1.0",
            "type": "initial",
            "reason": "Skill created by auto-skill-forge",
        }
        with open(ver_log, "w") as f:
            f.write(json.dumps(entry) + "\n")
    print(f"   references/version-log.jsonl")


def copy_custom_scripts(skill_dir: str, custom_dir: str):
    if not os.path.isdir(custom_dir):
        print(f"   Custom scripts directory not found: {custom_dir}", file=sys.stderr)
        return
    scripts_dir = os.path.join(skill_dir, "scripts")
    for item in os.listdir(custom_dir):
        src = os.path.join(custom_dir, item)
        dst = os.path.join(scripts_dir, item)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print(f"   scripts/{item}")
    print(f"   Custom scripts copied")


def main():
    parser = argparse.ArgumentParser(description="Create a self-evolving skill")
    parser.add_argument("--name", required=True, help="Skill name (directory name + frontmatter name)")
    parser.add_argument("--description", required=True, help="Skill description for YAML frontmatter")
    parser.add_argument("--instructions", required=True, help="Core instructions for SKILL.md body")
    parser.add_argument("--output-dir", required=True, help="Parent directory to create the skill in")
    parser.add_argument("--custom-scripts-dir", help="Optional directory of custom scripts to copy in")
    args = parser.parse_args()

    skill_dir = os.path.join(args.output_dir, args.name)

    if os.path.exists(skill_dir):
        print(f"ERROR: Directory already exists: {skill_dir}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(skill_dir)
    print(f"\n--- Forging skill: {args.name}")
    print(f"   Location: {skill_dir}\n")

    template = load_template()
    rendered = render_template(template, args.name, args.description, args.instructions)
    write_skill_md(skill_dir, rendered)

    copy_evolution_scripts(skill_dir)
    init_logs(skill_dir)

    if args.custom_scripts_dir:
        copy_custom_scripts(skill_dir, args.custom_scripts_dir)

    print(f"\n*** Skill '{args.name}' forged successfully!")
    print(f"   Path: {skill_dir}")
    print(f"   The skill has built-in self-evolution capability.")


if __name__ == "__main__":
    main()
