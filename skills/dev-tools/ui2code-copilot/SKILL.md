---
name: ui2code-copilot
description: >-
  设计稿转代码 Copilot。分两阶段：(1) init-context 扫描任意前端项目以构建上下文规范； (2) ui-implement 将 UI 设计稿转化为符合项目约定的生产级代码。触发词："init context" "scan project" "initialize project" "项目上下文规范" "扫描代码" "初始化项目" "implement UI" "design to code" "mockup to code" "实现 UI" "设计稿还原" "设计图转代码".
---

# 设计稿转代码 Copilot

设计稿转代码 Copilot - 扫描任意前端项目生成上下文规范，然后基于规范将 UI 设计稿转化为符合项目约定的生产级代码。

## 工作流

```
Phase 1: init-context（扫描项目 -> 生成 8 个 rules 文件）
       ↓
Phase 2: ui-implement（设计稿 + rules -> 符合项目约定的代码）
```

**核心原则：** 从真实代码中提取规范，而非凭空发明。

---

## When to Use

- 首次在一个前端项目中使用 ui2code-copilot 时 -> 执行 Phase 1
- 项目发生重大重构后（目录调整、技术栈升级、依赖变更）-> 重新执行 Phase 1
- rules 文件过期或与实际代码不一致时 -> 重新执行 Phase 1
- 需要将 UI 设计稿/截图转为前端代码时 -> 执行 Phase 2（前提：Phase 1 已完成）

> 也支持 `/init-context` 和 `/ui-implement` 斜杠命令，详见 `README.md` 命令使用章节。

---

**初始化状态判断（见 `references/core-rules.md`）：**

| 状态           | 判断条件                           | 行动                      |
| -------------- | ---------------------------------- | ------------------------- |
| **未初始化**   | rules 目录不存在或为空             | 执行 Phase 1 完整扫描     |
| **部分初始化** | rules 目录存在但文件不全（< 8 个） | 执行 Phase 1 补全缺失文件 |
| **完整初始化** | rules 目录存在且 8 个文件齐全      | 直接进入 Phase 2          |

---

## Phase 1: Init Context

扫描目标前端项目，生成 8 个上下文规范文件（rules），为 Phase 2 提供项目约定基础。

**详细指令见 `references/init-context-guide.md`。** 以下是摘要。

### Arguments

| 参数             | 说明                                          |
| ---------------- | --------------------------------------------- |
| `quick`          | 仅更新 project-context.md，快速刷新工程上下文 |
| `full`（默认）   | 更新全部 8 个 rules 文件                      |
| `<目录路径>`     | 指定目标项目根目录（默认为当前工作目录）      |
| `--rules=<path>` | 显式指定 rules 目录位置                       |

### Execution Steps

1. **工程结构分析** - 扫描目录树（`tree -d -L 3` 或等效命令），识别分层模式、入口文件、路由结构
2. **技术栈识别** - 扫描 `package.json`、`tsconfig.json`、构建配置、已有 AI 指令，确定框架、UI 库、状态管理、关键依赖
3. **填充 Rules 文件** - 按顺序生成 8 个规范文件：
   - `project-context.md` -> 工程上下文（技术栈、目录结构、分层架构、依赖表、环境配置）
   - `coding-style.md` -> 编码规范（命名、组件、TypeScript、样式、import 顺序、格式化）
   - `security.md` -> 安全红线（代码安全、认证授权、数据安全、业务安全、HTTP 安全）
   - `api-patterns.md` -> API 模式（HTTP 客户端、函数定义、错误处理、核心枚举）- **动态生成**
   - `components.md` -> 组件清单 + 核心组件深度剖析 - **动态生成**
   - `types.md` -> 类型定义（全局/工具/HTTP/组件/API 模型类型）- **动态生成**
   - `utils.md` -> 工具函数目录（通用/HTTP/认证/缓存/日期/树/字典/验证）- **动态生成**
   - `views.md` -> 视图组织、页面模式、数据配置、路由、布局 - **动态生成**
4. **输出报告** - 列出所有文件的 NEW/UPDATED 状态，标注需要人工确认的条目

### Output

```text
INIT-CONTEXT: DONE

技术栈:
  框架: {框架名 + 版本}
  UI 库: {UI 库名 + 版本}
  状态管理: {状态管理库名}
  构建工具: {构建工具名}
  路由模式: {hash / history / file-based}

目录结构:
  页面: {路径}
  组件: {路径}
  API: {路径}
  工具: {路径}
  类型: {路径}

Rules 文件状态:
  project-context.md  - NEW / UPDATED
  coding-style.md     - NEW / UPDATED
  security.md         - NEW / UPDATED
  api-patterns.md     - NEW / UPDATED
  components.md       - NEW / UPDATED
  types.md            - NEW / UPDATED
  utils.md            - NEW / UPDATED
  views.md            - NEW / UPDATED

需要人工确认:
  {列出推断不确定、需要用户确认的条目}
```

---

## Phase 2: UI Implement

