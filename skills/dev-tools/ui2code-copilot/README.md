# ui2code-copilot

设计稿转代码 Copilot -- 扫描任意前端项目生成上下文规范，然后基于规范将 UI 设计稿转化为符合项目约定的生产级代码。

## Skill 简介

ui2code-copilot 是一个**框架无关**的 AI 编码协作 skill，分两阶段工作：

### Phase 1: init-context（项目上下文初始化）

扫描目标前端项目的真实代码，提取技术栈、目录结构、编码规范、组件清单、API 模式、类型定义等，生成 **8 个 rules 规范文件**。这些文件是 Phase 2 生成代码的约定基础。

**核心原则：从真实代码中提取规范，而非凭空发明。**

生成的 8 个 rules 文件：

| 文件                 | 内容                                                       | 生成方式                 |
| -------------------- | ---------------------------------------------------------- | ------------------------ |
| `project-context.md` | 技术栈、目录结构、分层架构、依赖表、路径别名               | 扫描 + 合理默认          |
| `coding-style.md`    | 命名约定、组件规范、TypeScript 规范、样式规范、import 顺序 | 扫描 + 合理默认          |
| `security.md`        | 代码安全、认证授权、数据安全、业务安全、HTTP 安全          | 扫描 + 合理默认          |
| `api-patterns.md`    | HTTP 客户端、CRUD 模式、错误处理、核心枚举                 | 动态生成（基于实际代码） |
| `components.md`      | 组件清单 + 3-5 个核心组件深度剖析                          | 动态生成（基于实际代码） |
| `types.md`           | 全局/工具/HTTP/组件/API 模型类型                           | 动态生成（基于实际代码） |
| `utils.md`           | 通用/HTTP/认证/缓存/日期/树/字典/验证工具                  | 动态生成（基于实际代码） |
| `views.md`           | 视图组织、页面模式、数据配置、路由、布局                   | 动态生成（基于实际代码） |

### Phase 2: ui-implement（设计稿转代码）

基于 Phase 1 生成的 rules 文件，将 UI 设计稿转化为符合项目约定的生产级前端代码。严格按依赖顺序生成：类型定义 -> 枚举常量 -> API 模块 -> 页面数据配置 -> 子组件 -> 主页面 -> 路由注册。

**生成约束：**

- 严格遵循 `project-context.md` 中的编码规范和目录结构
- 优先复用已有组件、工具函数、类型、枚举
- 不硬编码样式值，使用 `coding-style.md` 中的 Design Token
- 遵循 `security.md` 中的安全红线

### 工作流

```
Phase 1: init-context（扫描项目 -> 生成 8 个 rules 文件）
       ↓
Phase 2: ui-implement（设计稿 + rules -> 符合项目约定的代码）
```

> Phase 2 必须在 Phase 1 完成后执行（依赖 rules 文件）。

---

## 安装

本 skill 为纯 skill（无插件清单），放入 skill 发现目录即自动加载：

- **项目级：** `<项目>/.claude/skills/ui2code-copilot/`
- **用户级：** `~/.claude/skills/ui2code-copilot/`

将本目录整体复制到上述任一位置即可。无需 marketplace 注册或 `/plugin` 启用。

### 启用显式命令

如需使用 `/init-context` 和 `/ui-implement` 斜杠命令，将 `commands/` 目录下的模板文件复制到目标项目的 `.claude/commands/`：

```bash
cp .claude/ui2code-copilot/commands/init-context.md .claude/commands/init-context.md
cp .claude/ui2code-copilot/commands/ui-implement.md .claude/commands/ui-implement.md
```

命令文件是薄路由层，会自动检测 skill 安装位置（`.claude/ui2code-copilot/` 或 `.claude/skills/ui2code-copilot/`）并加载对应的 `references/` 指令文件。

---

## 命令使用

### `/init-context` -- 项目上下文初始化

扫描目标前端项目，生成 8 个 rules 规范文件。首次使用或项目重构后必须执行。

#### 语法

```
/init-context [quick|full] [<目录路径>] [--rules=<path>]
```

#### 参数

| 参数             | 说明                                                  | 默认值       |
| ---------------- | ----------------------------------------------------- | ------------ |
| `quick`          | 仅更新 `rules/project-context.md`，快速刷新工程上下文 | -            |
| `full`           | 更新全部 8 个 rules 文件                              | **默认**     |
| `<目录路径>`     | 指定目标项目根目录                                    | 当前工作目录 |
| `--rules=<path>` | 显式指定 rules 目录位置                               | 自动检测     |

参数可组合使用。

#### 使用示例

