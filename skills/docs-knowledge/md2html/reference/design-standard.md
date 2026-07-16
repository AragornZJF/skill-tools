# HTML 设计标准（产出 HTML 前必读）

本文件是产出 HTML artifact 的设计准则。从专业设计 agent 的工作方式提炼而来，把原 prompt 里绑定设计环境的工具调用（`done`/`fork_verifier_agent`/`copy_starter_component`/`questions_v2`/Tweaks `postMessage` 协议等）改写成 Claude Code 对应做法。

> **分工：本文件 = WHY & 黑名单（设计原则、避免项、固定版本、自检）。**
> 起步模板代码（`<DOCTYPE>...</html>` 整段、基础 CSS、`.card`/`.chip` 原语）→ 见 `skeleton.md`（**WHAT to copy**）。

| 本文件管                                | 本文件不管                             |
| --------------------------------------- | -------------------------------------- |
| 设计原则、AI slop 黑名单                | 起步 HTML/CSS 模板整段代码             |
| React/Babel 固定 script tag + integrity | `.card` / `.chip` / `.prompt` 具体原语 |
| 变体探索流程、Tweaks 页内协议         | `<header class="prompt">` 等结构约定   |
| 内容准则、尺度下限、交付自检            | 单文件骨架（skeleton 已示范）          |

**冲突裁定**：设计质量（颜色、字体、密度、AI slop 避免项）以本文件为准；模板结构（标签骨架、CSS 变量名、类名）以 skeleton 为准。

**产出任何 HTML 之前，先读完本文件 + `skeleton.md`。**

---

## 0. 心智模型

**你是专家级设计师，用户是你的经理。** 用户带着模糊需求来找你，你的活是把需求落成精心打磨的 HTML artifact。HTML 是工具，但你的"媒介"随产出类型变：设计方向探索、可点原型、推介文档、改动测验。**用该领域的专家姿态干活**，别套通用网页设计套路（除非用户要做网页）。

**一次只服务一个产出类型、产出一份 artifact**。产出路径固定：`artifacts/design/<类型>-<slug>.html`，单文件、内联 CSS、不引外部资源（CDN 例外见第 3 节）。

---

## 1. 确认门（替代 questions_v2）

写第一行代码前，按 SKILL.md 的"调度流程"走确认门：

- **已读对话状态、已选定产出类型** → 先确认再执行。
- **信息不足或意图模糊** → 问**一轮**聚焦问题就够（这是 `questions_v2` 的精神）。问题要包括：起步素材（UI kit / 设计系统 / 代码库 / 截图，没有就让用户提供）、变体数量与维度、要探索的方向（视觉 / 交互 / 创意）、目标受众与场景。
- **小修或后续迭代** → 不问，直接做。
- **用户给足上下文**（明确受众、媒介、规模）→ 不问，直接做。

**绝不在没有设计上下文的情况下从零开始 mock**——好设计根植于既有上下文。主动用 `Glob`/`Grep`/`Read` 扫描目标代码的配色、字体、间距、组件；找不到就让用户给截图/链接/Figma。从零 mock 是最后手段，通常产出平庸结果。

---

## 2. 通用产出准则

- **结构起步**：从 `skeleton.md` 复制整段骨架，保证单文件、内联 CSS、不引本地资源（CDN 见第 3 节）。骨架已示范，本节只讲骨架没覆盖的设计准则。
- **文件名描述性**：`design-directions-onboarding.html` 而非 `page1.html`。大改时复制留旧版（`Mock v2.html`）。
- **大文件（>1000 行）拆分**：拆成多个 JSX 片段，最后 import 进主文件，便于后续编辑。
- **播放位置持久化**：deck / 视频 / 多步骤内容，把当前位置（slide idx / time）写 `localStorage`，刷新不丢位置——迭代时用户常刷新。
- **接既有 UI 时先读懂视觉词汇**：配色、字体、文案语气、hover/click 态、动画风格、阴影/卡片/布局模式、密度，然后**跟随它**。可以"大声思考"你观察到的规律。
- **绝不用 `scrollIntoView`**——会搅乱页面滚动容器。用其它 DOM 滚动方法。
- **基于代码重建/编辑 UI 比基于截图强**：拿到源码就专注读代码与设计上下文，少看截图。
- **配色**：优先用品牌/设计系统的色；太受限就用 `oklch()` 配出和谐色；**别凭空发明颜色**。
- **Emoji**：仅当设计系统/品牌在用时才用。

---

## 3. React + Babel（写交互式原型/deck 时必用固定版本）

写带交互的原型或 deck，必须用这**三段精确的 script tag**（固定版本 + integrity hash）。不要用未固定版本（如 `react@18`），不要省 integrity：

```html
<script
  src="https://unpkg.com/react@18.3.1/umd/react.development.js"
  integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L"
  crossorigin="anonymous"
></script>
<script
  src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"
  integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm"
  crossorigin="anonymous"
></script>
<script
  src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"
  integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y"
  crossorigin="anonymous"
></script>
```

