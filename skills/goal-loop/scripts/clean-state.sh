#!/bin/bash
# 清空项目状态：清空 IMPLEMENTATION_PLAN.md、移除 build/*、移除 specs/*
# Usage: ./clean-state.sh [--confirm]
# Options:
#   --confirm    跳过确认提示（用于自动化脚本）
#   --help       显示此帮助

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 帮助信息
if [ "${1:-}" = "--help" ]; then
    cat <<EOF
清空项目状态工具

Usage: ./clean-state.sh [--confirm]

重置以下内容到初始状态：
  - IMPLEMENTATION_PLAN.md   → 清空内容
  - build/*                  → 移除所有文件
  - specs/*                  → 移除所有文件

Options:
  --confirm    跳过确认提示
  --help       显示此帮助

Examples:
  ./clean-state.sh              # 交互模式（会确认）
  ./clean-state.sh --confirm    # 自动模式（跳过确认）

注意：
  - 此操作不可逆，请确保已提交重要更改
  - 如需回滚，使用 git checkout -- <file>
EOF
    exit 0
fi

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "清空项目状态"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查是否有未提交的更改
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo -e "${RED}⚠️  警告：检测到未提交的更改${NC}"
    echo "建议先提交或回滚更改后再运行此脚本"
    echo ""
fi

# 列出将被删除/清空的内容
echo "以下内容将被清空："
echo ""

items_to_clean=()

# 检查 IMPLEMENTATION_PLAN.md
if [ -f "IMPLEMENTATION_PLAN.md" ] && [ -s "IMPLEMENTATION_PLAN.md" ]; then
    size=$(du -h IMPLEMENTATION_PLAN.md | cut -f1)
    echo "  📄 IMPLEMENTATION_PLAN.md ($size)"
    items_to_clean+=("IMPLEMENTATION_PLAN.md")
fi

# 检查 build/ 目录
if [ -d "build" ] && [ "$(ls -A build/ 2>/dev/null)" ]; then
    total=$(find build -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)
    echo "  📁 build/（$total 项）"
    items_to_clean+=("build/*")
fi

# 检查 specs/ 目录
if [ -d "specs" ] && [ "$(ls -A specs/ 2>/dev/null)" ]; then
    count=$(find specs -type f 2>/dev/null | wc -l)
    echo "  📁 specs/ ($count 个文件)"
    items_to_clean+=("specs/*")
fi

if [ ${#items_to_clean[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 无需清理，项目已处于干净状态${NC}"
    exit 0
fi

echo ""

# 确认提示
if [ "${1:-}" != "--confirm" ]; then
    echo -e "${YELLOW}⚠️  此操作不可逆！${NC}"
    read -p "确认继续？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
fi

# 执行清理
echo "开始清理..."
echo ""

# 1. 清空 IMPLEMENTATION_PLAN.md
if [ -f "IMPLEMENTATION_PLAN.md" ]; then
    echo "  ✓ 清空 IMPLEMENTATION_PLAN.md"
    > IMPLEMENTATION_PLAN.md
fi

# 2. 移除 build/ 全部文件
if [ -d "build" ]; then
    rm -rf build/*
    echo "  ✓ 移除 build/*（全部文件）"
fi

# 3. 清空 specs/ 目录
if [ -d "specs" ]; then
    echo "  ✓ 清空 specs/ 目录"
    rm -rf specs/*
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 清理完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "下一步："
echo "  1. 重新运行 Phase 1（头脑风暴）生成新的 specs/"
echo "  2. 或运行 ./loop.sh plan 进入 Phase 2"
echo ""