```bash
# 完整扫描当前项目，生成全部 8 个 rules 文件（最常用）
/init-context

# 快速模式，仅刷新 project-context.md
/init-context quick

# 扫描指定路径的项目
/init-context /home/user/my-project

# 完整模式 + 指定项目路径
/init-context full /home/user/my-project

# 指定 rules 目录位置
/init-context --rules=.claude/my-rules/

# 组合：快速模式 + 指定项目
/init-context quick /home/user/my-project
```

#### 执行流程

1. **工程结构分析** -- 扫描目录树，识别分层模式、入口文件、路由结构
2. **技术栈识别** -- 扫描 `package.json`、`tsconfig.json`、构建配置，确定框架、UI 库、状态管理
3. **填充 Rules 文件** -- 按顺序生成规范文件（`quick` 模式仅生成 `project-context.md`）
4. **输出报告** -- 列出所有文件的 NEW/UPDATED 状态，标注需要人工确认的条目

#### 输出示例

```text
INIT-CONTEXT: DONE

技术栈:
  框架: Vue 3.4
  UI 库: Ant Design Vue 4.0
  状态管理: Pinia
  构建工具: Vite 5
  路由模式: history

Rules 文件状态:
  project-context.md  - NEW
  coding-style.md     - NEW
  security.md         - NEW
  api-patterns.md     - NEW
  components.md       - NEW
  types.md            - NEW
  utils.md            - NEW
  views.md            - NEW

需要人工确认:
  - 路由权限模式推断为 BACK 模式，请确认
```

---

### `/ui-implement` -- 设计稿转代码

基于 rules 规范文件，将 UI 设计稿转化为符合项目约定的生产级前端代码。

#### 语法

```
/ui-implement [--design=<path>]
```

#### 参数

| 参数              | 说明                               | 默认值   |
| ----------------- | ---------------------------------- | -------- |
| `--design=<path>` | 指定设计稿路径（支持 glob 通配符） | 自动检测 |

#### 设计稿来源（按优先级）

1. `--design=<path>` 参数显式指定
2. 用户在对话中粘贴或拖拽的图片
3. `<目标项目>/design-assets/` 目录
4. `<目标项目>/.claude/ui2code/design-assets/` 目录

#### 使用示例

```bash
# 指定设计稿目录
/ui-implement --design="design-assets/patient/*"

# 指定单张设计稿
/ui-implement --design="design-assets/login/login-page.png"

# 不带参数，使用 design-assets/ 目录下的设计稿
/ui-implement

# 不带参数，直接在对话中粘贴图片后触发
/ui-implement
```

#### 前置条件

必须先完成 `/init-context`。以下 7 个 rules 文件必须存在且已填充：

| 文件                 | 用途                       |
| -------------------- | -------------------------- |
| `project-context.md` | 技术栈、目录结构、路径别名 |
| `components.md`      | 可复用组件清单及使用方式   |
| `utils.md`           | 工具函数                   |
| `api-patterns.md`    | API 组织模式               |
| `views.md`           | 视图组织和路由             |
| `coding-style.md`    | 编码规范                   |
| `types.md`           | 类型定义                   |

`security.md` 为推荐项。如果 rules 文件不完整，会提示先执行 `/init-context`。

#### 执行流程

1. **加载上下文** -- 按序读取全部 rules 文件
2. **分析设计稿** -- 页面类型识别 -> 组件层级分解 -> 设计规范提取 -> 组件匹配 -> 数据分析
3. **规划文件结构** -- 推导模块名、确定文件位置，**向用户展示清单并等待确认**
4. **生成代码** -- 严格按依赖顺序：

   ```
   4.1 类型定义 (types/model)  -- 被后续所有文件依赖
       ↓
   4.2 枚举常量 (enums)        -- 被组件和页面依赖
       ↓
   4.3 API 模块 (api/)          -- 依赖类型定义
       ↓
   4.4 页面数据配置 (*.data.ts) -- 依赖类型和组件配置格式
       ↓
   4.5 子组件 (components/)     -- 依赖类型、枚举、API
       ↓
   4.6 主页面 (index.vue/tsx)   -- 依赖以上所有文件
       ↓
   4.7 路由注册 (router/)       -- 依赖主页面
   ```

5. **质量检查** -- UI 还原度 + 实现代码自检
6. **变更日志** -- 创建变更追踪文件（`tasks.md`）
7. **输出总结** -- 列出生成文件、复用组件、API 接口、下一步建议

#### 输出示例

