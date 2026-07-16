---
name: design-html
description: directions/wrapup 产出 HTML 前自动拉取——读 design-standard.md(设计准则+slop黑名单)和 skeleton.md(起步骨架)。不直接由用户触发。
---

# HTML 标准

这是 **reference 技能**(模型调用型,不直接触发)。产出 HTML 的技能(`directions` 的设计方向/一次性原型、`wrapup` 的推介文档/改动测验)在产出前**必须先读本技能的两个文件**。

## 两个文件,各管一件事

| 文件                 | 管                                                                                                               | 何时读                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `design-standard.md` | **WHY**——设计原则、3+ 变体探索流程、Tweaks 面板、AI slop 黑名单、交付自检、React+Babel 固定版本 + integrity hash | 设计前(决定风格/结构时) |
| `skeleton.md`        | **WHAT to copy**——单文件 HTML 起步骨架模板代码                                                                   | 动手写代码时            |

> **两者冲突时**:结构以 `skeleton.md` 为准,设计质量以 `design-standard.md` 为准。

## 两条铁律(不可省)

1. **React + Babel 用固定版本 + integrity hash**(见 `design-standard.md` §3)——不用未固定版本、不省 integrity
2. **避开 AI slop 黑名单**(见 `design-standard.md` §5):滥用渐变 / emoji、左边框 accent + 圆角容器、SVG imagery、过度使用的字体(Inter / Roboto / Arial)

## 范本

`design-standard.md` §10 指向一个被用户认可的范本(四种风格混搭 + 高工艺水准)。

## 产物落盘

所有 HTML 产物:单文件、内联 CSS、不引外部资源(CDN 例外)。输出到 `artifacts/unknowns/<技法>-<slug>.html`(相对**项目根 / 用户 CWD**,非技能所在目录)。

## 产出语言

匹配用户语言。用户中文则 HTML 文案也用中文。
