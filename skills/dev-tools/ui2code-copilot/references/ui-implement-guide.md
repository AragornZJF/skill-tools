# UI Implement Guide

本文件是 ui-implement skill 的详细执行指令。基于设计稿和项目上下文规范，生成符合项目约定的生产级前端代码。

---

## 路径解析

执行前确定目标项目的关键目录位置（按优先级检测）：

**Rules 目录（读取上下文）：**
1. `--rules=<path>` 参数显式指定
2. `<目标项目>/.claude/ui2code/rules/`
3. `<目标项目>/.claude/code_copilot/rules/`（向后兼容）

**变更文件目录（写入变更追踪）：**
- `<目标项目>/.claude/ui2code/changes/<模块名>/`
- 回退：`<目标项目>/.claude/code_copilot/changes/<模块名>/`

**模板来源（只读）：**
- 插件自身的 `templates/` 目录

**设计稿目录：**
1. `--design=<path>` 参数显式指定
2. `<目标项目>/design-assets/`
3. `<目标项目>/.claude/ui2code/design-assets/`

---

## 前置检查

### 1. 验证 Rules 完整性

检查 rules 目录是否存在且包含完整的上下文文档：

| 文件 | 级别 | 用途 |
|------|------|------|
| project-context.md | **必须** | 工程上下文（技术栈、目录结构、分层架构） |
| components.md | **必须** | 可复用核心组件及使用方式 |
| utils.md | **必须** | 常用工具函数 |
| api-patterns.md | **必须** | API 组织方式与使用模式 |
| views.md | **必须** | 视图组织方式与常见模式 |
| coding-style.md | **必须** | 编码规范（命名、类型、组件、样式） |
| types.md | **必须** | 常用 TypeScript 类型定义 |
| security.md | 推荐 | 安全红线 |

**如果上下文文档不完整** → 提示用户先执行 init-context skill，由它扫描目标项目并生成缺失的 rules 文件，然后终止当前流程。

### 2. 确定设计稿来源

- 如果参数包含 `--design=` → 提取设计稿路径
- 如果参数为空 → 检查 design-assets/ 目录是否有设计稿
- 如果用户在对话中粘贴了图片 → 使用该图片作为设计稿

**如果没有找到设计稿** → 提示用户提供：

```
请提供设计稿，支持以下方式：
1. 命令参数: --design="design-assets/模块名/*"
2. 粘贴图片: 直接在对话中粘贴或拖拽设计稿图片
3. 放入目录: 将设计稿放入 design-assets/ 目录后重试
```

---

## 步骤 1: 加载上下文

读取所有上下文文档，建立项目知识库：

```
读取顺序:
1. project-context.md  → 框架信息、目录布局、编码规范
2. components.md       → 可复用组件、UI 库组件、选择规则
3. utils.md            → 工具函数、HTTP 客户端
4. api-patterns.md     → CRUD 模式、API 约定
5. views.md            → 路由结构、视图组织方式、新增方式
6. coding-style.md     → Design Token、工具类、样式约定
7. types.md            → 类型定义、枚举
8. security.md         → 安全约束
```

---

## 步骤 2: 分析设计稿

对设计稿进行全面的 UI 分析。

### 2.1 识别页面类型

判断设计稿属于哪种页面类型：

| 页面类型 | 特征 |
|---------|------|
| 表格列表页 | 搜索栏 + 数据表格 + 分页 + 操作列 |
| 表单页 | 表单输入 + 提交/取消按钮 |
| 详情页 | 数据展示 + 描述列表 + 操作按钮 |
| Dashboard | 卡片 + 图表 + 统计数据 |
| 复合页 | 上述类型的组合（如左侧树 + 右侧表格） |
| 弹窗/抽屉 | 浮层形式的表单或详情 |

### 2.2 拆解 UI 元素

将设计稿拆解为组件层级树：

```
页面根容器
├─ 区域 A: 搜索/筛选栏
│  ├─ 输入框
│  ├─ 下拉选择
│  └─ 按钮（搜索/重置）
├─ 区域 B: 操作栏
│  ├─ 新增按钮
│  └─ 批量操作按钮
├─ 区域 C: 数据表格
│  ├─ 列定义
│  ├─ 操作列（编辑/删除/查看）
│  └─ 分页器
├─ 区域 D: 编辑弹窗
│  ├─ 表单字段
│  └─ 确定/取消按钮
└─ 区域 E: 详情抽屉
   └─ 描述信息
```

