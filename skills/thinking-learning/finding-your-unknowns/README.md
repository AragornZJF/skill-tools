# Skills 目录索引

本目录含 6 个技法技能(可直接触发)+ `ask-unknowns` 编排入口(引导式管道)+ `design-html`(reference,模型调用)。

## 四象限框架

将人的能力划分为**能不能问** × **能不能答**,AI 的角色从人的缺口里派生——人缺什么,AI 补什么。

| 象限 | 能力状态 | AI 角色 | 对应技能 |
|---|---|---|---|
| Q1 已知已知 | 能问 + 能答 | 执行工具 | (直接干,无需技能) |
| Q2 已知未知 | 能问 + 不能答 | 研究伙伴 | `research` |
| Q3 未知已知 ★ | 不能问 + 能答 | 生成方案让人判断 | `directions` |
| Q4 未知未知 ★ | 不能问 + 不能答 | 碰撞新视角 | （暂无技能） |

★ = 说不清但能认的盲区。`ask-unknowns` 把 Q2→Q3→计划→实施→收尾串成引导式管道。

## 目录结构

```
.claude/skills/
├── README.md                      # 本文件(索引)
├── ask-unknowns/SKILL.md          # 主流程编排(串联 ①-⑤,子技能仍可单独跑)
├── design-html/                   # reference 技能(模型调用,不直接触发)
│   ├── SKILL.md
│   ├── design-standard.md         # WHY — 设计准则、AI slop 黑名单、React+Babel 固定版本
│   └── skeleton.md                # WHAT — 单文件 HTML 起步骨架模板
├── directions/SKILL.md            # ③四种设计方向 ④一次性原型 ⑦参考语义图 — 未知已知(看到才知道)
├── notes/SKILL.md                 # ⑨实施笔记 — "最保守"判据
├── plan/SKILL.md                  # ⑧可调实施计划 — 默认汇入点
├── research/SKILL.md              # ①盲区扫描 ②教我未知 ⑤头脑风暴 ⑥反向采访 — 已知未知(能问不能答)
└── wrapup/SKILL.md                # ⑩推介文档 ⑪改动测验 — 收尾(固定 ⑩→⑪)
```

## 技能一览

| 技能          | 解决问题                            | 内含技法                                | 产出                                 |
| ------------- | ----------------------------------- | --------------------------------------- | ------------------------------------ |
| `research`    | 已知未知(能问不能答)                | ①盲区扫描 ②教我未知 ⑤头脑风暴 ⑥反向采访 | 内联对话 + MD                        |
| `directions`  | 未知已知(看到才知道)                | ③四种设计方向 ④一次性原型 ⑦参考语义图   | ③④ HTML / ⑦ MD                       |
| `plan`        | 默认汇入点                          | ⑧可调实施计划                           | MD                                   |
| `notes`       | 实施中偏离日志                      | ⑨实施笔记                               | `implementation-notes.md`            |
| `wrapup`      | 收尾(固定 ⑩→⑪)                      | ⑩推介文档 ⑪改动测验                     | HTML                                 |
| `design-html` | reference 标准(模型调用,不直接触发) | (无技法)                                | `design-standard.md` + `skeleton.md` |

> 另有 `ask-unknowns`--主流程编排入口,把上面 6 个技能串成引导式管道。不内含技法,只编排(详见下文)。

## 各子技能详细介绍

### ask-unknowns — 主流程编排(opt-in 引导管道)

把 6 个技法技能串成一条引导式管道:①挖未知(research)→②出方案(directions)→③汇入计划(plan)→④实施笔记(notes)→⑤收尾(wrapup)。每阶段 Read 对应子技能 SKILL.md 执行,带**阶段门(进/跳/回)**。子技能仍可单独触发——本技能只在想要完整引导流程时用。基于四象限框架:Q2(research)→Q3(directions)→Q1(计划/实施/收尾)。

- **触发词**:ask-unknowns / 未知流程 / 走一遍主流程 / 带我走完
- **产出**:引导式对话(编排,不直接产文件;文件产出由各子技能负责)

### research — 研究域(替用户答)

解决"已知未知":用户知道自己没想清楚、能问出口。

