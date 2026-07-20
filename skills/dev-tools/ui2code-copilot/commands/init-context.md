# Init Context

你是 ui2code-copilot，正在执行 Phase 1: 项目上下文初始化。扫描目标前端项目，生成上下文规范文件（rules），为 Phase 2 提供项目约定基础。

> **此文件为模板。** 安装 skill 时，将此文件复制到目标项目的 `.claude/commands/init-context.md`。

## 参数

$ARGUMENTS

## 参数解析

解析 $ARGUMENTS，确定以下变量：

| 参数值 | 变量 | 说明 |
|--------|------|------|
| `quick` | scanMode = quick | 仅更新 rules/project-context.md，快速刷新工程上下文 |
| `full` 或缺省 | scanMode = full | 更新全部 8 个 rules 文件（默认） |
| `<目录路径>`（非 quick/full，不以 `--` 开头） | projectRoot = <路径> | 指定目标项目根目录（默认为当前工作目录） |
| `--rules=<path>` | rulesDir = <path> | 显式指定 rules 目录位置 |

参数可组合使用，如：`quick /path/to/project` 或 `full --rules=.claude/my-rules/`。

## 加载指令

按以下顺序读取指令文件（按优先级检测路径，取第一个存在的文件）：

1. **核心规则** - 加载核心法则、工作原则、调试流程和 Git 规范：
   - `.claude/ui2code-copilot/references/core-rules.md`
   - `.claude/skills/ui2code-copilot/references/core-rules.md`

2. **详细扫描指令** - 加载完整的 4 步扫描流程和 8 个 rules 文件规范：
   - `.claude/ui2code-copilot/references/init-context-guide.md`
   - `.claude/skills/ui2code-copilot/references/init-context-guide.md`

如果指令文件未找到，提示用户检查 skill 是否已正确安装，终止当前流程。

## Rules 目录检测

按优先级检测 rules 目录位置（写入目标）：

1. `--rules=<path>` 参数显式指定
2. `<目标项目>/.claude/ui2code/rules/` - 首选命名空间
3. `<目标项目>/.claude/code_copilot/rules/` - 向后兼容
4. 以上都不存在 -> 创建 `<目标项目>/.claude/ui2code/rules/`

## 执行步骤

加载指令后，按 init-context-guide.md 执行：

1. **工程结构分析** - 扫描目录树（`tree -d -L 3` 或等效命令），识别分层模式、入口文件、路由结构
2. **技术栈识别** - 扫描 `package.json`、`tsconfig.json`、构建配置、已有 AI 指令，确定框架、UI 库、状态管理、关键依赖
3. **填充 Rules 文件** - 按顺序生成规范文件：
   - `quick` 模式：仅生成 `project-context.md`
   - `full` 模式：生成全部 8 个文件
     - `project-context.md` -> 工程上下文
     - `coding-style.md` -> 编码规范
     - `security.md` -> 安全红线
     - `api-patterns.md` -> API 模式（动态生成）
     - `components.md` -> 组件清单 + 核心组件剖析（动态生成）
     - `types.md` -> 类型定义（动态生成）
     - `utils.md` -> 工具函数目录（动态生成）
     - `views.md` -> 视图组织、页面模式、路由、布局（动态生成）
4. **输出报告** - 列出所有文件的 NEW/UPDATED 状态，标注需要人工确认的条目
