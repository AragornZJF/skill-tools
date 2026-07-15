# goal-loop — 设计文档

- **日期**:2026-06-22
- **Skill 名称**:`goal-loop`
- **状态**:设计已批准,待写实现计划
- **归宿**:个人 skill(`~/.claude/skills/goal-loop/`)

## 1. 概述

`goal-loop` 是一个个人 skill,融合两套方法论:

- **Superpowers** 的对话式 `brainstorming` + `writing-plans` 的方法论深度(一次一问、JTBD、分块确认、无占位符纪律)
- **Geoff Huntley 的 Ralph** 的自主循环机制(文件化状态、双 prompt、清空上下文迭代、backpressure)

它把软件开发拆成三阶段:**Phase 1** 交互式产出 `specs/*.md` → **Phase 2** 规划循环产出 `IMPLEMENTATION_PLAN.md` → **Phase 3** 构建循环自主实现、测试、提交。前期用**外部 bash 循环**驱动(每轮全新 `claude -p` 进程 = 真正清空上下文)。

## 2. 背景与动机

现状三块拼图各有缺口:

- **Superpowers**:有极强的 brainstorming + writing-plans + TDD + 两阶段审查,但**无循环/自主迭代**——单次会话内走完流程就结束。
- **ralph-loop 插件 v1.0.0**(已安装):有最小循环骨架(Stop 钩子重喂同一 prompt),但**无方法论**——没有 specs/JTBD、没有双 prompt、没有任务清单、没有 backpressure。
- **how-to-ralph-wiggum**:是 Ralph 方法论的精美手册,但**无可用实现**。

融合填补的空白:**Superpowers 的高质量对话式前置 + Ralph 的循环骨架**,让 AI 能在 specs 约束下自主规划并循环实现,每轮干净上下文 + 测试反压。

## 3. 关键决策(已与用户确认)

1. **运行形态**:前期仅**外部 bash 循环**(`loop.sh` 喂 `claude -p`,真·清空上下文)。会话内 Stop 钩子驱动器留 v2。
2. **归宿**:个人 skill,放 `~/.claude/skills/`,可用 Claude Code 专有能力,不受跨平台/零依赖规则约束。
3. **结构**:定制融合——借鉴头脑风暴、编写计划的方法论深度,但产出 Ralph 循环消费的文件格式(`specs/*.md` + `IMPLEMENTATION_PLAN.md` + `AGENTS.md`)。不直接调用外部 skill,而是内联定制版到本 skill 中。
4. **范围(前期 MVP)**:三阶段主线 + 外部循环 + AGENTS.md 测试反压。**`loop.sh` 与 `PROMPT_build.md` 直接采用 `D:\devlope\how-to-ralph-wiggum` 的原版**(保持一致);**Phase 1 与 `PROMPT_plan.md` 为定制融合**——Phase 1 借 `@phases/brainstorming.md` 产出 `specs/`,`PROMPT_plan.md` 在 Ralph 循环骨架上融入 `@phases/writing-plans.md` 的细粒度任务纪律。三者都含每轮 git push、git tag、subagent fan-out、`--output-format=stream-json`、`--verbose`(how-to-ralph-wiggum 原版自带)。

> **融合分工**:Phase 1 = `@phases/brainstorming.md`;Phase 2 `PROMPT_plan.md` = Ralph 骨架 + `@phases/writing-plans.md` 纪律;Phase 3 `PROMPT_build.md` + `loop.sh` = how-to-ralph-wiggum 原版。

## 4. 架构

### 4.1 Skill 文件结构

```
~/.claude/skills/goal-loop/
├── SKILL.md                  # 总编排:phase 检测 + Phase 1 引导 + 切换指引
├── prompts/
│   ├── PROMPT_plan.md        # Phase 2 循环 prompt(定制 Ralph 版)
│   └── PROMPT_build.md       # Phase 3 循环 prompt(定制 Ralph 版)
├── templates/
│   └── AGENTS.md             # 反压模板(build/test/lint 命令占位)
└── scripts/
    └── loop.sh               # 外部 bash 循环驱动器
```

### 4.2 目标项目产物(生成在项目根)

```
project-root/
├── specs/                    # Phase 1 产物:每个 topic of concern 一个 .md
│   └── <topic>.md
├── IMPLEMENTATION_PLAN.md    # Phase 2 产物:优先级任务清单(LLM 自管格式)
├── AGENTS.md                 # 反压 + 操作笔记:build/test/lint 命令
├── PROMPT_plan.md            # 从 skill 复制;Phase 2 循环读
├── PROMPT_build.md           # 从 skill 复制;Phase 3 循环读
└── loop.sh                   # 从 skill 复制;外部驱动器
```

文件放**项目根**(Ralph 惯例 + 外部循环 `cat PROMPT_*.md` 路径最简)。

### 4.3 触发与 phase 路由

`SKILL.md` 的 `description` 触发条件:用户想用 Ralph 式自主循环构建功能/项目。

