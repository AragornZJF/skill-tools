---
name: git-commit
description: Interactive Conventional Commits workflow with step-by-step
  confirmation. Use when the user asks to create a git commit, write a commit
  message, or stage uncommitted changes. Triggers on "git commit"、"提交"、
  "创建提交"、"commit message"、"提交代码"、"conventional commit"、"写提交信息"、"cc".
---

# git-commit Skill

交互式 Git 提交工作流，严格遵循项目 commitlint 配置（Conventional Commits）。
**每一步都需用户确认后才继续**，绝不静默提交。

## 工作流（7 步，逐步确认）

### Step 1 · 读取变更（只读）
运行：
```bash
git status && git diff HEAD && git status --porcelain
```
- 若不是 git 仓库 → 询问是否 `git init`，等待确认后再继续
- 向用户展示：变更文件清单 + 简短 diff 摘要

### Step 2 · 确认提交范围 ⏸ 等待确认
- 默认建议 `git add .`（全部）
- 用户可改为指定文件列表
- 必须收到 yes / 文件清单 才能进入下一步

### Step 3 · 推断 type ⏸ 等待确认
基于 diff 内容推荐，备选项必须来自下表：

| Type | 说明 |
|---|---|
| feat | 新增功能 |
| fix | 修复缺陷 |
| docs | 文档变更 |
| style | 代码格式（不影响运行） |
| refactor | 代码重构 |
| perf | 性能优化 |
| test | 添加测试或修改现有测试 |
| build | 构建流程、外部依赖变更 |
| ci | 修改 CI 配置、脚本 |
| chore | 辅助工具变更 |
| revert | 回滚 commit |
| wip | 开发中 |
| workflow | 工作流程改进 |
| types | TypeScript 类型定义文件修改 |
| release | 发布版本 |

推断启发式：
- 仅 `*.md` / `docs/` → `docs`
- `package.json` / `pnpm-lock.yaml` 等 → `build`
- `.github/` / `.gitlab-ci.yml` → `ci`
- `*.test.*` / `__tests__/` → `test`
- 新增 `src/` 文件 → `feat`
- 修改 `src/` 已有逻辑且含 bug 关键词 → `fix`
- 仅缩进/空白 → `style`
- 其他 → 给出 top 2 建议让用户选

### Step 4 · 推断 scope ⏸ 等待确认
- 扫描 `src/` 下变更涉及的子目录名 → 取最深公共前缀
- 无 `src/` 时建议常用值：`api`、`components`、`utils`、`mock`
- 跨多个模块 → 建议省略 scope
- 用户可改写或留空

### Step 5 · 生成 subject ⏸ 等待确认
- 祈使句、≤72 字符
- 中文可，但用英文动词风格表达（"add"、"fix"、"refactor"）
- 展示后允许用户直接编辑

### Step 6 · 询问 body / footer ⏸ 等待输入
- body：多行用 `|` 分隔（项目规范）
- footer：可关联 Issue（`Closes #N`）或 `BREAKING CHANGE:`
- 用户可全部跳过（回车）

### Step 7 · 预览 + 最终确认 ⏸ 等待 yes
展示完整 commit message：
```
<type>(<scope>): <subject>

<body>

<footer>
```
长度自检：
- subject ≤72 字符 ✓
- type ∈ 允许集合 ✓

收到 yes 后执行：
```bash
git add <files>
git commit -m "<subject>" -m "<body>" -m "<footer>"
```
输出 commit hash 与影响文件数。

任何一步收到 "no" / "取消" → 立即中止，不做任何修改。

## 输出示例
```
feat(api): 添加用户身份验证端点

- 实现 JWT 令牌验证
- 添加登录/注销路由

Closes #42
```

## 禁止行为
- ❌ 跳过任何确认步骤
- ❌ 静默 `git push`（本 skill 不负责推送）
- ❌ 使用 `git commit --no-verify`
- ❌ 在用户未确认时执行 `git add` 或 `git commit`
- ❌ 修改用户已暂存但未列入本次范围的文件
