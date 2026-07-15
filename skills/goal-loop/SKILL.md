---
name: goal-loop
description: "结合头脑风暴、计划编写与 Ralph Loop 构建循环。按触发词进入三阶段：「探索需求/设计/先探索再实现」→ Phase 1 头脑风暴产出 specs；「写实现计划/做计划」→ Phase 2 产出 IMPLEMENTATION_PLAN；「goal loop/自主构建」→ Phase 3 无头实现-测试-提交循环。skill 会根据项目状态自动修正路由，冲突时优先与你确认。"
---

# goal-loop

结合头脑风暴、编写计划方法论与 Ralph Loop 自主循环。三个阶段：

1. **Phase 1（交互式，当前会话）** — 头脑风暴将JTBD (Job-to-be-Done) 待完成的工作，拆分为主题，编写 `specs/<topic>.md`
2. **Phase 2（默认）** — 产出 `IMPLEMENTATION_PLAN.md`（细粒度任务）。备选：`./loop.sh plan` Ralph 循环产出 `IMPLEMENTATION_PLAN.md`。
3. **Phase 3（构建循环，外部）** — `./loop.sh build` → 每轮实现一个任务 → 测试 → 提交 → 清空上下文 → 重复

## 触发词与阶段路由

本 skill 通过**触发词**和**项目状态**共同决定入口。下表列出每个阶段的触发词：

| 阶段 | 触发词 |
|------|--------|
| Phase 1（需求/设计探索） | 探索需求、探索设计、用户意图、先探索再实现、需求澄清 |
| Phase 2（实现计划编制） | 写实现计划、写计划、做计划、实现计划、IMPLEMENTATION_PLAN、写 plan |
| Phase 3（无头构建循环） | goal loop、自主构建、Ralph 循环、构建循环、自动构建、loop build |

路由规则：

1. 若触发词指向某阶段，**且**项目状态允许（见下方「阶段路由」），直接进入该阶段。
2. 若触发词与项目状态冲突（例如 `specs/` 已存在但用户说「探索需求」），**先与用户确认**：是补充/重做需求探索，还是按状态进入下一阶段。
3. 若用户未使用任何触发词（仅靠 description 匹配进入），按下方「阶段路由」纯文件状态自动判断。

## 阶段路由

激活时，检查目标项目状态并路由：

- **没有 `specs/` 目录** → 处于 **Phase 1**。运行下面的交互式头脑风暴。
- **`specs/` 存在，没有 `IMPLEMENTATION_PLAN.md`** → Phase 1 已完成。进入 **Phase 1 → Phase 2 过渡** 节点，让用户在「默认交互式计划」与「`./loop.sh plan` Ralph 循环」之间二选一，再据此进入 Phase 2。
- **`IMPLEMENTATION_PLAN.md` 存在** → Phase 2 已完成。进入 **Phase 2 → Phase 3 过渡** 节点：默认提示用户运行 `./loop.sh build` 进入无头构建循环；仅当用户明确要求时，才在当前窗口手工实现。

用户可以显式使用上节「触发词与阶段路由」中的触发词覆盖自动检测；触发词与文件状态冲突时按上节规则 2 处理。

## 首次运行设置（Phase 1→2 过渡时自动执行）

Phase 1 通过用户批准后，在过渡到 Phase 2 之前自动执行以下准备步骤。skill 可能安装在 `$HOME/.claude/skills/goal-loop/`（用户级），也可能位于项目内 `<project>/.claude/skills/goal-loop/`（项目级）；wrapper 会同时兼容这两种位置。

### 1. 基础目录

执行：
```bash
mkdir -p build specs
```

### 2. 创建 wrapper 脚本

生成 `loop.sh` 和 `clean-state.sh`，优先指向项目内 skill 路径，回退到用户 home：
```bash
cat > loop.sh << 'WRAPPER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -x "$SCRIPT_DIR/.claude/skills/goal-loop/scripts/loop.sh" ]; then
    exec "$SCRIPT_DIR/.claude/skills/goal-loop/scripts/loop.sh" "$@"
else
    exec "$HOME/.claude/skills/goal-loop/scripts/loop.sh" "$@"
fi
WRAPPER
chmod +x loop.sh

cat > clean-state.sh << 'WRAPPER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -x "$SCRIPT_DIR/.claude/skills/goal-loop/scripts/clean-state.sh" ]; then
    exec "$SCRIPT_DIR/.claude/skills/goal-loop/scripts/clean-state.sh" "$@"
else
    exec "$HOME/.claude/skills/goal-loop/scripts/clean-state.sh" "$@"
fi
WRAPPER
chmod +x clean-state.sh
```

### 3. AGENTS.md（反压配置）

将 skill 的 `templates/AGENTS.md` 复制到项目根，然后从 `build/package.json` 自动检测 `scripts.{build,dev,test,typecheck,lint}` 填入占位符；未检测到的留空供用户后续补充。

### 4. 用户确认

完成后告知用户：

> "首次运行设置完成。已创建：`loop.sh`、`clean-state.sh`、`AGENTS.md`。请确认 `AGENTS.md` 中的测试命令是否正确，然后继续。"


## Phase 1 — 交互式需求定义