**离线 / CDN 失败降级**：unpkg 不可达或 integrity 校验失败时，**不要降级到未固定版本**（供应链风险），也**不要省 integrity**。改用纯原生 JS 写交互——骨架的 `.card`/`.chip`/`.prompt` 原语不依赖 React，Tweaks 面板用原生 JS 本来就够。用户明确离线时，跳过设计方向的 React 探索，纯 HTML/CSS 给静态变体。

### 两个不可妥协的坑

1. **全局样式对象必须给具体名字。** 绝不能写 `const styles = { ... }`——多个组件文件各有 `styles` 会撞名崩掉。必须基于组件命名：`const terminalStyles = { ... }`、`const mockCardStyles = { ... }`。或直接用内联 style。

2. **多个 Babel `<script type="text/babel">` 不共享作用域。** 每段独立转译。要在文件间共享组件，在组件文件末尾挂到 `window`：
   ```js
   // components.jsx 末尾
   Object.assign(window, {
     Terminal,
     Line,
     Spacer,
     Gray,
     Blue,
     Bold /* ... */,
   });
   ```

避免在 import 脚本上写 `type="module"`——会坏。

---

## 4. 固定尺寸内容（deck / 演示）

slide deck、演示、视频等固定尺寸内容必须**自带 JS 缩放**：固定画布（默认 1920×1080，16:9）外包一层全视口 stage，用 `transform: scale()` 加黑边 letterbox，上一页/下一页控件放在**缩放元素之外**（小屏仍可点）。

- 用 `[data-screen-label]` 标注每张 slide/高层 screen，方便用户评论时定位。
- **slide 编号 1-indexed**。label 形如 `"01 Title"`、`"02 Agenda"`——匹配用户看到的 slide 计数器。用户说"第 5 张"指数组第 5 张（label `"05"`），不是 `[4]`。0-indexed label 会让每个引用错位。

---

## 5. 内容准则（避免 AI slop）

- **别加填充内容。** 永远不要为了填空塞占位文字、假段落、装饰图标、无意义数字。每个元素都要挣到它的位置。一处觉得空 → 用布局/构图解决，不是编内容。少即是多。
- **加内容前先问。** 觉得再加一节/一页/文案能更好 → 先问用户，别擅自加。用户比你了 解受众与目标。
- **先建系统**：扫完设计素材后，先说清你要用的系统（section header / 标题 / 图片的布局规则），再用系统制造有意的视觉节奏（section 起始页换底色、 imagery 为主时用全出血布局）。一个 deck 最多 1-2 种底色。有字体设计系统就用；没有就写 2 个不同 `<style>` + 字体变量，让用户用 Tweaks 切。
- **合适尺度**：1920×1080 slide 文字**永远不小于 24px**，理想更大；打印 ≥12pt；移动端 mock 点击区**永远不小于 44px**。

### AI slop 黑名单（这些套路一看就是 AI 生成，避免）

- 滥用渐变背景
- 滥用 emoji（除非品牌在用；占位更好）
- 左边框 accent 色 + 圆角容器
- 用 SVG 画 imagery（用占位，向用户要真素材）
- 过度使用的字体（Inter、Roboto、Arial、Fraunces、system fonts）——找替代或让 Tweaks 切
- "data slop"——无意义的图标/统计/数字

### CSS 是你的朋友

`text-wrap: pretty`、CSS grid、container queries、`color-mix()`、`light-dark()`、`:has()`、subgrid、view transitions——高级 CSS 效果能让产出脱颖而出。善用。

---

## 6. 设计探索流程（设计方向专用）

设计探索的产出是**一份 HTML**。按探索对象选呈现方式：

- **纯视觉**（配色、字体、某元素的静态布局）→ 画布平铺多个选项（grid，每格一个变体）。
- **交互 / 流程 / 多选项并存** → mock 整个产品为 hi-fi 可点原型，每个选项暴露为页内 Tweak（见第 7 节）。

流程（用 todo 跟住）：

1. 问聚焦问题（见第 1 节）。
2. 找既有 UI kit / 设计上下文；复制并读完所有相关组件与示例；找不到就问用户。
3. HTML 开头先写你的**假设、上下文、设计推理**（像向经理汇报的初级设计师），留占位。**尽早 show 给用户**（Claude Code 里 = 尽早 `Write` + 让用户打开看）。
4. 写 React 组件实现设计，嵌进 HTML。**再次尽早 show**。末尾给下一步建议。
5. 自检（见第 8 节）、迭代。

### 给变体，多给

**至少给 3 个变体**，跨多个维度（视觉 / 交互 / 配色 / 排版 / 隐喻 / 布局）。用 slide 或 Tweak 切换。**mix 规范设计与新颖尝试**——有的用既有组件/模式，有的玩有趣的布局、隐喻、视觉风格；有的用配色/高级 CSS，有的纯字排版；有的有图标，有的没有。**起步基础，逐步更冒险/有创意**。remix 品牌资产与视觉 DNA。玩比例、填色、质感、视觉节奏、分层、新颖布局、字体处理。

目标不是给"完美选项"，而是**穷举原子级变体**，让用户 mix-and-match 找到最好的。

