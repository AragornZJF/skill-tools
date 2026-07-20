---
name: auto-skill-forge
description: Create new skills with built-in self-evolution capability. Use when the user wants to create a new skill, make an existing skill self-evolving, or design an agent that can improve itself over time. Trigger on: "造个skill" "创建skill" "做个自进化skill" "让这个skill能自己进化" "auto-skill" "self-evolving skill" "造一个会自己成长的技能" "forge a skill".
version: 0.1.0
---

# Auto-Skill Forge

A meta-skill that creates new skills with **built-in self-evolution capability**. Every skill produced by this forge can reflect on its own execution, record learnings, and apply self-improvements.

## Two Operating Modes

### Mode 1: Create a Self-Evolving Skill (forge)

When the user wants a new skill:

```
User: "I want a skill that does X"
                        │
                        ▼
              ┌─────────────────┐
              │ 1. Interview     │ ← Understand intent, edge cases, output format
              └────────┬────────┘
                       │
              ┌─────────────────┐
              │ 2. Generate      │ ← python scripts/forge_new.py ...
              └────────┬────────┘
                       │
              ┌─────────────────┐
              │ 3. Test          │ ← Run test cases, iterate
              └────────┬────────┘
                       │
              ┌─────────────────┐
              │ 4. Deliver       │ ← Show user the result
              └─────────────────┘
```

### Mode 2: Bootstrap Evolution Into Existing Skill

When the user has an existing skill and wants to add self-evolution:

```
python scripts/bootstrap_evolution.py --skill-path <path-to-skill>
```

---

## Creation Workflow

### Step 1: Interview

Ask the user:
1. What should this skill do?
2. When should it trigger? (user phrases/contexts)
3. What's the expected output format?
4. Any edge cases or constraints?

### Step 2: Generate the Skill

Run `forge_new.py` to create the skill:

```bash
python scripts/forge_new.py \
  --name "<skill-name>" \
  --description "<trigger description>" \
  --instructions "<core instructions for SKILL.md body>" \
  --output-dir "<target-directory>"
```

This creates:

```
<skill-name>/
├── SKILL.md                       # Core functionality + self-evolution
├── scripts/
│   ├── evolve/                    # Evolution engine (auto-injected)
│   │   ├── reflect.py
│   │   ├── record_learning.py
│   │   ├── apply_change.py
│   │   └── version_bump.py
│   └── (custom scripts if any)
└── references/
    ├── evolution-log.jsonl
    └── version-log.jsonl
```

### Step 3: Test & Iterate

1. Create 2-3 test prompts
2. Run the skill against them
3. Show results to the user
4. Iterate based on feedback (re-run `forge_new.py` or edit files directly)

### Step 4: Deliver

Present the final skill path to the user. The skill is ready to use and will self-evolve on its own.

---

## How Self-Evolution Works (Inside Generated Skills)

Each generated skill follows this lifecycle:

```
Task Complete → Reflect → Record → Evaluate → Propose → User Confirm → Apply → Version
```

The agent using the generated skill should, after completing any meaningful task:

1. **Reflect** — Run `python scripts/evolve/reflect.py` and answer the 4 questions
2. **Record** — `python scripts/evolve/record_learning.py --category <cat> --summary "..." --detail "..."`
3. **Evaluate** — Does this learning warrant a permanent change to the skill's files?
4. **Propose** — Show the user what will change (diff), explain why, wait for confirmation
5. **Apply** — `python scripts/evolve/apply_change.py --file <path> --old "..." --new "..."`
6. **Version** — `python scripts/evolve/version_bump.py --type minor --reason "..."`

---

## Meta-Evolution: Improving the Forge Itself

The forge also evolves. When you identify patterns across multiple created skills:

1. Record the insight in `references/meta-evolution-log.jsonl`
2. Improve the template at `templates/self-evolving-skill.md`
3. Improve the injected scripts at `templates/evolution-scripts/`
4. Bump the forge's own version

---

## Safety Rules

- Never delete YAML frontmatter name or description
- Prefer appending new sections over modifying existing ones
- Never modify more than 30% of a file in a single evolution
- Always get user confirmation before applying changes
- Generated skills can only modify files within their own directory
