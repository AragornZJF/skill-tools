# Init Context Guide

本文件是 init-context skill 的详细执行指令。扫描目标前端项目，生成 8 个上下文规范文件，供后续 ui-implement skill 消费。

---

## 路径解析

执行前先确定目标项目的 rules 目录位置（按优先级检测）：

1. `--rules=<path>` 参数显式指定
2. `<目标项目>/.claude/ui2code/rules/` — 本插件首选命名空间
3. `<目标项目>/.claude/code_copilot/rules/` — 向后兼容已有项目
4. 以上都不存在 → 创建 `<目标项目>/.claude/ui2code/rules/`

目标项目根目录默认为当前工作目录，可通过参数指定其他路径。

---

## Step 1: 工程结构分析

### 1.1 目录结构扫描

运行 `tree -d -L 3`（或 `ls -R` 回退）获取目录树，识别：

- 顶层模块划分方式（按功能 / 按层级 / 混合）
- 页面目录的位置（如 `src/views/`、`src/pages/`、`app/routes/`）
- 组件目录的位置（如 `src/components/`、`src/shared/`）
- API 层的位置（如 `src/api/`、`src/services/`）
- 工具函数的位置（如 `src/utils/`、`src/lib/`）
- 类型定义的位置（如 `src/types/`、`src/interfaces/`）

### 1.2 分层模式识别

确定项目的分层架构：

```
Views/Pages → Components → Hooks/Composables → API Layer → Store → Utils/Types
```

记录每一层的实际目录路径和命名约定。

### 1.3 入口文件与路由

找到入口文件（如 `main.ts`、`App.tsx`、`app.ts`），确定：

- 路由模式（hash / history / file-based）
- 路由配置方式（集中式 / 分散式 / 约定式）
- 布局系统（Layout 组件的组织方式）

---

## Step 2: 技术栈识别

扫描以下文件，提取项目的技术栈信息：

| 扫描文件 | 获取信息 |
|---------|---------|
| `package.json` | 框架（React/Vue/Angular）、UI 库、状态管理、构建工具、关键依赖 |
| `tsconfig.json` | TypeScript 配置、路径别名（如 `@/` → `src/`） |
| 构建配置（vite.config / webpack.config / next.config 等） | 构建工具、插件、代理配置、环境变量 |
| `.eslintrc` / `.prettierrc` | 代码规范工具链及配置 |
| `CLAUDE.md` / `.cursorrules` | 项目已有的 AI 指令（如有则参考但不覆盖） |
| 状态管理文件 | Store 组织方式（Pinia / Redux / Zustand / Vuex） |

---

## Step 3: 填充 Rules 文件

按以下顺序填充 8 个规范文件。前 3 个为通用文件（基于扫描 + 合理默认值），后 5 个为动态生成文件（完全基于项目实际代码分析）。

### 3.1 project-context.md

工程上下文，后续所有代码生成的基石。

**必须包含：**
- 应用名称和技术栈（框架版本、UI 库版本、构建工具版本）
- 目录结构（带注释的 `src/` 树）
- 分层架构图
- 关键依赖表（库名 + 版本 + 用途）
- 环境配置（路径别名、环境变量、认证方式）

### 3.2 coding-style.md

编码规范，从实际代码中推断。

**必须包含：**
- 文件命名约定（目录名、组件名、数据配置文件的命名规则）
- 组件文件规范（如 `<script setup>` / 函数组件写法、行数上限、事件命名前缀）
- TypeScript 规范（Props 定义方式、命名后缀如 Params/Model/VO、全局类型别名）
- 样式规范（CSS 预处理器、scoped 方案、设计变量引用路径、工具类框架）
- Import 顺序规范
- 格式化配置（Prettier / ESLint 的关键规则：行宽、缩进、引号、分号、逗号）

### 3.3 security.md

安全红线。

**必须包含：**
- 代码安全（禁止硬编码密钥、禁止不可信数据直接 v-html / dangerouslySetInnerHTML）
- 认证授权（Token 存储方式、自动刷新机制、权限控制指令/组件）
- 数据安全（输入校验、URL 编码、文件上传规范）
- 业务安全（敏感操作审批、加密传输要求）
- HTTP 安全（Base URL 配置方式、超时时间、下载方式）

### 3.4 api-patterns.md（动态生成）

