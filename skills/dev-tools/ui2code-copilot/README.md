# ui2code-copilot

Design-to-code copilot - 扫描任意前端项目生成上下文规范，然后基于规范将 UI 设计稿转化为符合项目约定的生产级代码。

## 工作流

```
init-context（扫描项目 -> 生成 8 个 rules 文件）
       ↓
ui-implement（设计稿 + rules -> 符合项目约定的代码）
```

## 安装

本 skill 为纯 skill（无插件清单），放入 skill 发现目录即自动加载：

- **项目级：** `<项目>/.claude/skills/ui2code-copilot/`
- **用户级：** `~/.claude/skills/ui2code-copilot/`

将本目录整体复制到上述任一位置即可。无需 marketplace 注册或 `/plugin` 启用。

## 使用

触发词会自动激活 skill：

- **Phase 1：** "init context" "scan project" "项目上下文" "扫描代码" "初始化项目"
- **Phase 2：** "implement UI" "design to code" "设计稿还原" "设计图转代码" "切图"

> Phase 2 必须在 Phase 1 完成后执行（依赖 rules 文件）。

## 路径约定

skill 向**目标项目**（当前工作目录或指定路径）读写文件，而非 skill 自身目录。

| 用途       | 路径（按优先级检测）                                                 |
| ---------- | -------------------------------------------------------------------- |
| Rules 文件 | `.claude/ui2code/rules/` -> `.claude/code_copilot/rules/`（向后兼容） |
| 变更追踪   | `.claude/ui2code/changes/<模块名>/`                                  |
| 设计稿     | `design-assets/` 或 `--design=` 参数指定                             |

## 目录结构

```
ui2code-copilot/
├── SKILL.md                  # skill 入口（两阶段路由）
├── references/
│   ├── core-rules.md         # 核心法则、原则、调试流程、Git 规范
│   ├── init-context-guide.md # 详细扫描指令（8 个 rules 文件规范）
│   └── ui-implement-guide.md # 详细生成指令（7 步流程）
├── templates/                # 变更追踪模板
│   ├── tasks.md
│   ├── log.md
│   ├── test-spec.md
│   └── change-record.md
└── README.md
```

## 技术栈兼容性

本 skill 框架无关（framework-agnostic），适配目标项目的实际技术栈：

- **React** - 函数组件、Hooks、JSX/TSX
- **Vue** - Composition API、`<script setup>`、SFC
- **Angular** - 组件、服务、模板
- **其他** - 根据项目实际代码分析生成对应规范

## License

MIT
