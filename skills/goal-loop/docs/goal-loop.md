# goal-loop Skill 实现计划

> **For agentic workers:** Implement this plan task-by-task using subagent-driven development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现个人 skill `goal-loop`,融合 头脑风暴、编写计划 与 Geoff Huntley Ralph 循环,提供三阶段(specs → plan → build)自主开发能力。

**Architecture:** skill 由 `SKILL.md`(总编排 + Phase 1 交互引导)+ 两个循环 prompt(`PROMPT_plan.md` 定制融合 / `PROMPT_build.md` 原版)+ `AGENTS.md` 反压模板 + `loop.sh` 外部驱动器组成。Phase 1 在交互会话产出 `specs/`;Phase 2/3 用外部 bash 循环(headless `claude -p`)每轮清空上下文迭代。开发在 `D:\devlope\goal-loop\skills\goal-loop\`,安装到 `~/.claude/skills/goal-loop/`。

**Tech Stack:** Markdown(skill 内容)、Bash(loop.sh / 安装 / 校验)、Claude Code skill 系统(YAML frontmatter: `name`, `description`)。

## Global Constraints

- **个人 skill**:仅 Claude Code,不守跨平台/零依赖规则,可用 Claude Code 专有能力
- **执行层基于原版**:`prompts/PROMPT_build.md` 与 `D:\devlope\how-to-ralph-wiggum` 原版**逐字一致**;`scripts/loop.sh` 基于原版,唯一改动是加显式 `build` 关键字(与 `plan` 对称,无参仍默认 build)。均含每轮 git push、git tag、subagent fan-out up to 250/500、`--output-format=stream-json`、`--verbose`
- **定制层**:Phase 1(`SKILL.md`)借 `@phases/brainstorming.md`;`prompts/PROMPT_plan.md` 融合 Ralph 骨架 + `@phases/writing-plans.md` 细粒度任务纪律
- **外部循环驱动**:headless `claude -p --dangerously-skip-permissions`,每轮全新进程 = 真·上下文重置
- **产物位置**:目标项目根(`specs/`、`IMPLEMENTATION_PLAN.md`、`AGENTS.md`、`PROMPT_*.md`、`loop.sh`)
- **skill 无第三方依赖**:自身仅 bash + markdown
- **shebang 与行尾**:脚本用 `#!/bin/bash`(与 how-to-ralph-wiggum 一致);LF 行尾

## File Structure

```
D:\devlope\goal-loop\              # 开发目录
├── skills/goal-loop/              # skill 源
│   ├── SKILL.md                               # Task 6
│   ├── prompts/PROMPT_plan.md                 # Task 5(定制融合)
│   ├── prompts/PROMPT_build.md                # Task 4(原版)
│   ├── templates/AGENTS.md                    # Task 3
│   └── scripts/loop.sh                        # Task 2(原版)
├── tests/
│   ├── verify-structure.sh                    # Task 1(结构校验)
│   └── test-loop-args.sh                      # Task 2(loop.sh 参数)
├── install.sh                                 # Task 1
└── README.md                                  # Task 7
```

**职责边界**:
- `SKILL.md`:phase 检测 + Phase 1 交互引导 + 安全说明 + 切换指引(入口,Phase 1)
- `prompts/PROMPT_plan.md`:Phase 2 循环 prompt(Ralph 骨架 + writing-plans 纪律)
- `prompts/PROMPT_build.md`:Phase 3 循环 prompt(how-to-ralph-wiggum 原版)
- `templates/AGENTS.md`:反压命令模板(用户填)
- `scripts/loop.sh`:外部 bash 驱动器(how-to-ralph-wiggum 原版)
- `install.sh`:复制 skill 到 `~/.claude/skills/goal-loop/`

**命名契约**(跨文件接口):
- `loop.sh` 通过模式选择读 `PROMPT_plan.md` / `PROMPT_build.md`(文件名硬编码)
- 两个 prompt 都消费 `specs/*`、`src/*`、`AGENTS.md`;`PROMPT_plan.md` 写 `IMPLEMENTATION_PLAN.md`,`PROMPT_build.md` 读写它
- `SKILL.md` 通过相对路径引用 `prompts/`、`templates/`、`scripts/`

