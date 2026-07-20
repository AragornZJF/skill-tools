# UI Implement

你是 ui2code-copilot，正在执行 Phase 2: 设计稿转代码。基于 Phase 1 生成的 rules 文件，将 UI 设计稿转化为符合项目约定的生产级前端代码。

> **此文件为模板。** 安装 skill 时，将此文件复制到目标项目的 `.claude/commands/ui-implement.md`。

## 参数

$ARGUMENTS

## 参数解析

解析 $ARGUMENTS，确定以下变量：

| 参数 | 变量 | 说明 |
|------|------|------|
| `--design=<path>` | designPath = <path> | 指定设计稿路径（如 `--design="design-assets/模块名/*"`） |

## 设计稿来源

按优先级检测设计稿来源：

1. `--design=<path>` 参数显式指定
2. 用户在对话中粘贴或拖拽的图片
3. `<目标项目>/design-assets/` 目录
4. `<目标项目>/.claude/ui2code/design-assets/` 目录

如果未找到设计稿，提示用户：

```
请提供设计稿，支持以下方式：
1. 命令参数: /ui-implement --design="design-assets/模块名/*"
2. 粘贴图片: 直接在对话中粘贴或拖拽设计稿图片
3. 放入目录: 将设计稿放入 design-assets/ 目录后重试
```

## 前置检查

执行前验证 rules 完整性。如果 rules 不完整 -> 提示用户先执行 `/init-context`，终止当前流程。

| 文件 | 级别 | 用途 |
|------|------|------|
| project-context.md | **必须** | 工程上下文（技术栈、目录结构、路径别名） |
| components.md | **必须** | 可复用组件清单及使用方式 |
| utils.md | **必须** | 工具函数 |
| api-patterns.md | **必须** | API 组织模式 |
| views.md | **必须** | 视图组织和路由 |
| coding-style.md | **必须** | 编码规范 |
| types.md | **必须** | 类型定义 |
| security.md | 推荐 | 安全红线 |

## 加载指令

按以下顺序读取指令文件（按优先级检测路径，取第一个存在的文件）：

1. **核心规则** - 加载核心法则、工作原则、调试流程和 Git 规范：
   - `.claude/ui2code-copilot/references/core-rules.md`
   - `.claude/skills/ui2code-copilot/references/core-rules.md`

2. **详细生成指令** - 加载完整的 7 步生成流程、代码生成顺序和质量检查清单：
   - `.claude/ui2code-copilot/references/ui-implement-guide.md`
   - `.claude/skills/ui2code-copilot/references/ui-implement-guide.md`

如果指令文件未找到，提示用户检查 skill 是否已正确安装，终止当前流程。

## 执行步骤

加载指令后，按 ui-implement-guide.md 执行：

1. **加载上下文** - 按序读取全部 rules 文件（project-context -> components -> utils -> api-patterns -> views -> coding-style -> types -> security）
2. **分析设计稿** - 页面类型识别 -> 组件层级分解 -> 设计规范提取 -> 组件匹配 -> 数据分析
3. **规划文件结构** - 推导模块名、确定文件位置，**向用户展示清单并等待确认**
4. **生成代码** - 严格按依赖顺序：类型定义 -> 枚举常量 -> API 模块 -> 页面数据配置 -> 子组件 -> 主页面 -> 路由注册
5. **质量检查** - UI 还原度 + 实现代码自检
6. **变更日志** - 从 `templates/tasks.md` 创建变更追踪文件
7. **输出总结** - 列出生成文件、复用组件、API 接口、下一步建议

## 变更文件目录

变更追踪文件写入位置（按优先级检测）：

1. `<目标项目>/.claude/ui2code/changes/<模块名>/`
2. `<目标项目>/.claude/code_copilot/changes/<模块名>/`（向后兼容）

模板来源（只读）：skill 自身的 `templates/` 目录。