按照 @phases/brainstorming.md 执行完整 brainstorming 流程。

**硬性门禁：** 在完成整个 brainstorming 流程并获得用户批准之前，不得调用任何实现技能、写任何代码、搭建任何项目骨架。

## Phase 1 → Phase 2 过渡

Phase 1 完成、首次运行设置执行完毕后，在生成实现计划之前，必须显式让用户在两种 Phase 2 执行方式中二选一：

> Phase 1 已完成。接下来有两种方式产出 `IMPLEMENTATION_PLAN.md`，请选择：
>
> 1. **Phase 2（默认）** — 在当前会话中交互式调用 `@phases/writing-plans.md`，一次性产出 `IMPLEMENTATION_PLAN.md`（细粒度任务）。
> 2. **`./loop.sh plan`** — Ralph 规划循环（无头），让 `claude -p` 反复读取 `specs/*` 与 `build/*` 做差距分析，迭代产出 `IMPLEMENTATION_PLAN.md`。⚠️ 该循环以 `claude --dangerously-skip-permissions` 运行，请先阅读下面的「安全」章节并在隔离环境中执行。
>
> 请回复 `1` 或 `2`（默认 `1`）。

- 用户选择 **1**（或未选择按默认）：在当前会话调用 `@phases/writing-plans.md` 进入 Phase 2。
- 用户选择 **2**：告知用户运行 `./loop.sh plan [max_iterations]`，并强调此循环**仅规划、不实现代码**。

两条路径产出的 `IMPLEMENTATION_PLAN.md` 格式相同。

## Phase 2 → Phase 3 过渡

`IMPLEMENTATION_PLAN.md` 产出并经用户审查后，在开始实现之前，显式告知用户默认走无头构建循环：

> `IMPLEMENTATION_PLAN.md` 已就绪。**默认**：运行 `./loop.sh build [max_iterations]` 进入 Phase 3 无头构建循环（推荐）。⚠️ 该循环以 `claude --dangerously-skip-permissions` 运行，请先阅读下面的「安全」章节并在隔离环境中执行。
>
> 如需在**当前窗口**手工实现（不进入无头循环），请明确告知，我将按 `IMPLEMENTATION_PLAN.md` 在当前会话逐项实现。

- 用户未明确要求在当前窗口实现 → 默认提示运行 `./loop.sh build`，本会话不直接写实现代码。
- 用户明确要求在当前窗口实现 → 按 `IMPLEMENTATION_PLAN.md` 在当前会话逐项实现，每完成一项更新计划状态并运行 `AGENTS.md` 中的测试命令。

## Phase 2 — 产出 IMPLEMENTATION_PLAN.md（二选一）

**默认 — 编写执行计划（交互式，一次性）：**

按照 @phases/writing-plans.md 将 specs 拆解为细粒度任务清单，产出 `IMPLEMENTATION_PLAN.md`。

**备选 — Ralph 规划循环（无头）：** 运行 `./loop.sh plan [max_iterations]`。每轮 `claude -p` 研究 `specs/*` + 现有计划，与 `build/*` 做差距分析，更新 `IMPLEMENTATION_PLAN.md`，退出。**仅规划——不实现。** 参见 `prompts/PROMPT_plan.md`。稳定时、达到 `--max-iterations` 或 Ctrl+C 时停止。

两种路径完成后：用户审查 `IMPLEMENTATION_PLAN.md`，然后运行 `./loop.sh build` 进入 Phase 3。

## Phase 3 — 构建循环

**默认（推荐）：** 通过 `./loop.sh build [max_iterations]` 运行无头循环。每轮 `claude -p`：读取 `IMPLEMENTATION_PLAN.md`，选择最重要的任务，实现它，运行 `AGENTS.md` 中的测试（反压），更新计划，`git commit` + `git push`，退出。每轮清空上下文。参见 `prompts/PROMPT_build.md`。

当 `IMPLEMENTATION_PLAN.md` 没有剩余任务时停止，或达到 `--max-iterations`，或 Ctrl+C。

**仅当用户明确要求在当前窗口实现时**，才在本会话按 `IMPLEMENTATION_PLAN.md` 逐项实现：每完成一项更新计划状态、运行 `AGENTS.md` 测试命令，并按需 `git commit`。默认路径仍然是无头循环——除非用户开口，不要在当前会话直接动手写实现代码。

## 安全 — 运行循环前必须阅读

构建/规划循环以 `claude --dangerously-skip-permissions` 运行，绕过 Claude 的所有权限提示。**沙箱是你的唯一安全边界。**

- 在沙箱外运行会暴露凭据、浏览器 cookie、SSH 密钥和访问令牌。
- 每轮迭代运行 `git push` 到当前分支——确保目标仓库/分支是预期的隔离仓库。不要在共享或生产分支上运行。
- 使用隔离环境，最小化访问权限：Docker（本地）、E2B/Fly（远程）、最小权限 API 密钥、受限网络。

**逃生口：** Ctrl+C 停止循环；`git reset --hard` 回滚未提交的更改；如果计划出错，删除 `IMPLEMENTATION_PLAN.md` 并重新运行 `./loop.sh plan`（计划按设计是可丢弃的）。