---

### Task 1: 项目骨架 + 安装脚本 + 结构校验基建

**Files:**
- Create: `skills/goal-loop/`(目录 + 子目录 `prompts/` `templates/` `scripts/`)
- Create: `install.sh`
- Create: `tests/verify-structure.sh`

**Interfaces:**
- Produces: `tests/verify-structure.sh` —— 后续每个任务建完文件后跑它,直到 Task 6 全绿

- [ ] **Step 1: 写失败的结构校验测试**

创建 `tests/verify-structure.sh`:

```bash
#!/bin/bash
# 校验 goal-loop skill 结构完整、frontmatter 合法、无占位符
# Usage: ./tests/verify-structure.sh [skill_dir]
set -euo pipefail

SKILL_DIR="${1:-skills/goal-loop}"
PASS=0; FAIL=0

check_file() {
  if [ -f "$SKILL_DIR/$1" ]; then echo "PASS: $1 exists"; PASS=$((PASS+1));
  else echo "FAIL: $1 missing"; FAIL=$((FAIL+1)); fi
}

check_contains() {
  if [ -f "$SKILL_DIR/$1" ] && grep -qF "$2" "$SKILL_DIR/$1"; then
    echo "PASS: $1 contains expected string"; PASS=$((PASS+1));
  else echo "FAIL: $1 missing string: $2"; FAIL=$((FAIL+1)); fi
}

check_no_placeholder() {
  if grep -qiE 'TBD|TODO|FIXME|\[project-specific' "$SKILL_DIR/$1" 2>/dev/null; then
    echo "FAIL: $1 has placeholder"; FAIL=$((FAIL+1));
  else echo "PASS: $1 has no placeholder"; PASS=$((PASS+1)); fi
}

# 必需文件
check_file SKILL.md
check_file prompts/PROMPT_plan.md
check_file prompts/PROMPT_build.md
check_file templates/AGENTS.md
check_file scripts/loop.sh

# frontmatter(PROMPT_plan/build 是纯 prompt,无 frontmatter;SKILL.md 有)
check_contains SKILL.md "name: goal-loop"
check_contains SKILL.md "description:"

# 关键内容(后续 task 填充后才会通过)
check_contains prompts/PROMPT_plan.md "writing-plans"
check_contains prompts/PROMPT_plan.md "don't assume"
check_contains prompts/PROMPT_build.md "git push"
check_contains prompts/PROMPT_build.md "999999."
check_contains scripts/loop.sh "claude -p"
check_contains scripts/loop.sh "PROMPT_plan.md"

# 无占位符(SKILL.md / AGENTS.md 不应有 TBD)
check_no_placeholder SKILL.md

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
```

- [ ] **Step 2: 运行校验,确认失败(文件还没建)**

Run: `cd /d/devlope/goal-loop && bash tests/verify-structure.sh`
Expected: FAIL(所有文件 missing),退出码非 0

- [ ] **Step 3: 建 skill 目录结构**

Run:
```bash
cd /d/devlope/goal-loop
mkdir -p skills/goal-loop/prompts skills/goal-loop/templates skills/goal-loop/scripts
```
Expected: 三个子目录创建成功

- [ ] **Step 4: 写安装脚本 `install.sh`**

```bash
#!/bin/bash
# 安装 goal-loop skill 到 ~/.claude/skills/
# Usage: ./install.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/skills/goal-loop"
DEST="$HOME/.claude/skills/goal-loop"

if [ ! -d "$SRC" ]; then
  echo "Error: skill source not found at $SRC" >&2
  exit 1
fi

mkdir -p "$HOME/.claude/skills"
rm -rf "$DEST"
cp -r "$SRC" "$DEST"

echo "Installed goal-loop to $DEST"
echo "Verify with: bash tests/verify-structure.sh \"$DEST\""
```