> 完全基于项目实际 API 代码分析，无预设模板。

**扫描 `src/api/`（或等效目录）的所有文件，提取：**
- HTTP 客户端封装（单例名称、拦截器链、响应解包规则、错误消息模式）
- API 函数定义模式（目录结构、CRUD 模式、命名约定）
- HTTP 方法映射（GET/POST/PUT/DELETE 的参数传递方式）
- 错误处理策略（网络层 / 业务层 / 静默模式）
- 核心枚举（如 ResultEnum、RequestEnum）

### 3.5 components.md（动态生成）

> 完全基于项目实际组件代码分析，无预设模板。

**扫描 `src/components/`（或等效目录）的所有组件，提取：**
- 组件清单（全部组件的路径和简要描述）
- 核心组件深度剖析（选择 3-5 个最高频的组件）：
  - Props 接口（必填/可选属性及类型）
  - 使用模式（如 register 回调模式、hook 返回值结构）
  - 暴露的方法（通过 ref 可调用的方法列表）
- 组件注册模式（全局注册 / 局部注册 / 按需引入）
- 组件间通信方式（props/events、context、store）

### 3.6 types.md（动态生成）

> 完全基于项目实际类型定义分析，无预设模板。

**扫描 `src/types/`（或等效目录）及各模块的类型文件，提取：**
- 全局类型（`global.d.ts` 中的泛型工具类型，如 `Recordable<T>`、`Nullable<T>`）
- 工具类型（分页参数 `PageParam`、分页结果 `PageResult<T>`、标签选项 `LabelValueOptions`）
- HTTP 类型（标准响应结构 `Result<T>`、请求配置类型）
- 组件类型（核心组件的列定义、表单 Schema 等）
- API 模型类型（各模块的请求/响应模型）
- 类型复用模式（如何继承 PageParam、如何使用泛型工具类型）

### 3.7 utils.md（动态生成）

> 完全基于项目实际工具函数代码分析，无预设模板。

**扫描 `src/utils/`（或等效目录）的所有文件，提取：**
- 通用工具（深拷贝、URL 参数处理、对象合并等）
- HTTP 工具（HTTP 客户端实例、拦截器、重试机制）
- 认证缓存（Token 读写、认证状态管理）
- 缓存工具（localStorage / sessionStorage 封装）
- 日期工具（使用的日期库及封装）
- 树结构工具（listToTree、findNode 等）
- 字典工具（枚举字典的获取和使用方式）
- 验证工具（邮箱、手机号、URL 校验）
- 类型守卫（isString、isObject 等）
- 加密工具（AES、SM2 等，如有）
- 第三方库封装关系（哪个库用了什么封装）

### 3.8 views.md（动态生成）

> 完全基于项目实际页面代码分析，无预设模板。

**扫描 `src/views/`（或等效目录）的所有页面，提取：**
- 页面目录结构标准（index 文件、数据配置文件、子组件的组织方式）
- 页面模式（识别项目中的 2-3 种典型页面布局，每种给出参考页面路径）
- 数据配置文件模式（如 `*.data.ts` 分离列定义、表单 Schema 的做法）
- 路由配置（路由文件位置、路由定义模式、懒加载方式、meta 字段约定）
- 布局系统（header / sider / menu / tabs / footer 的组织）
- 跨页面共享逻辑（权限控制、面包屑、字典数据、消息提示、国际化）

---

## Step 4: 输出报告

生成完成后，输出 INIT-CONTEXT 报告：

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
  project-context.md  — NEW / UPDATED
  coding-style.md     — NEW / UPDATED
  security.md         — NEW / UPDATED
  api-patterns.md     — NEW / UPDATED
  components.md       — NEW / UPDATED
  types.md            — NEW / UPDATED
  utils.md            — NEW / UPDATED
  views.md            — NEW / UPDATED

需要人工确认:
  {列出推断不确定、需要用户确认的条目}
```

---

## 参数说明

| 参数 | 说明 |
|------|------|
| `quick` | 仅更新 project-context.md，快速刷新工程上下文 |
| `full`（默认） | 更新全部 8 个 rules 文件 |
| `<目录路径>` | 指定目标项目根目录（默认为当前工作目录） |
| `--rules=<path>` | 显式指定 rules 目录位置 |