### 2.3 提取设计规范

从设计稿中提取：

- **颜色值**：主题色、背景色、文字色、边框色、状态色
- **字体**：字号、字重、行高
- **间距**：padding、margin、gap
- **布局**：flex 方向、对齐方式、栅格比例
- **组件状态**：默认态、hover、active、disabled、loading、选中态
- **交互元素**：按钮、链接、可点击区域、表单控件

### 2.4 组件匹配

对每个 UI 元素，按以下优先级匹配组件：

```
1. 在 components.md 的「项目共享组件」中查找
   ├─ 找到 → 使用该组件，按其 API 文档配置 Props
   └─ 未找到 ↓

2. 在 components.md 的「UI 库组件」中查找
   ├─ 找到 → 使用 UI 库组件
   └─ 未找到 ↓

3. 创建新的自定义组件（放在页面级 components/ 目录）
```

### 2.5 数据分析

标注每个区域需要的数据：

- 需要 API 调用的区域 → 标注 API 函数名（参考 api-patterns.md）
- 需要枚举映射的区域 → 标注枚举名（参考 types.md）
- 需要 Design Token 的区域 → 标注变量名（参考 coding-style.md）

---

## 步骤 3: 规划文件结构

### 3.1 确定模块名

从设计稿路径或用户描述中推导模块名：

- `design-assets/patient/` → 模块名 `patient`
- `design-assets/system/user/` → 模块名 `user`，父模块 `system`
- 用户描述"患者管理页面" → 模块名 `patient`

### 3.2 确定文件位置

基于 project-context.md 和 views.md 的映射规则确定路径。通用映射参考：

| 文件类型 | 位置模式 | 命名 |
|---------|---------|------|
| 主页面 | `{页面目录}/{module}/index.{ext}` | index.vue / index.tsx |
| 子组件 | `{页面目录}/{module}/components/{Name}.{ext}` | PascalCase |
| 页面数据 | `{页面目录}/{module}/data.{ext}`（如需要） | data.ts |
| API 模块 | `{API 目录}/{module}/index.{ext}` | index.ts |
| API 类型 | `{API 目录}/{module}/model.{ext}`（如需要） | model.ts |
| 类型定义 | `{类型目录}/{module}.{ext}`（如需要） | module.d.ts |
| 枚举常量 | `{枚举目录}/{module}.{ext}`（如需要） | module.ts |
| 路由配置 | `{路由配置路径}/{module}.{ext}` | module.ts |

**注意：** 上表中的 `{页面目录}`、`{API 目录}` 等占位符必须从 project-context.md 中获取实际路径。

### 3.3 展示文件规划

向用户展示即将生成的文件清单，确认后开始生成：

```
即将生成以下文件:

新增:
  src/views/{module}/index.vue              # 主页面
  src/views/{module}/components/EditModal.vue # 编辑弹窗
  src/api/{module}/index.ts                 # API 模块
  src/api/{module}/model.ts                 # API 类型

修改:
  src/router/modules/{module}.ts            # 新增路由配置（如需要）

复用:
  src/components/BasicTable                 # 使用已有组件（来自 components.md）
  src/components/BasicForm                  # 使用已有组件（来自 components.md）
```

---

## 步骤 4: 生成代码

**严格按照以下顺序生成文件**，每个文件都要符合 project-context.md 中定义的编码规范。

### 4.1 生成类型定义

如果设计稿中有需要新增的类型：

- 从 types.md 中检查是否已有可复用的类型
- 新增类型放在 `{类型目录}/{module}.d.ts` 或 `{API 目录}/{module}/model.ts`
- 严格遵循项目中的类型定义风格（参考 types.md 中已有的类型）

### 4.2 生成枚举常量

如果设计稿中有需要新增的枚举：

- 从 types.md 中检查是否已有可复用的枚举
- 新增枚举放在 `{枚举目录}/{module}.ts`
- 如果项目有枚举工具函数（如 getEnumOptions），确保使用