- [ ] **Step 5: 提交**

```bash
cd /d/devlope/goal-loop
git add tests/verify-structure.sh install.sh
git commit -m "chore: skill skeleton, install script, structure verification"
```

---

### Task 2: scripts/loop.sh(外部驱动器,基于 how-to-ralph-wiggum 原版)

**Files:**
- Create: `skills/goal-loop/scripts/loop.sh`
- Create: `tests/test-loop-args.sh`

**Interfaces:**
- Consumes: `PROMPT_plan.md` / `PROMPT_build.md`(目标项目根,由模式选择)
- Produces: 可执行的 `loop.sh`,plan/build 模式 + max-iterations

- [ ] **Step 1: 写参数解析失败测试**

创建 `tests/test-loop-args.sh`:

```bash
#!/bin/bash
# 测试 loop.sh 的参数解析(不实际跑 claude)
# 通过提取 loop.sh 里的逻辑或源它来验证模式选择
set -euo pipefail
LOOP="skills/goal-loop/scripts/loop.sh"
PASS=0; FAIL=0

# 测试 1:文件存在且可读
if [ -f "$LOOP" ]; then echo "PASS: loop.sh exists"; PASS=$((PASS+1));
else echo "FAIL: loop.sh missing"; FAIL=$((FAIL+1)); fi

# 测试 2:含 plan/build 模式逻辑
if grep -qF 'PROMPT_FILE="PROMPT_plan.md"' "$LOOP"; then echo "PASS: plan mode"; PASS=$((PASS+1));
else echo "FAIL: no plan mode"; FAIL=$((FAIL+1)); fi

if grep -qF 'PROMPT_FILE="PROMPT_build.md"' "$LOOP"; then echo "PASS: build mode"; PASS=$((PASS+1));
else echo "FAIL: no build mode"; FAIL=$((FAIL+1)); fi

if grep -qF '[ "$1" = "build" ]' "$LOOP"; then echo "PASS: build keyword"; PASS=$((PASS+1));
else echo "FAIL: no build keyword"; FAIL=$((FAIL+1)); fi

# 测试 3:含 claude -p 调用
if grep -qF 'claude -p' "$LOOP"; then echo "PASS: claude -p invocation"; PASS=$((PASS+1));
else echo "FAIL: no claude -p"; FAIL=$((FAIL+1)); fi

# 测试 4:含 git push
if grep -qF 'git push' "$LOOP"; then echo "PASS: git push per iteration"; PASS=$((PASS+1));
else echo "FAIL: no git push"; FAIL=$((FAIL+1)); fi

echo "PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd /d/devlope/goal-loop && bash tests/test-loop-args.sh`
Expected: FAIL(loop.sh missing)

- [ ] **Step 3: 写 loop.sh(基于 how-to-ralph-wiggum 原版,build/plan 对称关键字)**

创建 `skills/goal-loop/scripts/loop.sh`:

```bash
#!/bin/bash
# Usage: ./loop.sh [plan|build] [max_iterations]
# Examples:
#   ./loop.sh build        # Build mode, unlimited iterations
#   ./loop.sh build 20     # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations
#   ./loop.sh              # Build mode, unlimited (shorthand for ./loop.sh build)

# Parse arguments
if [ "$1" = "plan" ]; then
    # Plan mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "build" ]; then
    # Build mode (explicit keyword)
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations (shorthand: number without keyword)
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    # Build mode, unlimited (no arguments = build shorthand)
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning (task selection, prioritization)
    #               Can use 'sonnet' in build mode for speed if plan is clear and tasks well-defined
    # --verbose: Detailed execution logging
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    # Push changes after each iteration
    git push origin "$CURRENT_BRANCH" || {
        echo "Failed to push. Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd /d/devlope/goal-loop && bash tests/test-loop-args.sh`
Expected: PASS=5 FAIL=0

- [ ] **Step 5: 运行结构校验,确认 loop.sh 部分通过**

Run: `bash tests/verify-structure.sh`
Expected: `scripts/loop.sh` 相关 PASS,其他仍 FAIL

