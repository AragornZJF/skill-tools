# 验证报告 · publishing-wechat-articles

> 日期：2026-10-05
> 结论：**验证通过**（Gate 1 全过；Gate 2 场景 1 完整通过；场景 2 已在真实环境**全链路验证**——真实凭证 + IP 白名单下成功发布到草稿箱并返回 media_id）

## Gate 1 · 静态自检

| 检查项 | 结果 |
|---|---|
| frontmatter 仅 name + description | ✅（allowed-tools 以注释形式） |
| description 是触发条件非流程概述 | ✅ |
| description 第三人称、含具体触发词 | ✅（「发布公众号」「公众号排版」「微信发布」等） |
| 目录结构完整（四层架构） | ✅ SKILL.md + scripts/reference/templates/assets |
| SKILL.md 行数 | ✅ 52 行（目标 <200） |
| Quick Reference 路由表 | ✅ 三条路由（排错/模板/主题） |
| 引用文件路径真实存在 | ✅ ls 验证全部存在 |
| 分层自检三连 | ✅ 截断/锚点清理等计算在脚本；排版结构在模板；错误码等低频知识在 reference |
| 命名合规 | ✅ publishing-wechat-articles（动名词、仅字母连字符） |
| 无 README 等辅助文件 | ✅ |
| 脚本语法 | ✅ py_compile 通过 |

## Gate 2 · 实跑试测

**沙箱**：`/tmp/skill-sandbox/`（cp -r 安装）；wenyan v1.0.6（`npm install -g --prefix ~/.wenyan-npm`）。

### 场景 1 · 主路径 dry-run（完整通过 ✅）

测试文章覆盖：front matter / # 标题 / 引言 / 目录大纲 / 章节 / 有语言标识代码块 / 裸代码块 / 锚点链接 / 无图片。

```
publish_wechat.py test-article.md --dry-run
→ {"success": true, "step": "preview", title/word_count:500/sections:2/...}
```

产物 `test-article_wechat.md` 逐项核对：
- ✅ front matter title 保留；# 标题保留
- ✅ 封面图自动插入（正文无图片场景）
- ✅ 分隔线插入
- ✅ 裸代码块自动补 `plaintext`
- ✅ 「## 目录大纲」整段移除
- ✅ 正文零修改（锚点链接按设计保留至发布阶段 4c 清理）
- ✅ LLM 不可用时自动正则 fallback（stderr 日志清晰）
- ✅ 凭证检查后移生效：dry-run 无凭证跑通

### 边界场景（通过 ✅）

| 用例 | 结果 |
|---|---|
| `--no-llm --cover my-cover.png --output-dir` | ✅ 自定义封面与输出目录生效 |
| `--skip-format` | ✅ 跳过格式化 |
| 文件不存在 | ✅ 可读错误 JSON |
| 主题解析（`_get_theme_render_args`） | ✅ CSS 路径/已安装主题名/内置 fallback 三级 |

### 场景 2 · 发布路径（✅ 已在真实环境全链路验证）

| 用例 | 结果 |
|---|---|
| 无凭证正式发布 | ✅ 可读错误 JSON + suggestion（含 IP 白名单提示） |
| 假凭证正式发布 | ✅ 正确到达 token 请求层，返回 `40001/40164` 指引 |
| 真实发布到草稿箱 | ✅ 2026-10-05 实战：真实凭证 + IP 白名单下成功，返回 `media_id`（文章 16,622 字 / 50 章节 / 121KB 内联样式 HTML） |

**真实发布待办**：已完成（2026-10-05，全链路 media_id 返回）。

## 实战修复记录（2026-10-05 首次真实发布）

| # | 问题 | 根因 | 修复（已固化进脚本） |
|---|---|---|---|
| 1 | 所有 HTTPS 请求 `CERTIFICATE_VERIFY_FAILED`（连 pip 安装都失败） | macOS Homebrew Python 缺整个 CA 证书链，无 certifi | 新增 `_fix_ssl()`：环境变量 > certifi > `/etc/ssl/cert.pem` 自动降级 |
| 2 | `wenyan render` 静默失败（exit 0、stdout/stderr 全空） | npm bin 符号链接 shim 在 macOS（provenance/Gatekeeper）下被静默拦截；`node cli.js` 直跑正常 | 新增 `_wenyan_command()`：解析符号链接后统一 `node` 直跑真实入口；render 增加退出码/输出量日志 |
| 3 | 思考型模型（deepseek-v4-flash）LLM 分析返回空正文 | 推理 token 挤占 max_tokens，content 为空 | `reasoning_content` 兜底提取 + max_tokens 1024→4096；空响应仍自动回退正则排版 |

以上三项均已同步到安装目录 `~/.agents/skills/publishing-wechat-articles/`。

## 迭代记录

- 第 1 轮：实现后自检发现 `_resolve_css` 重命名后 execute() 内 4 处引用未同步（会 NameError）→ 修复为 `_get_theme_render_args` 并统一 preview/success JSON 的 theme 字段 → 复检通过。
- 测试环境备注：wenyan 安装位置若不在默认 PATH，脚本会正确报「wenyan CLI 未安装」——与 SKILL.md 前置检查行为一致，非缺陷。