```text
UI 设计稿实现完成!

生成文件:
  src/views/patient/index.vue              # 主页面
  src/views/patient/components/EditModal.vue # 编辑弹窗
  src/views/patient/data.ts                # 页面数据配置
  src/api/patient/index.ts                 # API 模块
  src/api/patient/model.ts                 # API 类型

复用组件:
  BasicTable (src/components/Table)
  BasicForm (src/components/Form)

API 接口:
  getPatientPage, createPatient, updatePatient, deletePatient

下一步:
  1. 启动开发服务器验证效果
  2. 对比设计稿进行微调
  3. 检查交互状态和响应式布局
```

---

### 自然语言触发（备选）

除显式命令外，也可通过以下关键词自动激活 skill，由 skill 内部路由到对应 Phase：

| Phase   | 触发词                                                             |
| ------- | ------------------------------------------------------------------ |
| Phase 1 | "init context" "scan project" "项目上下文" "扫描代码" "初始化项目" |
| Phase 2 | "implement UI" "design to code" "设计稿还原" "设计图转代码" "切图" |

---

## 典型使用场景

### 场景 1：首次接入新项目

```bash
# 1. 初始化项目上下文
/init-context

# 2. 放入设计稿到 design-assets/ 目录
# 3. 执行设计稿转代码
/ui-implement --design="design-assets/模块名/*"
```

### 场景 2：项目重构后更新规范

```bash
# 仅快速刷新工程上下文
/init-context quick

# 或完整重新扫描
/init-context
```

### 场景 3：批量实现多个模块

```bash
# 前提：已完成 init-context

/ui-implement --design="design-assets/patient/*"
/ui-implement --design="design-assets/system/user/*"
/ui-implement --design="design-assets/opscenter/overview/*"
```

### 场景 4：对已有项目使用

```bash
# 指定项目路径进行扫描
/init-context /home/user/existing-project

# 进入项目目录后执行
cd /home/user/existing-project
/ui-implement --design="design-assets/home/*"
```

---

## 路径约定

skill 向**目标项目**（当前工作目录或指定路径）读写文件，而非 skill 自身目录。

| 用途       | 路径（按优先级检测）                                                  |
| ---------- | --------------------------------------------------------------------- |
| Rules 文件 | `.claude/ui2code/rules/` -> `.claude/code_copilot/rules/`（向后兼容） |
| 变更追踪   | `.claude/ui2code/changes/<模块名>/`                                   |
| 设计稿     | `design-assets/` 或 `--design=` 参数指定                              |

---

## 目录结构

```
ui2code-copilot/
├── SKILL.md                  # skill 入口（两阶段路由 + Command Interface）
├── commands/                 # 斜杠命令模板（安装时复制到 .claude/commands/）
│   ├── init-context.md       # /init-context 命令（参数解析 + 路由到 references/）
│   └── ui-implement.md       # /ui-implement 命令（参数解析 + 路由到 references/）
├── references/
│   ├── core-rules.md         # 核心法则、工作原则、调试流程、Git 规范
│   ├── init-context-guide.md # Phase 1 详细扫描指令（4 步流程 + 8 个 rules 文件规范）
│   └── ui-implement-guide.md # Phase 2 详细生成指令（7 步流程 + 代码生成顺序）
├── templates/                # 变更追踪模板
│   ├── tasks.md              # 任务拆分模板
│   ├── log.md                # 变更日志模板
│   ├── test-spec.md          # 测试规格模板
│   └── change-record.md      # 变更记录模板
└── README.md
```

### 各文件职责

| 文件                               | 职责                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `SKILL.md`                         | skill 入口，定义 description 触发词、两阶段路由、Command Interface、路径解析、质量清单、生成约束 |
| `commands/*.md`                    | 斜杠命令薄路由层，解析 `$ARGUMENTS`，检测 skill 路径，指向 `references/` 指令                    |
| `references/core-rules.md`         | 核心法则（可溯源、原子更新）、工作原则、初始化状态判断、调试流程、Git 规范                       |
| `references/init-context-guide.md` | Phase 1 完整指令：路径解析、工程结构分析、技术栈识别、8 个 rules 文件填充规范、输出报告          |
| `references/ui-implement-guide.md` | Phase 2 完整指令：前置检查、设计稿来源、7 步生成流程、代码生成顺序、质量检查清单                 |
| `templates/*.md`                   | 变更追踪文档模板，Phase 2 生成代码时自动填充                                                     |

---

## 技术栈兼容性

本 skill 框架无关（framework-agnostic），适配目标项目的实际技术栈：

- **React** -- 函数组件、Hooks、JSX/TSX
- **Vue** -- Composition API、`<script setup>`、SFC
- **Angular** -- 组件、服务、模板
- **其他** -- 根据项目实际代码分析生成对应规范

---

## License

MIT
