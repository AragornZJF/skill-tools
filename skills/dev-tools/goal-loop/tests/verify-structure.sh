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
  if grep -qiE '\bTBD\b|TODO|FIXME|\[project-specific' "$SKILL_DIR/$1" 2>/dev/null; then
    echo "FAIL: $1 has placeholder"; FAIL=$((FAIL+1));
  else echo "PASS: $1 has no placeholder"; PASS=$((PASS+1)); fi
}

# 必需文件
check_file SKILL.md
check_file phases/brainstorming.md
check_file phases/writing-plans.md
check_file prompts/PROMPT_plan.md
check_file prompts/PROMPT_build.md
check_file templates/AGENTS.md
check_file scripts/loop.sh

# frontmatter
check_contains SKILL.md "name: goal-loop"
check_contains SKILL.md "description:"

# 关键内容
check_contains phases/brainstorming.md "JTBD"
check_contains phases/brainstorming.md "2-3"
check_contains phases/brainstorming.md "Spec 自检"
check_contains phases/writing-plans.md "2-5 分钟"
check_contains phases/writing-plans.md "完整代码"
check_contains phases/writing-plans.md "验证步骤"
check_contains prompts/PROMPT_plan.md "writing-plans"
check_contains prompts/PROMPT_plan.md "不要假设"
check_contains prompts/PROMPT_plan.md "build/*"
check_contains prompts/PROMPT_build.md "git push"
check_contains prompts/PROMPT_build.md "999999."
check_contains prompts/PROMPT_build.md "build/*"
check_contains scripts/loop.sh "First Run Setup"
check_contains scripts/loop.sh 'mkdir -p "$BUILD_DIR"'
check_contains scripts/loop.sh 'mkdir -p "$SPECS_DIR"'
check_contains scripts/loop.sh "claude -p"
check_contains scripts/loop.sh "PROMPT_plan.md"

# 无占位符
check_no_placeholder SKILL.md

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