激活后,SKILL.md 按目标项目状态路由:

- 无 `specs/` → **Phase 1**(交互式,当前会话内引导)
- 有 `specs/`、无 `IMPLEMENTATION_PLAN.md` → 提示运行 `./loop.sh plan`(Phase 2)
- 有 `IMPLEMENTATION_PLAN.md` → 提示运行 `./loop.sh build`(Phase 3)
- 用户可显式指定 phase 覆盖自动检测

## 5. 三阶段流程

### 5.1 Phase 1 — 交互式需求定义(当前会话,用户在场)

**目标**:把模糊想法变成 `specs/*.md`。

**流程**(借鉴 `@phases/brainstorming.md`,产出 Ralph 格式):

1. 一次一个问题,Socratic 风格,识别 **JTBD**(用户要完成的任务)。
2. 把每个 JTBD 拆成 **topics of concern**(用"一句话不带'且'"范围测试:能用一句话不带"且"描述 = 单个 topic;否则继续拆)。
3. 对每个 topic 写 `specs/<topic>.md`。
4. 分块呈现给用户确认(分块确认门)。
5. 用户批准所有 specs → 提示「运行 `./loop.sh plan` 进 Phase 2」。

**`specs/<topic>.md` 格式**:

```
# <Topic 名称>

## JTBD
<这个 topic 服务的待完成任务>

## 范围
<一句话,不含"且">

## 验收标准
<可观察、可验证的结果清单>

## 约束
<技术/业务约束>
```

### 5.2 Phase 2 — 产出 `IMPLEMENTATION_PLAN.md`(两种方式)

**目标**:对比 specs 与现有代码,产出细粒度任务清单 `IMPLEMENTATION_PLAN.md`。

两条产出路径,任选其一(产出格式一致,Phase 3 都能消费):

- **路径 A — Ralph 规划循环(headless)**:`./loop.sh plan [N]`,用 `PROMPT_plan.md`。每轮 `claude -p` 清空上下文迭代精炼 plan。适合无人值守 / 想看迭代收敛。
- **路径 B — `编写执行计划`(交互)**:按照 @phases/writing-plans.md 将 specs 拆解为细粒度任务,人在场一次性产出。适合想要交互式把控、一次成型。

> 两路径产出相同格式的细粒度任务——因为 `PROMPT_plan.md` 已融合 `writing-plans` 纪律(见路径 A)。完成后都进 Phase 3。

#### 路径 A:Ralph 规划循环

**每轮 `claude -p` 执行**:

1. study `specs/*`(了解需求)
2. 读现有 `IMPLEMENTATION_PLAN.md`(若有,了解已规划)
3. 对比 `src/*` 现有代码,做 gap 分析
4. 更新 `IMPLEMENTATION_PLAN.md`(优先级 bullet 清单)
5. 退出(下一轮再读更新后的状态)

**PROMPT_plan.md**:定制融合——以 how-to-ralph-wiggum 的 Ralph 循环骨架为基础,产出格式融入 `@phases/writing-plans.md` 纪律。

**循环骨架(Ralph)**:study `specs/*` 与 `src/lib/*`(最多 250 个并行 Sonnet subagent)、1 个 Opus subagent 做分析排优先级、gap 分析、**只规划不实现不 commit**、"don't assume not implemented"、"Ultrathink"、`src/lib` 视为标准库。

**产出纪律**:`IMPLEMENTATION_PLAN.md` 不是 Ralph 的粗粒度优先级清单,而是**细粒度任务**,每个任务:

- 2-5 分钟可完成的工作量
- **确切文件路径**(要改/建哪些文件)
- **完整代码**(可直接写的代码,不是描述)
- **验证步骤**(如何确认这步完成)
- **无占位符**(禁 TBD、"类似任务N"、模糊描述)

这把 Ralph 的"LLM 自管粗清单"升级为"可执行细任务清单"——Phase 3 build 循环每轮拿一个任务就能直接干。

**停止条件**(`loop.sh` 不自动检测 diff,靠用户观察 loop 输出后手动 Ctrl+C,或 `--max-iterations`):

- plan 连续 **2 轮**无 diff(稳定信号——用户观察 loop 输出判断)→ Ctrl+C 停,review plan
- 或 `./loop.sh plan <N>` 的 max-iterations 上限自动停
- 或 Ctrl+C

完成后用户 review `IMPLEMENTATION_PLAN.md`,满意则运行 `./loop.sh build` 进 Phase 3。

#### 路径 B:`编写执行计划`(交互)

按照 @phases/writing-plans.md 将 specs 拆解为细粒度任务,产出 `IMPLEMENTATION_PLAN.md`。它本就产出细粒度任务(确切文件路径 / 完整代码 / 验证步骤 / 无占位符),与路径 A 格式一致,Phase 3 无需区分来源。适合想交互式把控、一次成型的场景。

完成后同样 review `IMPLEMENTATION_PLAN.md`,运行 `./loop.sh build` 进 Phase 3。

