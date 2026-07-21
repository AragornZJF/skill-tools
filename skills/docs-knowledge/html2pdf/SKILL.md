---
name: html2pdf
description: 将HTML文件转换为PDF。当用户要求把HTML转PDF、生成PDF、保存为PDF时使用。优先使用系统自带浏览器headless模式，无需安装额外依赖。支持 Windows / macOS / Linux。
version: 1.0.0
category: 工具
platforms:
  - WorkBuddy
  - Claude Code
  - Cursor
  - QClaw
tags:
  - pdf
  - html
  - converter
  - 文件转换
  - 浏览器
agent_created: true
---

# HTML to PDF Skill

## 概述

将 HTML 文件转换为 PDF，使用系统自带浏览器 headless 模式打印 PDF。

**支持平台：** Windows / macOS / Linux  
**无需安装：** 依赖系统已有浏览器（Edge、Chrome、Chromium）

---

## 使用方法

### 步骤 1：查找浏览器

按优先级查找系统浏览器：

**Windows：**

1. `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` （Edge，优先）
2. `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
3. `C:\Program Files\Google\Chrome\Application\chrome.exe` （Chrome）
4. `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

**macOS：**

1. `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`
2. `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

**Linux：**

1. `which chromium-browser || which chromium || which google-chrome || which chrome`
2. 或查找 `/usr/bin/chromium`、`/usr/bin/google-chrome`

### 步骤 2：用 headless 模式打印 PDF

找到浏览器后，执行命令。`--print-to-pdf-no-header` 用于去除页眉页脚。

**Windows（Bash / Git Bash）：**

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --print-to-pdf-no-header \
  --print-to-pdf="<PDF路径>" \
  "file:///<HTML路径（正斜杠）>"
```

**Windows（PowerShell）：**

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --headless --disable-gpu --no-sandbox --print-to-pdf-no-header `
  --print-to-pdf="<PDF路径>" `
  "file:///<HTML路径（正斜杠）>"
```

**macOS / Linux（Bash）：**

```bash
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --headless --disable-gpu --no-sandbox --print-to-pdf-no-header \
  --print-to-pdf="/Users/用户名/川西7日游计划.pdf" \
  "file:///Users/用户名/川西7日游计划.html"
```

**注意：**

- `--headless` 不要用 `--headless=new`（旧版Edge不支持）
- `file://` URL：Windows 用 `file:///C:/path/file.html`（三个斜杠 + 盘符）；macOS/Linux 用 `file:///path/file.html`（绝对路径以 / 开头，共三个斜杠）
- 路径中的反斜杠需要替换为正斜杠
- `--print-to-pdf-no-header` 去除页眉页脚；新版 Chrome（M112+）可用 `--no-pdf-header-footer` 替代

**验证 PDF 是否生成成功：**

```python
import os
pdf_path = "<PDF路径>"
if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
    print("PDF生成成功")
else:
    print("PDF生成失败")
```

### 步骤 3：备用方案

如果 headless 模式失败，提示用户：

> "无法自动生成PDF。请在浏览器中打开 HTML 文件，按 Ctrl+P（Mac：Cmd+P），选择'另存为PDF'或'打印为PDF'。"

---

## 完整 Python 脚本

见 `scripts/html2pdf.py`，可直接调用：

```bash
python scripts/html2pdf.py <输入HTML或URL> <输出PDF>
```

脚本支持本地 HTML 文件和 http/https 网页 URL 两种输入。

---

## 注意事项

1. **中文字体：** headless 模式使用系统字体，中文显示正常
2. **CSS 打印样式：** HTML 中可用 `@media print` 优化打印效果
3. **页面大小：** 默认 A4，可在 HTML 中用 `@page { size: A4; }` 指定
4. **页眉页脚：** 添加 `--print-to-pdf-no-header` 可去除页眉页脚
5. **背景色：** 如需保留背景色，在 HTML 中加 `-webkit-print-color-adjust: exact`
6. **超时：** 脚本默认 60 秒超时，复杂页面可适当调大

---

## 示例

**输入：** `川西7日游计划.html`  
**输出：** `川西7日游计划.pdf`

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless --disable-gpu --no-sandbox --print-to-pdf-no-header \
  --print-to-pdf="D:/川西7日游计划.pdf" \
  "file:///D:/川西7日游计划.html"
```