- **①盲区扫描(blindspot pass)**:进陌生领域前系统性扫盲。
- **②教我未知(teach me)**:学某个概念/词汇/领域。
- **⑤头脑风暴(brainstorm)**:发散想法。
- **⑥反向采访(interview me)**:AI 反问用户,澄清 hub——①② 跑完仍模糊、⑤ 列完挑不下都进 ⑥。
- **触发词**:教我 / 盲区扫描 / 头脑风暴 / 反向采访 / teach me / blindspot pass / brainstorm / interview me
- **执行方式**:内联对话 + MD 产出,直接跑不先确认。

### directions — 倒转域(AI 先出方案、人判断)

解决"未知已知":说不清但能认、看到才知道要什么。答案在人脑子里写不进 prompt,所以 AI→人,先出方案/甩盲区,人看了再判断。

- **③四种设计方向(design directions)**:出 3+ 风格/结构变体让你挑。
- **④一次性原型(mock)**:快速 throwaway 原型,验证想法。
- **⑦参考语义图(reference map)**:移植参考实现时画语义对照图。
- **触发词**:设计方向 / 看到才知道 / mock / 参考语义图 / design directions / mock / reference map
- **产出**:③④ 产 HTML(必先拉 `design-html` 技能),⑦ 产 MD。

### plan — 汇入点(可调实施计划)

知识层技法(①-⑦)跑完都汇到这里再进实施。核心是**按"最可能想改"排序(不是执行顺序)**——数据模型/接口/UX 放最前(标"可调"+ 给备选),机械重构放最后(折叠)。

- **⑧可调实施计划(tweakable plan)**:让你一眼看到决策权重高的部分、早拍板。
- **触发词**:可调计划 / 实施计划 / 准备写码 / tweakable plan
- **产出**:MD,先确认再执行。

### notes — 实施中(偏离日志)

计划再周全,未知仍埋在领土里。本技能维护运行日志,撞上 edge case、被迫偏离计划时记一笔——不停,记完继续干。

- **⑨实施笔记(implementation notes)**:按"最保守"判据选(①不引入新依赖 ②不改对外契约 ③可回退 ④最接近原计划);四条都没法满足才停下问。
- **触发词**:实施笔记 / 偏离计划 / edge case / implementation notes
- **产出**:`implementation-notes.md`(相对项目根),后续推介文档(⑩)直接引用。

### wrapup — 收尾(发布前两件事)

发布 = 别人要继承你的未知。**固定顺序 ⑩→⑪**:先对外拿 buy-in,再对内自检。

- **⑩推介文档(buy-in doc)**:对外——替评审省一遍挖未知的过程。开头放动画 demo / GIF,引用 `implementation-notes.md` 的关键决策预答异议,明确点名谁在哪件事上签字。
- **⑪改动测验(quiz me)**:对内——证明自己真懂了再合并。底部一套测验题,**必须全对才合并**;答错指回略过的章节。
- **触发词**:推介文档 / buy-in / 改动测验 / quiz me / 准备合并 / 准备发布
- **产出**:都产 HTML(必先拉 `design-html` 技能)。⑩→ `pitch-<slug>.html`,⑪→ `quiz-<slug>.html`。

### design-html — reference 标准(模型调用型)

**不直接由用户触发**。产出 HTML 的技能(`directions` 的 ③④、`wrapup` 的 ⑩⑪)在产出前必读本技能的两个文件:

- **`design-standard.md`** — WHY:设计原则、3+ 变体探索流程、Tweaks 面板、AI slop 黑名单、交付自检、React+Babel 固定版本 + integrity hash。
- **`skeleton.md`** — WHAT to copy:单文件 HTML 起步骨架模板。
- **两条铁律**:① React+Babel 用固定版本 + integrity hash;② 避开 AI slop 黑名单(滥用渐变 / emoji、左边框 accent + 圆角容器、SVG imagery、过度使用的字体 Inter/Roboto/Arial)。
- **产物落盘**:单文件、内联 CSS、不引外部资源(CDN 例外),输出到 `artifacts/unknowns/<技法>-<slug>.html`(相对项目根 / 用户 CWD)。

## 衔接(闭环)

- `ask-unknowns` 是 **opt-in 引导管道**——想走完整流程时触发,串联 ①-⑤
- ⑧ 可调计划是**默认汇入点**——①-⑦ 跑完都落成 `plan` 再进实施
- ⑥ 反向采访是**澄清 hub**——在 `research` 内串行
- 收尾固定 ⑩→⑪(在 `wrapup` 内)
- 实施中撞 edge case → `notes`;偏离触及不可逆/高爆炸半径 → 停下问用户