### 4.3 生成 API 模块

基于 api-patterns.md 中的标准 CRUD 模式：

- 使用正确的 HTTP 客户端（导入路径和调用方式来自 project-context.md）
- 端点定义方式与项目一致（enum / 常量对象 / 直接字符串）
- 函数命名遵循项目约定（动词 + 名词）
- 类型导入路径正确

### 4.4 生成页面数据配置

如果页面有表格列、搜索表单等配置数据：

- 生成到 `{页面目录}/{module}/data.{ext}`
- 与 components.md 中的组件配置格式一致

### 4.5 生成子组件

对于弹窗、抽屉、复杂表格列等子组件：

- 放在 `{页面目录}/{module}/components/` 目录
- 命名使用 PascalCase
- Props 和 Events 定义清晰
- 使用 components.md 中推荐的组件

### 4.6 生成主页面

主页面是最后生成的，因为它依赖以上所有文件：

- 参考项目中已有的同类页面结构
- 确保所有导入路径正确
- 样式使用 coding-style.md 中的约定
- 交互状态完整（hover / active / disabled / loading）

### 4.7 注册路由

如果 views.md 指出需要手动注册路由：

- 按路由配置模板生成路由文件
- 路径和组件映射正确
- meta 信息完整（title, icon 等）

---

## 步骤 5: 代码质量检查

生成完成后，自动进行以下检查。

### 5.1 UI 还原度检查

- [ ] 布局结构与设计稿一致
- [ ] 颜色值使用 Design Token（不硬编码）
- [ ] 字体大小、行高一致
- [ ] 间距（padding / margin）与设计稿一致
- [ ] 交互状态完整（hover / active / disabled / loading）
- [ ] 响应式适配

### 5.2 实现代码自检

- [ ] 复用已有组件（来自 components.md）
- [ ] 复用工具函数（来自 utils.md）
- [ ] 遵循 API 模式（来自 api-patterns.md）
- [ ] 类型定义完整（来自 types.md）
- [ ] 样式遵循项目约定（来自 coding-style.md）
- [ ] 安全约束满足（来自 security.md）
- [ ] 导入路径正确（别名来自 project-context.md）
- [ ] 文件命名符合项目约定
- [ ] 编码风格一致（引号、分号、行宽等来自 project-context.md）

---

## 步骤 6: 变更日志

UI 实现完成后，必须同步将变更信息记录到变更追踪文件。

### 6.1 创建变更文件

在目标项目的变更目录下以模块名创建目录，从插件的 `templates/tasks.md` 读取模板并填充：

```
<目标项目>/.claude/ui2code/changes/<变更名>/tasks.md
```

### 6.2 填充 tasks.md

按依赖顺序拆分任务，每个 task 标注：

- 涉及文件路径与操作类型（新增/修改）
- 关键函数/组件签名
- 依赖关系
- 验收标准

拆分顺序：类型定义 → 接口层 → Hooks/逻辑层 → 组件层 → 页面/路由

### 6.3 原子更新铁律

**代码变更和 tasks.md 必须同步更新：**

- 完成一个 task → 立即勾选对应完成状态
- 不允许代码全部写完后才补文档

---

## 步骤 7: 输出总结

```text
UI 设计稿实现完成!

生成文件:
  {列出所有新增和修改的文件}

复用组件:
  {列出从 components.md 中匹配使用的组件}

API 接口:
  {列出生成的 API 函数}

下一步:
  1. 启动开发服务器验证效果
  2. 对比设计稿进行微调
  3. 检查交互状态和响应式布局
```

---

## 生成约束

1. **严格遵循 project-context.md** — 编码规范、目录结构、路径别名必须一致
2. **优先复用** — 组件、工具函数、类型、枚举优先从上下文文档中匹配复用
3. **不硬编码样式值** — 颜色、字号、间距必须使用 coding-style.md 中的约定
4. **不修改全局样式** — 只在页面级使用 scoped style，不修改全局变量文件
5. **不修改已有文件** — 除非是路由注册等必要修改，且修改前向用户确认
6. **使用项目语言** — 注释和 UI 文本使用 project-context.md 中声明的语言
7. **安全约束** — 遵循 security.md 中的安全红线
