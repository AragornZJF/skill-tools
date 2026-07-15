#!/bin/bash
# Usage: ./loop.sh [plan|build] [max_iterations]
# Examples:
#   ./loop.sh build        # Build mode, unlimited iterations
#   ./loop.sh build 20     # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations
#   ./loop.sh              # Build mode, unlimited (shorthand for ./loop.sh build)

export LANG=C.UTF-8

AGENTS_FILE="AGENTS.md"
PLAN_FILE="IMPLEMENTATION_PLAN.md"
BUILD_DIR="build"
SPECS_DIR="specs"
STATE_FILE=".loop-state"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$SCRIPT_DIR/skills/goal-loop" ]; then
  SKILL_DIR="$SCRIPT_DIR/skills/goal-loop"
else
  SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

write_state() {
  echo "iter=$1 task=$2" > "$STATE_FILE"
}

count_tasks() {
  if [ ! -f "$PLAN_FILE" ]; then echo -n 0; return; fi
  grep -c '^### Task ' "$PLAN_FILE" 2>/dev/null || true
}

list_tasks() {
  if [ ! -f "$PLAN_FILE" ]; then return; fi
  grep -n '^### Task ' "$PLAN_FILE" 2>/dev/null | sed 's/^\([0-9]*\):### Task \(.*\)/  \1. \2/'
}

first_task_title() {
  if [ ! -f "$PLAN_FILE" ]; then echo -n "—"; return; fi
  grep -m1 '^### Task ' "$PLAN_FILE" 2>/dev/null | sed 's/^### Task //'
}

# Parse arguments
if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "build" ]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

# First Run Setup — auto-prepare project root files
if [ ! -f "$AGENTS_FILE" ]; then
  cp "$SKILL_DIR/templates/AGENTS.md" "$AGENTS_FILE" 2>/dev/null && echo "Created $AGENTS_FILE"
fi
if [ ! -d "$BUILD_DIR" ]; then
  mkdir -p "$BUILD_DIR" && echo "Created $BUILD_DIR/"
fi
if [ ! -d "$SPECS_DIR" ]; then
  mkdir -p "$SPECS_DIR" && echo "Created $SPECS_DIR/"
fi

# Auto-detect commands from build/package.json and fill AGENTS.md placeholders
_fill_agents_cmds() {
  local pkg="$BUILD_DIR/package.json"
  [ ! -f "$pkg" ] || [ ! -f "$AGENTS_FILE" ] && return
  local has_change=false
  for key in build dev test typecheck lint; do
    local val
    val=$(grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$pkg" 2>/dev/null | head -1 | sed 's/.*: *"\(.*\)"/\1/')
    if [ -n "$val" ]; then
      val_esc=$(printf '%s\n' "$val" | sed 's/[&/\]/\\&/g')
      sed -i "s/\[$key command\]/$val_esc/g" "$AGENTS_FILE"
      has_change=true
    fi
  done
  # Fallback for typecheck and lint
  if grep -q '\[typecheck command\]' "$AGENTS_FILE" 2>/dev/null; then
    if [ -f "$BUILD_DIR/tsconfig.json" ]; then
      sed -i 's/\[typecheck command\]/npx tsc --noEmit/g' "$AGENTS_FILE"
      has_change=true
    fi
  fi
  if grep -q '\[lint command\]' "$AGENTS_FILE" 2>/dev/null; then
    if [ -f "$BUILD_DIR/tsconfig.json" ]; then
      sed -i 's/\[lint command\]/npx tsc --noEmit/g' "$AGENTS_FILE"
      has_change=true
    fi
  fi
  $has_change && echo "Filled AGENTS.md commands from $pkg"
}
_fill_agents_cmds

# Resume detection: check if previous run was interrupted
RESUMED=false
if [ -f "$STATE_FILE" ]; then
  LAST_STATE=$(cat "$STATE_FILE")
  echo "[!] Detected previous interruption (iter $LAST_STATE), resuming..."
  RESUMED=true
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
$RESUMED && echo "State:  [resumed]"

TOTAL_TASKS=$(count_tasks)
if [ "$MODE" = "build" ]; then
  if [ "$PLAN_FILE" ] && [ "$TOTAL_TASKS" -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Task List ($TOTAL_TASKS total):"
    list_tasks
  fi
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify prompt file exists in skill directory
PROMPT_PATH="$SKILL_DIR/prompts/$PROMPT_FILE"
if [ ! -f "$PROMPT_PATH" ]; then
    echo "Error: $PROMPT_FILE not found at $PROMPT_PATH"
    exit 1
fi

TASKS_BEFORE=$(count_tasks)

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        rm -f "$STATE_FILE"
        break
    fi

    TASKS_BEFORE=$(count_tasks)
    TASKS_DONE=$(( (TOTAL_TASKS) - (TASKS_BEFORE) ))
    NEXT_TASK=$(first_task_title)

    START_TIME=$(date +%s)
    echo "────────────────────────────────────────"
    echo "[$(date '+%H:%M:%S')] Iter $((ITERATION + 1)) start — $NEXT_TASK"
    echo "────────────────────────────────────────"

    # Write state marker (preserved across interruptions)
    write_state "$((ITERATION + 1))" "$NEXT_TASK"

    # Run Ralph iteration with selected prompt (from skill directory)
    cat "$PROMPT_PATH" | claude -p \
        --allow-dangerously-skip-permissions \
        --dangerously-skip-permissions \
        --model opus \
        --verbose

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "────────────────────────────────────────"
    echo "[$(date '+%H:%M:%S')] Iter $((ITERATION + 1)) done — ${DURATION}s elapsed"
    echo "────────────────────────────────────────"

    # Push changes after each iteration (skip if no remote)
    if git remote get-url origin &>/dev/null; then
      git push origin "$CURRENT_BRANCH" 2>&1 || {
        echo "[!] Push failed, creating remote branch..."
        git push -u origin "$CURRENT_BRANCH" 2>&1 || echo "[!] No remote access, skipping push"
      }
    else
      echo "[!] No remote 'origin', skipping git push"
    fi

    ITERATION=$((ITERATION + 1))

    # Show progress summary after iteration
    if [ "$MODE" = "build" ]; then
      TASKS_AFTER=$(count_tasks)
      COMPLETED_THIS=$((TASKS_BEFORE - TASKS_AFTER))
      TASKS_DONE_NOW=$((TOTAL_TASKS - TASKS_AFTER))
      if [ "$COMPLETED_THIS" -gt 0 ]; then
        echo "Completed: $COMPLETED_THIS task(s) this iteration"
      fi
      if [ "$TASKS_AFTER" -gt 0 ]; then
        echo "Progress: [$TASKS_DONE_NOW/$TOTAL_TASKS] done, $TASKS_AFTER remaining"
      else
        echo "All $TOTAL_TASKS tasks completed!"
        rm -f "$STATE_FILE"
        break
      fi
    fi

    echo ""
    echo "======================== LOOP $ITERATION ========================"
    echo ""
done
