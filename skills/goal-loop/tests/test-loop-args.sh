#!/bin/bash
# 测试 loop.sh 的参数解析(不实际跑 claude)
set -euo pipefail
LOOP="skills/goal-loop/scripts/loop.sh"
PASS=0; FAIL=0

if [ -f "$LOOP" ]; then echo "PASS: loop.sh exists"; PASS=$((PASS+1));
else echo "FAIL: loop.sh missing"; FAIL=$((FAIL+1)); fi

if grep -qF 'PROMPT_FILE="PROMPT_plan.md"' "$LOOP" 2>/dev/null; then echo "PASS: plan mode"; PASS=$((PASS+1));
else echo "FAIL: no plan mode"; FAIL=$((FAIL+1)); fi

if grep -qF 'PROMPT_FILE="PROMPT_build.md"' "$LOOP" 2>/dev/null; then echo "PASS: build mode"; PASS=$((PASS+1));
else echo "FAIL: no build mode"; FAIL=$((FAIL+1)); fi

if grep -qF '[ "$1" = "build" ]' "$LOOP" 2>/dev/null; then echo "PASS: build keyword"; PASS=$((PASS+1));
else echo "FAIL: no build keyword"; FAIL=$((FAIL+1)); fi

if grep -qF 'claude -p' "$LOOP" 2>/dev/null; then echo "PASS: claude -p invocation"; PASS=$((PASS+1));
else echo "FAIL: no claude -p"; FAIL=$((FAIL+1)); fi

if grep -qF 'git push' "$LOOP" 2>/dev/null; then echo "PASS: git push per iteration"; PASS=$((PASS+1));
else echo "FAIL: no git push"; FAIL=$((FAIL+1)); fi

echo "PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