将 UI 设计稿转化为符合目标项目约定的生产级前端代码。基于 Phase 1 生成的 rules 文件，确保产出的代码与项目现有风格、组件、模式一致。

**详细指令见 `references/ui-implement-guide.md`。** 以下是摘要。

### Prerequisites

**必须先完成 Phase 1。** 以下 7 个 rules 文件必须存在且已填充：

| 文件               | 用途                       |
| ------------------ | -------------------------- |
| project-context.md | 技术栈、目录结构、路径别名 |
| components.md      | 可复用组件清单及使用方式   |
| utils.md           | 工具函数                   |
| api-patterns.md    | API 组织模式               |
| views.md           | 视图组织和路由             |
| coding-style.md    | 编码规范                   |
| types.md           | 类型定义                   |

security.md 为推荐项。**如果 rules 文件不完整** -> 提示用户先执行 Phase 1，终止当前流程。

### Design Input

三种方式提供设计稿：

1. **参数指定：** `--design="design-assets/模块名/*"`
2. **粘贴图片：** 直接在对话中粘贴或拖拽设计稿图片
3. **放入目录：** 将设计稿放入 `design-assets/` 目录

未找到设计稿时，提示用户使用以上方式。

### Execution Steps

1. **加载上下文** - 按序读取全部 rules 文件（project-context -> components -> utils -> api-patterns -> views -> coding-style -> types -> security）
2. **分析设计稿** - 页面类型识别 -> 组件层级分解 -> 设计规范提取 -> 组件匹配 -> 数据分析
3. **规划文件结构** - 推导模块名、确定文件位置，**向用户展示清单并等待确认**
4. **生成代码** - 严格按依赖顺序（见下方）
5. **质量检查** - UI 还原度 + 实现代码自检
6. **变更日志** - 从 `templates/tasks.md` 创建变更追踪文件
7. **输出总结** - 列出生成文件、复用组件、API 接口、下一步建议

### Code Generation Order

**关键规则 - 必须严格按以下依赖顺序生成：**

```
4.1 类型定义 (types/model)
    ↓ 被后续所有文件依赖
4.2 枚举常量 (enums)
    ↓ 被组件和页面依赖
4.3 API 模块 (api/)
    ↓ 依赖类型定义
4.4 页面数据配置 (*.data.ts)
    ↓ 依赖类型和组件配置格式
4.5 子组件 (components/)
    ↓ 依赖类型、枚举、API
4.6 主页面 (index.vue/tsx)
    ↓ 依赖以上所有文件
4.7 路由注册 (router/)
    ↓ 依赖主页面
```

---

## Path Resolution

本 skill 向**目标项目**（当前工作目录或指定路径）读写文件，而非 skill 自身目录。

**Rules 目录（Phase 1 写入 / Phase 2 读取，按优先级检测）：**

1. `--rules=<path>` 参数显式指定
2. `<目标项目>/.claude/ui2code/rules/` - 首选命名空间
3. `<目标项目>/.claude/code_copilot/rules/` - 向后兼容
4. 以上都不存在 -> 创建 `.claude/ui2code/rules/`

**变更文件目录（Phase 2 写入）：**

- `<目标项目>/.claude/ui2code/changes/<模块名>/`
- 回退：`<目标项目>/.claude/code_copilot/changes/<模块名>/`

**模板来源（只读）：** 本 skill 自身的 `templates/` 目录

**设计稿目录（Phase 2 读取）：**

1. `--design=<path>` 参数显式指定
2. `<目标项目>/design-assets/`
3. `<目标项目>/.claude/ui2code/design-assets/`

---

## Quality Checklist

### UI 还原度

- [ ] 布局结构与设计稿一致
- [ ] 颜色值使用 Design Token（不硬编码）
- [ ] 字体大小、行高一致
- [ ] 间距（padding / margin）与设计稿一致
- [ ] 交互状态完整（hover / active / disabled / loading）
- [ ] 响应式适配

### 实现代码自检

- [ ] 复用已有组件（components.md）
- [ ] 复用工具函数（utils.md）
- [ ] 遵循 API 模式（api-patterns.md）
- [ ] 类型定义完整（types.md）
- [ ] 样式遵循约定（coding-style.md）
- [ ] 安全约束满足（security.md）
- [ ] 导入路径正确（别名来自 project-context.md）
- [ ] 文件命名符合项目约定
- [ ] 编码风格一致

---

## Generation Constraints

1. **严格遵循 project-context.md** - 编码规范、目录结构、路径别名必须一致
2. **优先复用** - 组件、工具函数、类型、枚举优先从上下文文档中匹配
3. **不硬编码样式值** - 颜色、字号、间距必须使用 coding-style.md 中的约定
4. **不修改全局样式** - 只在页面级使用 scoped style
5. **不修改已有文件** - 除非路由注册等必要修改，且修改前向用户确认
6. **使用项目语言** - 注释和 UI 文本使用 project-context.md 中声明的语言
7. **安全约束** - 遵循 security.md 中的安全红线

---

## Core Rules

执行期间遵循 `references/core-rules.md` 中定义的核心法则、工作原则、调试流程和 Git 规范。