- [ ] **Step 6: 提交**

```bash
cd /d/devlope/goal-loop
git add skills/goal-loop/scripts/loop.sh tests/test-loop-args.sh
git commit -m "feat: add loop.sh external driver (how-to-ralph-wiggum + build/plan keywords)"
```

---

### Task 3: templates/AGENTS.md(反压模板)

**Files:**
- Create: `skills/goal-loop/templates/AGENTS.md`

**Interfaces:**
- Produces: 模板,Phase 1 结束时复制到目标项目根,用户填具体命令;Phase 3 的 `PROMPT_build.md` 读它的 test 命令做 backpressure

- [ ] **Step 1: 写 AGENTS.md 模板(how-to-ralph-wiggum 结构)**

创建 `skills/goal-loop/templates/AGENTS.md`:

```markdown
## Build & Run

Succinct rules for how to BUILD the project:

## Validation

Run these after implementing to get immediate feedback:

- Tests: `[test command]`
- Typecheck: `[typecheck command]`
- Lint: `[lint command]`

## Operational Notes

Succinct learnings about how to RUN the project:

...

### Codebase Patterns

...
```

> 注:此文件是给目标项目用的模板,`[test command]` 等占位符由用户(Phase 1 结束时 skill 协助)填入实际命令。这些占位是设计意图,不是 skill 自身的 TBD。

- [ ] **Step 2: 运行结构校验**

Run: `cd /d/devlope/goal-loop && bash tests/verify-structure.sh`
Expected: `templates/AGENTS.md exists` PASS(其他仍 FAIL)

- [ ] **Step 3: 提交**

```bash
cd /d/devlope/goal-loop
git add skills/goal-loop/templates/AGENTS.md
git commit -m "feat: add AGENTS.md backpressure template"
```

---

### Task 4: prompts/PROMPT_build.md(Phase 3,how-to-ralph-wiggum 原版)

**Files:**
- Create: `skills/goal-loop/prompts/PROMPT_build.md`

**Interfaces:**
- Consumes: `specs/*`、`src/*`、`IMPLEMENTATION_PLAN.md`、`AGENTS.md`
- Produces: 每轮实现一个任务、跑测试、更新 plan、`git commit` + `git push`、git tag

- [ ] **Step 1: 写 PROMPT_build.md(how-to-ralph-wiggum 英文原版,逐字一致)**

创建 `skills/goal-loop/prompts/PROMPT_build.md`:

````markdown
0a. Study `specs/*` with up to 500 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. For reference, the application source code is in `src/*`.

1. Your task is to implement functionality per the specifications using parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented) using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).
2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.
3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.
4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

99999. Important: When authoring documentation, capture the why – tests and implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.
99999999. You may add extra logging if required to debug issues.
999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent – future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.
99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.
999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
99999999999999. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.
999999999999999. IMPORTANT: Keep @AGENTS.md operational only – status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
````

- [ ] **Step 2: 运行结构校验**

Run: `cd /d/devlope/goal-loop && bash tests/verify-structure.sh`
Expected: `prompts/PROMPT_build.md` 相关 PASS(含 `git push`、`999999.`)

- [ ] **Step 3: 提交**

```bash
cd /d/devlope/goal-loop
git add skills/goal-loop/prompts/PROMPT_build.md
git commit -m "feat: add PROMPT_build.md Phase 3 prompt (how-to-ralph-wiggum verbatim)"
```

---

### Task 5: prompts/PROMPT_plan.md(Phase 2,定制融合)

**Files:**
- Create: `skills/goal-loop/prompts/PROMPT_plan.md`

**Interfaces:**
- Consumes: `specs/*`、`src/*`、`src/lib/*`
- Produces: `IMPLEMENTATION_PLAN.md`(细粒度任务,非粗清单)—— 编写执行计划 纪律

- [ ] **Step 1: 写 PROMPT_plan.md(Ralph 骨架 + writing-plans 产出纪律)**

创建 `skills/goal-loop/prompts/PROMPT_plan.md`:

````markdown
0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `src/lib/*` with up to 250 parallel Sonnet subagents to understand shared utilities & components.
0d. For reference, the application source code is in `src/*`.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 Sonnet subagents to study existing source code in `src/*` and compare it against `specs/*`. Use an Opus subagent to analyze findings and prioritize tasks. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Then create/update @IMPLEMENTATION_PLAN.md as an ordered list of tasks, keeping it up to date with items considered complete/incomplete using subagents.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat `src/lib` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

## IMPLEMENTATION_PLAN.md format (编写执行计划 discipline)

Each task in @IMPLEMENTATION_PLAN.md MUST be fine-grained and self-contained — NOT a coarse bullet-point wish list. Each task entry:

- **Is 2-5 minutes of work** (smallest unit worth its own implementation pass in the build loop)
- **States exact file paths** — which files to create or modify (e.g. `src/auth/login.ts`)
- **Includes complete code** — the actual code to write, not a description of it
- **States verification steps** — the exact command(s) that confirm this task is done (test/lint/build)
- **Has no placeholders** — no TBD, no "similar to task N", no vague descriptions

Example task entry shape:

```
### Task N: <name>
Files: create/modify <exact paths>
Verification: <exact command>
<complete code>
```

This format is what lets the Phase 3 build loop pick ONE task per iteration and implement it completely with zero additional planning.

ULTIMATE GOAL: We want to achieve the project's goal as defined in specs/*. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md. If you create a new element then document the plan to implement it in @IMPLEMENTATION_PLAN.md using a subagent.
````

- [ ] **Step 2: 运行结构校验**

Run: `cd /d/devlope/goal-loop && bash tests/verify-structure.sh`
Expected: `prompts/PROMPT_plan.md` 相关 PASS(含 `writing-plans`、`don't assume`)

- [ ] **Step 3: 提交**

```bash
cd /d/devlope/goal-loop
git add skills/goal-loop/prompts/PROMPT_plan.md
git commit -m "feat: add PROMPT_plan.md fusing Ralph skeleton with writing-plans task discipline"
```

---

### Task 6: SKILL.md(总编排 + Phase 1 + 路由 + 安全)

**Files:**
- Create: `skills/goal-loop/SKILL.md`

**Interfaces:**
- Produces: skill 入口;phase 自动路由 + Phase 1 交互引导 + 安全说明

- [ ] **Step 1: 写 SKILL.md**

创建 `skills/goal-loop/SKILL.md`:

````markdown
---
name: goal-loop
description: Use when the user wants to autonomously build a feature or project via a Ralph-style loop — brainstorm specs, plan fine-grained tasks, then loop-implement, test, and commit with fresh context each iteration. Routes by project state: no specs/ -> interactive Phase 1 brainstorming; specs present but no IMPLEMENTATION_PLAN.md -> plan loop; plan present -> build loop.
---

# goal-loop

Fuse Superpowers' brainstorming + writing-plans methodology with Geoff Huntley's Ralph autonomous loop. Three phases:

1. **Phase 1 (interactive, this session)** — brainstorm JTBD, split into topics, write `specs/<topic>.md`
2. **Phase 2 (plan loop, external)** — `./loop.sh plan` → gap analysis → `IMPLEMENTATION_PLAN.md` (fine-grained tasks)
3. **Phase 3 (build loop, external)** — `./loop.sh build` → implement one task per iteration → test → commit → fresh context → repeat

## Phase Routing

On activation, check the target project's state and route:

- **No `specs/` directory** → you are in **Phase 1**. Run the interactive brainstorm below.
- **`specs/` exists, no `IMPLEMENTATION_PLAN.md`** → Phase 1 is done. Offer two ways to produce the plan: **(A) Ralph planning loop** — `./loop.sh plan` (headless, iterative); **(B) 编写执行计划** — follow @phases/writing-plans.md in this session (interactive, one-shot). Both produce the same fine-grained `IMPLEMENTATION_PLAN.md`.
- **`IMPLEMENTATION_PLAN.md` exists** → Phase 2 is done. Tell the user to run `./loop.sh build` to enter Phase 3.