### 5.3 Phase 3 — 构建循环(headless,`PROMPT_build.md`)

**目标**:每轮实现一个最重要任务,测试,提交。

**每轮 `claude -p` 执行**:

1. 读 `IMPLEMENTATION_PLAN.md`
2. 选**最重要**的任务
3. 搜代码确认未实现(don't assume)
4. 实现
5. 跑 `AGENTS.md` 里的 test 命令(**backpressure** — 失败必须修)
6. 更新 `IMPLEMENTATION_PLAN.md`(标记完成、记录发现)
7. `git add -A` + `git commit`(描述性消息)
8. 退出 → bash 循环重启 → 干净上下文 → 下一轮

**PROMPT_build.md**:直接采用 how-to-ralph-wiggum 的英文原版模板(见该项目 `index.html` 代码块;`files/PROMPT_build.md` 为中文翻译参考)。关键特性:

- 用最多 500 个并行 Sonnet subagent 搜索/读取,仅 1 个 Sonnet subagent 跑 build/tests(backpressure)
- Opus subagent 用于复杂推理(调试、架构)
- 读 plan 选最重要任务;"don't assume not implemented"
- 实现后跑测试,失败必修;测试通过才 `git add` + `git commit`
- 无 build/test 错误即创建 git tag(无 tag 则从 0.0.0 起补丁号递增)
- 完整实现,禁占位符/stub;发现的 bug 即使无关也要修或记录
- `999...` 编号守护条款:capture the why、单一事实来源、保持 AGENTS.md 简洁等
- 参考 `specs/*.md` 的验收标准判断任务是否真正完成(前期仅作判断依据,不强制每条验收必须有对应测试——验收驱动测试留 v2)

**停止条件**:

- `IMPLEMENTATION_PLAN.md` 无剩余任务(全部完成)
- 或 `--max-iterations`
- 或 Ctrl+C

## 6. 循环机制 — `loop.sh`

直接采用 how-to-ralph-wiggum 的 `files/loop.sh` 原版。命令核心:

```bash
cat "$PROMPT_FILE" | claude -p \
    --dangerously-skip-permissions \
    --output-format=stream-json \
    --model opus \
    --verbose
```

特性:

- 模式:`./loop.sh [plan|build] [max_iterations]`(`plan`/`build` 关键字选模式;数字 = build 限 N 轮的简写;无参 = build 无限)
- 每轮后 `git push origin <branch>`(失败则 `git push -u origin <branch>` 建远程分支)
- 打印 `LOOP N` 分隔;达 max-iterations 停止
- 默认 model `opus`;commit/push/tag 由 `PROMPT_build.md` 指示 agent 自己做(不在 loop.sh 里)

## 7. AGENTS.md 反压模板

`templates/AGENTS.md` 结构:

```
## Build & Run
<如何构建项目>

## Validation
- Tests: <test 命令>
- Typecheck: <typecheck 命令>
- Lint: <lint 命令>

## Operational Notes
<运行项目的经验>
```

Phase 3 的 PROMPT_build.md 会让 agent 跑这里指定的 test 命令作为 backpressure。这是 backpressure 接入项目的方式。AGENTS.md 的占位符 `<...>` 由用户(或 Phase 1 结束时 skill 协助)填入项目实际命令。

## 8. 安全(必须写进 SKILL.md)

- `--dangerously-skip-permissions` 绕过 Claude 所有权限 → **沙箱是唯一安全边界**。
- 不在沙箱跑会暴露:凭据、浏览器 cookie、SSH key、access token。
- **每轮 git push**:循环每轮把改动推到远程分支。确保目标仓库/分支是预期的、有推送权限的隔离仓库——不要在共享或生产分支上跑。
- 建议:Docker(本地)/ E2B·Fly(远程);最小权限 API key;限网络。
- **Escape hatch**:Ctrl+C 停循环;`git reset --hard` 回滚未提交改动;plan 错了删掉重跑 Phase 2(plan 可丢弃)。

## 9. 留 v2(前期不做)

- 会话内 Stop 钩子驱动器(交互可见)
- 验收驱动 backpressure(specs 验收标准 → 必跑测试)
- LLM-as-judge 主观质量反压
- visual companion

> 注:每轮 git push、git tag、subagent fan-out(`up to 250/500`)已含在 how-to-ralph-wiggum 原版 prompt/loop.sh 中,属 MVP,不在 v2。

## 10. 非目标

- 不支持所有平台(个人 skill,仅 Claude Code)
- 不进核心(不守零依赖/跨平台规则)
- 是独立 skill(借鉴思路,非取代)

## 11. 验证方式

skill 完成后,用一个真实小项目(如 todo CLI)端到端验证:

1. 无 specs → skill 激活 Phase 1 → 产出 `specs/`
2. `./loop.sh plan` → 产出 `IMPLEMENTATION_PLAN.md`
3. `./loop.sh build` → 循环实现、测试、提交,直到 plan 清空
4. 观察每轮上下文是否真清空、测试反压是否生效、commit 是否正确
