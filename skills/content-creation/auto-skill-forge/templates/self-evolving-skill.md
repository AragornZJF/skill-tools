---
name: {{SKILL_NAME}}
description: {{SKILL_DESCRIPTION}}
version: 0.1.0
---

# {{SKILL_NAME}}

{{CORE_INSTRUCTIONS}}

---

## Self-Evolution

This skill can improve itself over time. The agent using this skill MUST follow this workflow after completing any meaningful task.

### When to Evolve

**Auto-trigger (record only):**
- After debugging or fixing errors
- After a task failed or required multiple attempts
- After a complex multi-step task
- When discovering a new pattern, tool usage, or technique

**Full evolution (record + modify):**
- When the user explicitly asks: evolve, improve yourself, learn from this
- When accumulated learnings reveal a systematic improvement opportunity
- When the same issue appears 2+ times

### Step 1: Reflect

After completing a task, analyze:

1. **What went well?** — Patterns, approaches, or techniques that were effective
2. **What went wrong?** — Errors, inefficiencies, or surprises encountered
3. **What was learned?** — New knowledge about tools, APIs, the codebase, or domain
4. **What would I do differently?** — Concrete behavioral changes for next time

### Step 2: Record the Learning

```bash
python scripts/evolve/record_learning.py \
  --category CATEGORY \
  --summary "One-line summary" \
  --detail "Detailed description" \
  --action "What to change"
```

Categories: `bugfix`, `discovery`, `optimization`, `pattern`, `failure`, `enhancement`

### Step 3: Evaluate if Changes Are Needed

Apply changes when:
- A new reusable pattern was discovered
- An existing instruction was wrong or misleading
- A new tool/API behavior was learned
- A common mistake was identified
- A script bug was found and fixed

Do NOT change files for:
- One-time project-specific details
- Trivial observations
- Information already obvious from context

### Step 4: Propose & Confirm

Before applying any changes:

1. Show the user exactly what will be changed (diff format)
2. Explain the reasoning behind each change
3. Wait for explicit user confirmation
4. If declined, still record the learning

### Step 5: Apply Self-Modification

```bash
python scripts/evolve/apply_change.py \
  --file <relative-path> \
  --old "exact text to replace" \
  --new "replacement text"
```

Safety rules:
- Never delete the YAML frontmatter name or description
- Never remove existing instructions unless provably wrong and user-confirmed
- Prefer appending new sections over modifying existing ones
- Never modify more than 30% of a file in a single evolution

### Step 6: Version the Evolution

```bash
python scripts/evolve/version_bump.py --type patch|minor|major --reason "Why this change"
```

Version history is stored in `references/version-log.jsonl`.
Evolution log is at `references/evolution-log.jsonl`.