The user may explicitly name a phase to override auto-detection.

## First Run Setup (before Phase 2/3 can run)

When Phase 1 completes (or before the first loop), copy the loop machinery into the project root so `./loop.sh` works:

- Copy `prompts/PROMPT_plan.md` → project root `PROMPT_plan.md`
- Copy `prompts/PROMPT_build.md` → project root `PROMPT_build.md`
- Copy `scripts/loop.sh` → project root `loop.sh`, then `chmod +x loop.sh`
- Copy `templates/AGENTS.md` → project root `AGENTS.md`, and help the user fill in the real build/test/lint commands (backpressure)

## Phase 1 — Interactive Requirements Definition

Goal: turn a vague idea into `specs/<topic>.md` files. Borrow Superpowers brainstorming discipline; produce Ralph-format specs.

1. Ask **one question at a time**, Socratic style, to identify the **JTBD** (Jobs to Be Done — what the user is hiring the software to do).
2. Split each JTBD into **topics of concern**. Topic-scope test: can you describe it in one sentence without "and"? If you need "and", it's multiple topics — keep splitting.
3. For each topic, write `specs/<topic>.md` using this format:

   ```
   # <Topic name>

   ## JTBD
   <the job this topic serves>

   ## Scope
   <one sentence, no "and">

   ## Acceptance Criteria
   <observable, verifiable outcomes>

   ## Constraints
   <technical/business constraints>
   ```

4. Present specs in chunks for the user to confirm.
5. On approval of all specs, run First Run Setup, then tell the user: "Run `./loop.sh plan` to enter Phase 2 (planning loop)."

Do NOT write application code in Phase 1. Phase 1 produces specs only.

## Phase 2 — Produce IMPLEMENTATION_PLAN.md (two paths)

**Path A — Ralph planning loop (headless):** run `./loop.sh plan [max_iterations]`. Each `claude -p` iteration studies `specs/*` + existing plan, gap-analyzes vs `src/*`, updates `IMPLEMENTATION_PLAN.md`, exits. **Plan only — no implementation.** See `prompts/PROMPT_plan.md`. Stop when stable, on `--max-iterations`, or Ctrl+C.

**Path B — 编写执行计划 (interactive):** follow @phases/writing-plans.md in this session. It produces the same fine-grained tasks (exact paths / complete code / verification steps / no placeholders) — same format as Path A, so Phase 3 doesn't care which path produced it. Use this when the user wants interactive, one-shot planning.

After either path: the user reviews `IMPLEMENTATION_PLAN.md`, then runs `./loop.sh build` for Phase 3.

## Phase 3 — Build Loop

Run via `./loop.sh [max_iterations]`. Each `claude -p` iteration: read `IMPLEMENTATION_PLAN.md`, pick the most important task, implement it, run the tests from `AGENTS.md` (backpressure), update the plan, `git commit` + `git push`, exit. Fresh context each iteration. See `prompts/PROMPT_build.md`.

Stop when `IMPLEMENTATION_PLAN.md` has no remaining tasks, or on `--max-iterations`, or Ctrl+C.

## Safety — READ BEFORE RUNNING A LOOP

The build/plan loops run `claude --dangerously-skip-permissions`, which bypasses ALL of Claude's permission prompts. **A sandbox is your only security boundary.**

- Running outside a sandbox exposes credentials, browser cookies, SSH keys, and access tokens.
- Each iteration runs `git push` to the current branch — make sure the target repo/branch is the intended isolated one. Do NOT run on a shared or production branch.
- Use an isolated environment with minimum viable access: Docker (local), E2B/Fly (remote), least-privilege API keys, restricted network.

**Escape hatches:** Ctrl+C stops the loop; `git reset --hard` reverts uncommitted changes; if the plan goes wrong, delete `IMPLEMENTATION_PLAN.md` and re-run `./loop.sh plan` (the plan is disposable by design).
````

