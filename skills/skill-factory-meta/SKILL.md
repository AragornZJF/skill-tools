---
name: skill-factory
description: '使用场景：当用户要求根据需求自动创建、设计、生成或更新一个 Skill（技能），包括把某个流程、知识库、工作方法封装成技能时使用。触发词："造个skill"、"创建技能"、"设计一个技能"、"把XX做成skill"、"帮我生成一个skill"、"技能工厂"、"写个技能"等。'
# 建议 allowed-tools（按需裁剪）：
# - Read, Grep, Glob, Write, Edit, Bash
---

# skill-factory（技能工厂）

## 定位

消费用户的模糊需求，产出**完整可用的技能包**：设计文档 + 实现计划 + 成品技能 + 验证报告。产物暂存于工作目录 `output/<技能名>/`，人工审查后手动安装到 `~/.agents/skills/`。

## 输出约定

```
output/<技能名>/
├── docs/
│   ├── YYYY-MM-DD-<topic>-design.md        # 设计文档
│   └── YYYY-MM-DD-<topic>-plan.md          # 实现计划（每任务 2-5 分钟，含确切文件路径）
└── skill/<skill-name>/                     # 成品技能
    ├── SKILL.md
    ├── scripts/       # 执行层：确定性计算
    ├── reference/     # 知识层：按需加载
    ├── templates/     # 规范层：输出模板
    ├── assets/        # 其他资源
    └── VERIFICATION.md # 验证报告
```

## 复杂度分级入口（第 1 步后执行）

探索后用三问评估，决定走哪条流程：

| 评估问题 | 是 → |
|---|---|
| 需求涉及多文件/多资源（scripts/reference/templates/assets 中 ≥2 类）？ | 复杂 |
| 产出需要长期迭代使用（跟踪、更新、维护机制）？ | 复杂 |
| 有确定性计算或标准化输出模板需求？ | 复杂 |

- 三问全否 → **简单（快车道，五步）**；任一为是 → **复杂（七步全流程）**
- 拿不准时从严（走复杂流程）；复杂流程可随时降级为快车道
- 快车道流程见下节；七步全流程见再下一节

## 简单 · 快车道（五步）

1. **探索 + 评估**——检查上下文、防重名，三问确认走快车道
2. **澄清问题**——1-2 轮，多选优先，收敛即停（无需硬性 5 轮）
3. **方案 + 整体确认**——呈现 1 个方案与完整设计（含产物结构、验证方式），请用户做**整体确认**，确认后才进入实现
4. **实现 + Gate 1**——按决策流四问建目录写文件，静态自检通过
5. **交付**——产物路径、审查要点、安装命令

## 七步工作流（复杂）

1. **探索 + 复杂度评估**——相关时检查工作区文件、文档、已有技能（尤其 `~/.agents/skills/` 与 `output/`，防重名），并用三问评估复杂度分级（见上节）。
2. **澄清 + 方案**——逐个问、多选优先、收敛即停（≤5 轮）。问题覆盖：目的、约束、成功标准、是否需要用户提供素材（品牌资产/模板等，列出清单）。**澄清收敛后直接给出 2-3 方案**（含权衡与推荐，先推荐再解释）。示例问题模板：
   - "核心产出是什么？（A. 标准报告 B. 流程执行 C. 知识查询）"
   - "产物存到哪里？（A. 工作目录暂存 B. 直接安装到 ~/.agents/skills/）"
   - "面向什么领域？（A. 通用 B. 特定领域）"
3. **分节呈现设计，逐节确认**——每节 200-300 字，逐节确认后再进入下一节；**每节确认后立即写入设计文档**（存 `docs/YYYY-MM-DD-<topic>-design.md`。格式参考 `reference/prompt-frameworks.md`；模式参考 `reference/design-patterns.md`）。
4. **设计整体确认**——将完整设计一次性呈现（设计文档 + 产物结构 + 验证方案），请用户做**整体定稿确认**。区别于第 3 步的逐节确认：那是过程性验收（每节 OK 才继续），这里是进入实现前的收口（整体一致后才放行）。**确认后**才进入下一步；未通过则回到第 3 步对应节修订后再确认。
5. **实现**——先拆轻量任务清单（每个任务含确切文件路径、执行步骤、验证方式；复杂时完整写入 `docs/YYYY-MM-DD-<topic>-plan.md`），再逐任务实现 `skill/`：
   - 先按决策流四问决定目录：标准化输出？→ templates/；确定性计算？→ scripts/；知识量>500 行？→ reference/；安全边界？→ allowed-tools 注释（详见 `reference/design-patterns.md`）
   - 再写文件：frontmatter 与正文按 `reference/skill-standards.md`；正文指令参考 `reference/prompt-frameworks.md`
   - 需用户素材时：澄清阶段已列清单，实现前索取
6. **验证**——读 `reference/verification-checklist.md`：Gate 1 静态自检 → Gate 2 实跑试测（沙箱安装 + 场景试跑，最多 2 轮迭代）→ 写 `skill/<skill-name>/VERIFICATION.md`。
7. **交付**——向用户说明：产物路径、审查要点（SKILL.md 路由表 + reference 文件）、安装命令（`cp -r output/<技能名>/skill/<skill-name> ~/.agents/skills/`）、后续迭代方式（发现指令缺口回到第 5 步）。

## Quick Reference 路由表

| 阶段 | 读哪个文件 |
|---|---|
| 写设计文档 | `reference/design-patterns.md`（模式）、`reference/prompt-frameworks.md`（格式） |
| 决定目录结构 | `reference/design-patterns.md`（决策流四问） |
| 写 frontmatter / 正文 | `reference/skill-standards.md`、`reference/prompt-frameworks.md` |
| 验证 | `reference/verification-checklist.md` |

## 边界处理

| 场景 | 处理 |
|---|---|
| 需求过于模糊 | 澄清 ≤5 轮，多选收敛 |
| 需求不是技能（普通代码/文档） | 说明并建议其他流程，不硬造技能 |
| 与已有技能重名 | 扫描 `~/.agents/skills/` 与 `output/`，提示改名或覆盖 |
| 需用户提供素材 | 澄清阶段列清单，实现前索取 |
| 验证 2 轮仍失败 | 交付"未通过"报告（含原因与建议），不伪装通过 |
| 中途改需求 | 回到第 2 步重新澄清，旧设计文档标注"废弃" |

## 底线

**诚实报告，绝不伪装验证通过。** 两门验证皆过才标记"验证通过"。