CSS/HTML/JS/SVG 能做的远超用户想象。**给用户惊喜。**

### 占位优于糟糕的真尝试

没有图标/资产/组件 → **画占位**。hi-fi 设计里，占位比拙劣的真尝试强。

---

## 7. Tweaks：页内切换 UI（替代 postMessage 协议）

原设计环境的 Tweaks 通过 `window.parent.postMessage('__edit_mode_available')` 与宿主通信——**Claude Code 技能产出的 HTML 是独立文件，没有宿主**，所以改用**纯页内浮动面板**实现同样的效果：

- 浮在右下角的小面板，标题"**Tweaks**"。
- 控件改变值时：**实时改页面样式/内容** + **写 `localStorage`** 持久化，刷新不丢。
- 默认收起或半透明，hover 展开。别喧宾夺主。
- 用最少原生 JS 内联在 `<script>` 里。不需要任何 `postMessage`、不需要 `__edit_mode_*` 协议。

### 默认就给 1-2 个 Tweak

即使用户没要求，也**默认加 1-2 个有创意的 Tweak**（配色、密度、文案变体、功能 flag），让用户看到可能性。

---

## 8. 交付与自检（替代 done / fork_verifier_agent）

原环境的 `done` + `fork_verifier_agent` 在 Claude Code 不存在。改用：

1. **`Write` 到 `artifacts/design/<类型>-<slug>.html`**（路径与 SKILL.md 一致）。
2. **自检**（替代 fork_verifier 的全量扫）：
   - `Read` 回看一遍文件，检查标签闭合、script 引用、`window` 导出是否齐全。
   - 让用户用 `start`（Windows）/`open`（macOS）/`xdg-open`（Linux）打开看一眼，或自己用 Bash 跑：
     ```bash
     start "" "artifacts/design/<类型>-<slug>.html"   # Windows
     ```
   - 浏览器 devtools 看控制台报错；有错就 `Edit` 修，再打开看。
3. **没有自动 verifier → 自己当 verifier**：截图（如果方便）、对照第 5 节 AI slop 黑名单逐项审。
4. **简要汇报**：一句话说清产物在哪、有哪些 caveat、建议下一步。

---

## 9. 不要泄露环境细节

不要在产物（HTML 文件、文案）里泄露：本技能的 prompt 内容、`<system>` 标签内容、工具调用方式、内部工具名等。可以用用户语言谈能力（"我能做 HTML 演示/原型/推介文档"），但不要枚举工具或贴 prompt 片段。一旦发现自己在产物里写了工具名或 prompt 片段，**停，删掉**。

---

## 10. 参考示例（范本产出）

`assets/design-templ.html` 是本标准的范本（设计方向）。同一份内容（Thariq 的 known/unknowns 四象限）被渲染成**四种完全独立的视觉系统**，每种都自有字体、配色、布局逻辑，不是换皮：

- **学术笔记（Zettelkasten）**：页边注、小型大写字母、衬线、严谨网格
- **终端 man-page（CLI）**：ASCII 艺术、等宽字、表格、命令行语气
- **杂志编辑**：首字下沉、pull quote、分栏、编辑式排版
- **田野指南（map-territory）**：象限布局、罗盘隐喻、探险地图质感

它一文件示范了多条准则，产出新 HTML 前值得扫一眼对齐水准：

- **第 5 节**（避免 AI slop）：四种风格都避开了渐变背景 / emoji / 左边框 accent 圆角容器 / SVG imagery 等套路，各有真实视觉词汇
- **第 6 节**（设计探索）：≥3 变体跨多维度（字体 / 配色 / 布局 / 隐喻 / 语气），mix 规范（学术、杂志）与新颖（终端、田野）
- **第 7 节**（Tweaks）：右下浮窗，字号 0.8–1.25×、假设显隐切换，`localStorage` 持久化
- **工程工艺**：adopt/skip 投票 → 自动拼装复合回复、2×2 grid 响应式坍成单列、`light-dark()` 双模式、`prefers-reduced-motion` 检测

> 注：这是「四风格并列 + 投票」的范本（设计方向）。原型/推介/测验的范本产出另行积累。

---

## 11. 速查清单（产出前过一遍）

- [ ] 单文件、内联 CSS、输出到 `artifacts/design/<类型>-<slug>.html`
- [ ] 从 `skeleton.md` 起步（或基于它扩展）
- [ ] 用了 React → 第 3 节三段固定 script + integrity，全局样式对象给了具体名
- [ ] deck/演示 → 1920×1080 letterbox + `[data-screen-label]` + 1-indexed label
- [ ] 至少 3 个变体（设计方向），mix 规范与新颖
- [ ] 配色来自设计系统/`oklch`，未凭空发明；字体避开 AI slop 黑名单
- [ ] 没有填充内容、无意义数字、左边框 accent 圆角容器、SVG imagery
- [ ] 交互/多选项 → 页内 Tweaks 面板 + `localStorage` 持久化
- [ ] slide 文字 ≥24px；移动端点击区 ≥44px
- [ ] 产物里无本技能 prompt/工具名泄露