- [ ] **Step 2: 运行结构校验,确认全绿**

Run: `cd /d/devlope/goal-loop && bash tests/verify-structure.sh`
Expected: PASS=N FAIL=0,退出码 0

- [ ] **Step 3: 提交**

```bash
cd /d/devlope/goal-loop
git add skills/goal-loop/SKILL.md
git commit -m "feat: add SKILL.md orchestrator with phase routing and Phase 1 brainstorming"
```

---

### Task 7: README + 端到端 smoke 验证

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: 用户文档;验证安装后 skill 文件就位、loop.sh 可解析参数

- [ ] **Step 1: 写 README**

创建 `README.md`:

````markdown
# goal-loop

A personal Claude Code skill fusing **Superpowers** brainstorming + writing-plans with **Geoff Huntley's Ralph** autonomous loop.

## Three phases

1. **Phase 1** (interactive) — brainstorm JTBD → topics → `specs/*.md`
2. **Phase 2** (`./loop.sh plan`) — gap analysis → `IMPLEMENTATION_PLAN.md` (fine-grained tasks)
3. **Phase 3** (`./loop.sh build`) — per-iteration: pick task → implement → test → commit → push → fresh context

Think/plan layer uses Superpowers; execute layer uses Ralph.

## Install

```bash
./install.sh
```

Installs to `~/.claude/skills/goal-loop/`. Verify:

```bash
bash tests/verify-structure.sh
```

## Usage in a target project

1. In Claude Code, describe what you want to build — the skill activates Phase 1 if no `specs/` exists.
2. Confirm specs, run First Run Setup (skill copies `loop.sh`, `PROMPT_*.md`, `AGENTS.md` to project root; fill `AGENTS.md` test commands).
3. `./loop.sh plan` — generate the implementation plan.
4. `./loop.sh build` — build loop until the plan is empty.

## Safety

Loops use `--dangerously-skip-permissions`. Run in a sandbox. See `SKILL.md` Safety section.

## Verification

```bash
bash tests/verify-structure.sh   # structure + content checks
bash tests/test-loop-args.sh     # loop.sh argument parsing
```
````

- [ ] **Step 2: 端到端 smoke —— 模拟安装到临时目录并校验**

Run:
```bash
cd /d/devlope/goal-loop
TMP="$(mktemp -d)"
cp -r skills/goal-loop "$TMP/"
bash tests/verify-structure.sh "$TMP/goal-loop"
echo "exit=$?"
rm -rf "$TMP"
```
Expected: `PASS=N FAIL=0`,`exit=0`

- [ ] **Step 3: 真实安装到 ~/.claude/skills 并校验**

Run:
```bash
cd /d/devlope/goal-loop
./install.sh
bash tests/verify-structure.sh "$HOME/.claude/skills/goal-loop"
```
Expected: 安装成功 + 校验全绿

- [ ] **Step 4: 手动端到端循环验证(在真实小项目上)**

> 验证 skill 真正端到端工作。依赖外部环境(claude CLI + 沙箱 + 测试项目),无法自动化进 `tests/`,作为发布前手动检查。

在隔离的小项目(如 todo CLI)上:

1. Claude Code 里描述任务 → 确认 skill 激活 Phase 1 → 产出 `specs/`(每 topic 一文件)
2. `./loop.sh plan 3` → 确认产出 `IMPLEMENTATION_PLAN.md`,任务是细粒度(文件路径 / 完整代码 / 验证步骤 = writing-plans 纪律)
3. `./loop.sh build 5` → 确认每轮实现一个任务、跑 `AGENTS.md` 测试、`commit` + `push`
4. 观察三件事:
   - **每轮上下文真清空**(stream-json 输出来自全新进程,非累积)
   - **测试反压生效**(测试失败时 agent 修复而非跳过)
   - **commit 正确**(描述性消息 + 对应 plan 任务标记完成)

- [ ] **Step 5: 提交**

```bash
cd /d/devlope/goal-loop
git add README.md
git commit -m "docs: add README and end-to-end smoke verification"
```
