# HTML 骨架（起步用）

> **分工：本文件 = WHAT to copy（起步模板代码）。**
> 设计原则、AI slop 黑名单、React/Babel 固定版本、Tweaks 协议、自检流程 → 见 `html-design-standard.md`（**WHY**）。

| 本文件管                                   | 本文件不管                        |
| ------------------------------------------ | --------------------------------- |
| 起步 `<DOCTYPE>...</html>` 整段代码        | 设计原则、配色策略                |
| 内联 CSS 的基础排版 / 深浅自适应           | AI slop 黑名单                    |
| `.card` / `.chip` / `.prompt` 通用原语     | React/Babel 固定 script tag       |
| 单文件结构、`<header class="prompt">` 约定 | 变体探索流程、Tweaks 协议、自检 |

**冲突裁定**：模板结构（标签骨架、CSS 变量名、类名）以本文件为准；设计质量（颜色、字体、密度、避免套路）以 standard 为准。

---

产出 HTML 时，**从这个骨架起步**，保证单文件、内联 CSS、风格一致、深浅自适应。改 `<title>`、填 `<main>`，不要引外部资源。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>__页面名__ · Markdown To HTML</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 2rem;
        font:
          15px/1.6 -apple-system,
          "Segoe UI",
          system-ui,
          sans-serif;
        background: light-dark(#faf9f5, #16161a);
        color: light-dark(#1a1a1a, #e8e8ea);
      }
      header.prompt {
        border-left: 3px solid light-dark(#333, #aaa);
        padding: 0.5rem 1rem;
        margin-bottom: 2rem;
        opacity: 0.85;
        white-space: pre-wrap;
        font-size: 0.9rem;
      }
      header.prompt::before {
        content: "prompt ↓";
        display: block;
        font-size: 0.75rem;
        opacity: 0.6;
        margin-bottom: 0.25rem;
      }
      main {
        max-width: 920px;
        margin: 0 auto;
      }
      h1 {
        font-size: 1.5rem;
        margin: 0 0 1.5rem;
      }
      h2 {
        font-size: 1.1rem;
        margin: 2rem 0 0.75rem;
      }
      .card {
        border: 1px solid light-dark(#ddd, #2a2a30);
        border-radius: 8px;
        padding: 1rem 1.25rem;
        margin: 0.75rem 0;
      }
      .chip {
        display: inline-block;
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        font-size: 0.8rem;
        cursor: pointer;
        border: 1px solid light-dark(#333, #aaa);
        user-select: none;
      }
      .chip.on {
        background: light-dark(#1a1a1a, #e8e8ea);
        color: light-dark(#faf9f5, #16161a);
      }
      footer {
        margin-top: 3rem;
        opacity: 0.55;
        font-size: 0.85rem;
      }
      @media (prefers-reduced-motion: no-preference) {
        .card {
          transition: border-color 0.15s;
        }
      }
    </style>
  </head>
  <body>
    <!-- ⚠️ 粘 prompt 前先转义：& → &amp;  < → &lt;  > → &gt;，否则其中的 <script>/<tags> 会破坏 HTML 结构或注入 -->
    <header class="prompt">把触发本次产出的 prompt 原文粘在这里。</header>

    <main>
      <h1>__标题__</h1>

      <!-- 设计方向：4 张 .card，每张一种风格 + 两个 .chip（采纳/跳过） -->
      <!-- 一次性原型 Mock：可点击布局，A/B 切换，假数据 -->
      <!-- 推介文档：开头动画 demo / GIF，预答异议，签字清单 -->
      <!-- 改动测验：上下文 + 直觉解释 + 改动清单 + 底部测验题 -->

      <p>正文从这里开始。</p>

      <footer>
        Markdown Design HTML · artifacts/design/
        <a href="https://mp.weixin.qq.com/s/YEuc-s20EdGZ0V8QaGhCZA"
          >作者：江枫AGI</a
        >
      </footer>
    </main>
  </body>
</html>
```

**用法**：复制整段到 `artifacts/design/<类型>-<slug>.html`，按注释填 `<main>`，类型相关的交互（采纳/跳过按钮、测验判分）用最少的原生 JS 内联在 `<script>` 里。
