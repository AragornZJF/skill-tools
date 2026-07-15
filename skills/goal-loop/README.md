# goal-loop

> 一个从*澄清需求、需求规划*、到*自动化构建代码交付*的 Claude Code skill。

## 是什么

**goal-loop** 把三套方法论融合为一条流水线，让 AI 替你完成「想清楚 → 写下来 → 干出来」：

| 层 | 方法论 | 做什么 | 产出 |
|---|---|---|---|
| **澄清需求** | brainstorming（头脑风暴） | 苏格拉底式反向提问，把模糊想法拆成最小关注单元 | `specs/<topic>.md` |
| **规划** | writing-plans（计划编写） | 对比 specs ↔ 现有代码，列出细粒度任务清单 | `IMPLEMENTATION_PLAN.md` |
| **执行** | Ralph Loop（Geoff Huntley） | 每轮清空上下文，选任务 → 实现 → 测试 → 提交 → 推送 | 真实代码 + git commit |

**一句话**：你说"我想做个 X"，goal-loop 会先把 X 问清楚、再拆成可执行计划、最后挂一条无人值守循环把 X 跑成代码。

---

## 工作流程

```
┌─ Phase 1 思考（交互式） ──────────────────────────────────┐
│  模糊想法 ──▶ JTBD ──▶ topics ──▶ specs/<topic>.md         │
└────────────────────────┬───────────────────────────────────┘
                         │ specs/ 是事实来源
                         ▼
┌─ Phase 2 规划（二选一） ──────────────────────────────────┐
│  默认：交互式一次性产出 IMPLEMENTATION_PLAN.md             │
│  备选：./loop.sh plan [N]  无头循环迭代收敛                │
└────────────────────────┬───────────────────────────────────┘
                         │ IMPLEMENTATION_PLAN.md
                         ▼
┌─ Phase 3 执行（自主循环） ────────────────────────────────┐
│  ./loop.sh build [N]                                       │
│  每轮: 读 plan → 选任务 → 实现 → 测试(反压)               │
│       → 更新 plan → git commit + push → 退出 → 重启        │
└────────────────────────────────────────────────────────────┘
```

**触发词与阶段入口**（用关键词激活；若与文件状态冲突 skill 会先与你确认）：

| 阶段 | 触发词 |
|------|--------|
| Phase 1 | 探索需求、探索设计、用户意图、先探索再实现、需求澄清 |
| Phase 2 | 写实现计划、写计划、做计划、实现计划、IMPLEMENTATION_PLAN、写 plan |
| Phase 3 | goal loop、自主构建、Ralph 循环、构建循环、自动构建、loop build |

**停止条件**：plan 清空 / `--max-iterations` / `Ctrl+C`。

---

## 数据流（文件即状态）

每一阶段的产物就是下一阶段唯一的输入；**文件就是循环的全部记忆，进程本身无状态**。

```
 用户对话（Phase 1）
        │
        ▼
   specs/*.md ──┐
                │ (Phase 2 默认: writing-plans 交互)
                │ (Phase 2 备选: ./loop.sh plan)
                ▼
   IMPLEMENTATION_PLAN.md ──┐
                            │ (Phase 3: ./loop.sh build)
                            ▼
                    build/ 内代码 + git history
                            │
                            ▼ 每轮回写
                    IMPLEMENTATION_PLAN.md (状态更新)
                            │
                            └── AGENTS.md (测试命令做反压闸门)
```

**关键术语**：

- **JTBD** — Jobs to Be Done，从用户视角描述价值（"用户雇这个产品完成什么工作"）
- **topics** — 按"一句话不带'且'"拆分的最小关注单元
- **specs/** — JTBD + 范围 + 验收标准 + 约束
- **IMPLEMENTATION_PLAN.md** — 细粒度任务（每个 2–5 分钟），含确切文件路径、完整代码、验证步骤
- **AGENTS.md** — 反压配置，定义 `build` / `test` / `lint` 命令；测试失败必须修复，不可跳过
- **wrapper** — 项目根的 `loop.sh` / `clean-state.sh`，是 2 行转发脚本，把命令转发到真实的 skill 内脚本（项目级优先、回退用户级）

**核心机制**：

| 机制 | 说明 |
|---|---|
| 真·上下文重置 | 每轮 `claude -p` 新进程，避免长会话决策退化 |
| 文件即状态 | `specs/` / `IMPLEMENTATION_PLAN.md` / `AGENTS.md` 是跨轮次唯一记忆 |
| Backpressure | `AGENTS.md` 的 test 命令是质量闸门，失败必修复 |
| 并行 Subagent | 每轮 up to 250–500 Sonnet 并行搜索/读取 + 独立测试进程 |
| git push 每轮 | 自动推送；失败则建远程分支；构建通过自动打 tag |
| wrapper 自适应 | `loop.sh` 项目级找不到则回退用户级，调用方无需关心安装位置 |

---

## 项目目录结构

### Skill 源（两种安装位置二选一）

| 位置 | 路径 | 适用场景 |
|---|---|---|
| 用户级 | `$HOME/.claude/skills/goal-loop/` | 所有项目共享一份 |
| 项目级 | `<project-root>/.claude/skills/goal-loop/` | 单仓库内携带，便于团队同步 |

```
goal-loop/                      # skill 源（位置如上表）
├── SKILL.md                    # 入口：触发词路由 + 阶段路由 + 首次运行设置 + 安全
├── README.md                   # 本文档
├── QUICKSTART.md               # 详细介绍 / 适用人群 / 完整上手指南
├── ARCHITECTURE.md             # 架构总览（融合分工矩阵、运行机制）
├── phases/
│   ├── brainstorming.md        # Phase 1 方法论
│   └── writing-plans.md        # Phase 2 默认方法论
├── prompts/
│   ├── PROMPT_plan.md          # Phase 2 备选（Ralph + writing-plans 纪律）
│   └── PROMPT_build.md         # Phase 3（how-to-ralph-wiggum 原版）
├── templates/
│   └── AGENTS.md               # 反压配置模板
├── scripts/
│   ├── loop.sh                 # 真实循环驱动器
│   └── clean-state.sh          # 清空项目状态
└── docs/                       # 设计 spec + 实现计划 + 流程图
```

### 目标项目运行时产物（落在你的项目根）

首次运行 skill 后，你的项目根会出现：

```
<your-project>/
├── specs/                      ◀ Phase 1 产出（提交）
├── build/                      ◀ Phase 3 实际写代码的地方（提交）
├── IMPLEMENTATION_PLAN.md      ◀ Phase 2 产出（提交，状态会被循环更新）
├── AGENTS.md                   ◀ 反压配置：build/test/lint 命令（提交）
├── loop.sh                     ◀ wrapper，自动生成（推荐加入 .gitignore）
└── clean-state.sh              ◀ wrapper，自动生成（推荐加入 .gitignore）
```

wrapper 长这样（2 行，项目级优先、回退用户级）：

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -x "$SCRIPT_DIR/.claude/skills/goal-loop/scripts/loop.sh" ]; then
    exec "$SCRIPT_DIR/.claude/skills/goal-loop/scripts/loop.sh" "$@"
else
    exec "$HOME/.claude/skills/goal-loop/scripts/loop.sh" "$@"
fi
```

---

## 快速上手

### 1. 安装 skill

> 📌 本仓库已在 `.claude/skills/goal-loop/` 内置 skill，**无需重新安装**，跳到第 2 步。

如需在新项目首次安装，回到 goal-loop 源仓库执行：

```bash
./install.sh
bash tests/verify-structure.sh   # 验证目录结构
bash tests/test-loop-args.sh     # 验证 loop.sh 参数解析
```

### 2. 用触发词激活

在 Claude Code 会话里说：

> "帮我**探索需求**：我想做一个 XXXXX。"

skill 会根据项目状态自动路由：

| 当前文件状态 | 进入阶段 |
|---|---|
| 没有 `specs/` | Phase 1（澄清需求） |
| 有 `specs/`，无 `IMPLEMENTATION_PLAN.md` | Phase 1→2 过渡（首次运行设置 + 选规划路径） |
| 有 `IMPLEMENTATION_PLAN.md` | Phase 2→3 过渡（提示运行 `./loop.sh build`） |

### 3. Phase 1：澄清需求

跟随苏格拉底式提问回答用户、场景、价值、约束等问题，最终产出 `specs/*.md`。**确认无误后继续。**

### 4. 首次运行设置（自动）

Phase 1 通过后 skill 会自动：

```bash
mkdir -p build specs                           # 基础目录
# 生成 loop.sh / clean-state.sh                # wrapper
# 复制 templates/AGENTS.md 到项目根             # 反压配置
# 若 build/package.json 存在，自动检测命令填入  # AGENTS.md 命令占位符
```

**检查 `AGENTS.md`**，把 build/test/lint 命令补全为项目实际值，例如：

```markdown
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
```

### 5. Phase 2：生成实施计划

默认走交互式路径，在当前会话一次性产出 `IMPLEMENTATION_PLAN.md`。  
也可选 `./loop.sh plan [N]` 用循环迭代收敛。

**审查计划**：每个任务 2–5 分钟、路径明确、可验证。

### 6. Phase 3：启动自动构建

```bash
./loop.sh build        # 无限轮次，直到 plan 清空
./loop.sh build 20     # 最多 20 轮
./loop.sh 20           # 数字简写 = build 20
./loop.sh plan [N]     # 规划模式（仅迭代 plan，不实现代码）
```

**逃生口**：

- `Ctrl+C` 停止循环
- `git reset --hard` 回滚未提交改动
- 删除 `IMPLEMENTATION_PLAN.md` 重新跑 Phase 2（计划按设计是可丢弃的）

---

## 安全（运行循环前必读）

`./loop.sh` 以 `claude --dangerously-skip-permissions` 运行，**绕过所有权限提示**：

- **沙箱是唯一安全边界**；沙箱外运行会暴露凭据、cookie、SSH 密钥
- 每轮自动 `git push`，请确保当前分支是隔离分支，**不要在生产分支上运行**
- 推荐在 Docker / E2B / Fly 等隔离环境中使用，并配置最小权限 API 密钥

---

## 进一步阅读

- [`SKILL.md`](SKILL.md) — skill 入口源文件（触发词路由 + 阶段路由 + 首次运行设置）
- [`docs/goal-loop-design.md`](docs/goal-loop-design.md) — 原始设计 spec
- [`docs/goal-loop.md`](docs/goal-loop.md) — 实现计划
