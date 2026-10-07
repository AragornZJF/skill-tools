#!/usr/bin/env python3
"""微信公众号文章排版发布流水线 — format → theme → preview → publish

用法:
  python3 publish_wechat.py <article_path> [选项]

选项:
  --theme PATH_OR_NAME   CSS 主题文件路径或 wenyan 已安装主题名（默认: 技能内置 assets/blue.css）
  --highlight NAME       代码高亮主题（默认: atom-one-dark）
  --dry-run              仅预览（Format→Theme→Preview），不发布，不要求微信凭证
  --skip-format          跳过格式化步骤，直接使用原文件
  --cover PATH           自定义封面图路径（默认: 技能内置 assets/cover.png）
  --no-llm               跳过 LLM 结构分析，直接用正则排版（离线可用）
  --output-dir DIR       格式化产物输出目录（默认: <文章同目录>/output/）

输出约定:
  stdout 仅输出 JSON 结果（ensure_ascii=False），日志/进度走 stderr。

来源: 改造自 article_writer_agent/orchestrator/agent/tools/publisher.py
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

# ---------------------------------------------------------------------------
# 路径：一切以技能根为基准（scripts/ 的上一级）
# ---------------------------------------------------------------------------
SKILL_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = SKILL_ROOT / "assets"
FALLBACK_CSS = ASSETS_DIR / "blue.css"
DEFAULT_COVER = ASSETS_DIR / "cover.png"
TEMPLATE_PATH = SKILL_ROOT / "templates" / "format-template.md"

logger = logging.getLogger("publish_wechat")

_FORMAT_SYSTEM_PROMPT: str | None = None


def _load_skill_env() -> None:
    """加载技能根目录 .env 到环境变量（不覆盖已有值）。"""
    dotenv = SKILL_ROOT / ".env"
    if not dotenv.exists():
        return
    for line in dotenv.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and key not in os.environ:
                os.environ[key] = value


def _fix_ssl() -> None:
    """修复 macOS Python CA 证书链缺失导致的 SSL 验证失败（CERTIFICATE_VERIFY_FAILED）。

    优先级：环境变量已设置 > certifi 库 > macOS 系统 bundle（/etc/ssl/cert.pem）。
    幂等，可重复调用。
    """
    if os.environ.get("SSL_CERT_FILE"):
        return
    try:
        import certifi  # type: ignore
        os.environ["SSL_CERT_FILE"] = certifi.where()
        logger.info("SSL: 使用 certifi CA 证书")
        return
    except ImportError:
        pass
    macos_bundle = Path("/etc/ssl/cert.pem")
    if macos_bundle.exists():
        os.environ["SSL_CERT_FILE"] = str(macos_bundle)
        logger.info("SSL: 使用 macOS 系统 CA 证书 (/etc/ssl/cert.pem)")


# ---------------------------------------------------------------------------
# LLM 辅助：只分析结构，不修改正文
# ---------------------------------------------------------------------------

def _load_format_system_prompt() -> str:
    """加载排版模板，构建 LLM 系统提示（首次调用时缓存）。"""
    global _FORMAT_SYSTEM_PROMPT
    if _FORMAT_SYSTEM_PROMPT is not None:
        return _FORMAT_SYSTEM_PROMPT

    template_text = TEMPLATE_PATH.read_text(encoding="utf-8") if TEMPLATE_PATH.exists() else ""
    _FORMAT_SYSTEM_PROMPT = (
        "你是一个微信公众号文章格式分析助手。你的任务是分析用户提供的 Markdown 文章，"
        "返回一个 JSON 对象描述如何格式化。你**绝不**修改任何正文内容。\n\n"
        "## 你需要返回的 JSON 格式\n\n"
        "```json\n"
        "{\n"
        '  "title": "从文章 # 标题提取的标题",\n'
        '  "has_front_matter": true/false,\n'
        '  "intro_is_blockquote": true/false,\n'
        '  "needs_cover_image": true/false,\n'
        '  "bare_code_blocks": [行号列表，需要添加语言标识的代码块起始行],\n'
        '  "has_toc": true/false\n'
        "}\n"
        "```\n\n"
        "## 分析规则\n\n"
        "1. `title`: 从第一个 `# ` 标题提取。如果已有 front matter 中的 title，用那个。\n"
        "2. `has_front_matter`: 文章是否以 `---` 开头且包含 YAML front matter。\n"
        "3. `intro_is_blockquote`: 引言段落（第一个 `##` 之前的段落）是否适合转为 `>` 引用块。"
        "只在段落明显是一两句话的摘要/简介时为 true，多段落引言为 false。\n"
        "4. `needs_cover_image`: 正文中是否没有任何 `![` 图片引用。没有则为 true。\n"
        "5. `bare_code_blocks`: 找出所有 ```后面没有语言标识的代码块，记录它们的起始行号。\n"
        "6. `has_toc`: 是否包含 `## 目录大纲` 部分。\n\n"
        "## 参考模板\n\n"
        f"{template_text}\n\n"
        "**只返回 JSON，不要返回其他内容。**"
    )
    return _FORMAT_SYSTEM_PROMPT


def _build_llm_client() -> tuple | None:
    """从环境变量构建格式分析 LLM 客户端。返回 (client, model) 或 None。"""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return None
    try:
        from openai import OpenAI
    except ImportError:
        return None
    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
    model = os.environ.get("OPENAI_MODEL", "deepseek-v4-flash")
    return OpenAI(api_key=api_key, base_url=base_url), model


def _analyze_with_llm(content: str, use_llm: bool) -> dict | None:
    """用 LLM 分析文章结构，返回格式化指令 JSON。失败返回 None（调用方 fallback 正则）。"""
    if not use_llm:
        return None
    built = _build_llm_client()
    if built is None:
        logger.info("LLM 不可用（未配置 OPENAI_API_KEY 或未安装 openai 库），使用正则排版")
        return None
    client, model = built

    try:
        # 只发前 3000 字做结构分析，不需要全文
        preview = content[:3000]
        if len(content) > 3000:
            preview += "\n\n... (剩余内容省略)"

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _load_format_system_prompt()},
                {"role": "user", "content": preview},
            ],
            temperature=0.0,
            max_tokens=4096,  # 思考型模型需要推理空间，过小会导致正文为空
            timeout=30,
        )

        msg = response.choices[0].message
        # 思考型模型（如 deepseek-reasoner 系）正文可能为空，内容在 reasoning_content
        text = (msg.content or "").strip()
        if not text:
            reasoning = getattr(msg, "reasoning_content", "") or ""
            if reasoning:
                text = reasoning
                logger.info("LLM 正文为空，回退使用 reasoning_content 提取")
        json_match = re.search(r"\{[^}]+\}", text, re.DOTALL)
        if not json_match:
            logger.warning(f"LLM 未返回有效 JSON: {text[:200]}")
            return None

        result = json.loads(json_match.group())
        logger.info(f"LLM 格式分析: {result}")
        return result
    except Exception as e:
        logger.warning(f"LLM 分析失败，fallback 到正则: {e}")
        return None


# ---------------------------------------------------------------------------
# 格式化辅助（正则方式，正文内容零修改）
# ---------------------------------------------------------------------------

def _extract_title(content: str, filename_hint: str | None = None) -> str:
    """从 front matter 或 # 标题中提取文章标题（跳过代码块）。

    都没有时从 filename_hint 提取（去掉 .md 后缀）。
    """
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            for line in content[3:end].split("\n"):
                if line.startswith("title:"):
                    title = line.split(":", 1)[1].strip().strip('"').strip("'")
                    if title and title != "未命名文章":
                        return title
    # 去掉代码块再搜索标题，避免匹配 ``` 内的 # 注释
    no_code = re.sub(r"```.*?```", "", content, flags=re.DOTALL)
    m = re.search(r"^#\s+(.+)", no_code, re.MULTILINE)
    if m:
        return m.group(1).strip()
    if filename_hint:
        name = Path(filename_hint).stem
        name = re.sub(r"[（(][^）)]*[）)]", "", name)
        name = name.replace("_", " ").replace("-", " ")
        return name
    return "未命名文章"


def _strip_front_matter(content: str) -> str:
    """移除现有 front matter，返回纯正文。"""
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            return content[end + 3:].lstrip("\n")
    return content


def _add_code_languages(content: str) -> str:
    """为裸代码块（无语言标识）添加 plaintext。只处理开始行。"""
    lines = content.split("\n")
    in_code_block = False
    for i, line in enumerate(lines):
        if line.startswith("```"):
            if in_code_block:
                in_code_block = False
            elif line == "```":
                lines[i] = "```plaintext"
                in_code_block = True
            else:
                in_code_block = True
    return "\n".join(lines)


def _remove_toc(content: str) -> str:
    """移除已有的目录大纲部分（锚点目录会触发微信 45166）。"""
    content = re.sub(r"## 目录大纲\n+.*?(?=\n## |\n---|\Z)", "", content, count=1, flags=re.DOTALL)
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content


def _apply_format(content: str, analysis: dict | None, cover_path: Path,
                  filename_hint: str | None = None) -> str:
    """根据 LLM 分析结果（或正则 fallback）格式化文章。正文内容零修改。"""
    body = _strip_front_matter(content)
    title = _extract_title(content, filename_hint)

    # 移除开头的 # 标题（将放入 front matter）
    body = re.sub(r"^#\s+.+\n*", "", body, count=1)

    body = _add_code_languages(body)
    body = _remove_toc(body)

    # 找引言和正文分界点（第一个 ## 之前）
    parts = re.split(r"^(?=## )", body, maxsplit=1, flags=re.MULTILINE)
    intro = parts[0].rstrip()
    main_body = parts[1] if len(parts) > 1 else ""
    intro = re.sub(r"\n*---\s*$", "", intro)

    # 封面图：正文中没有任何图片则添加
    needs_cover = not re.search(r"!\[", intro + main_body)
    if analysis and not analysis.get("needs_cover_image"):
        needs_cover = False

    # 封面引用：用绝对路径，发布阶段会替换为微信素材 URL
    cover_ref = f"![封面图]({cover_path})" if cover_path.exists() else ""

    pieces = [
        f"---\ntitle: \"{title}\"\n---\n\n",
        f"# {title}\n\n",
    ]

    if analysis and analysis.get("intro_is_blockquote"):
        # 引言第一段转引用块，封面图放引用块之后
        paragraphs = re.split(r"\n\n+", intro, maxsplit=1)
        first_para = paragraphs[0].strip()
        rest_intro = paragraphs[1] if len(paragraphs) > 1 else ""
        blockquote_lines = [f"> {line}" for line in first_para.split("\n") if line.strip()]
        pieces.append("\n".join(blockquote_lines) + "\n\n")
        if needs_cover and cover_ref:
            pieces.append(f"{cover_ref}\n\n")
        if rest_intro.strip():
            pieces.append(rest_intro.strip() + "\n\n")
    else:
        # 引言原样保留，封面图插在第一个空行后
        if needs_cover and cover_ref:
            paragraphs = re.split(r"\n\n+", intro, maxsplit=1)
            if len(paragraphs) > 1:
                pieces.append(paragraphs[0] + f"\n\n{cover_ref}\n\n" + paragraphs[1] + "\n\n")
            else:
                pieces.append(intro + f"\n\n{cover_ref}\n\n")
        else:
            pieces.append(intro + "\n\n")

    pieces.append("---\n\n")
    pieces.append(main_body)
    return "".join(pieces)


# ---------------------------------------------------------------------------
# 主题与 wenyan CLI
# ---------------------------------------------------------------------------

def _check_wenyan() -> str | None:
    """检查 wenyan CLI 是否可用，返回可执行路径或 None。"""
    return shutil.which("wenyan")


def _wenyan_command(wenyan_bin: str) -> list[str]:
    """构建 wenyan 命令前缀。

    npm 安装的 bin 通常是符号链接 shim，在部分 macOS 环境（provenance/Gatekeeper）
    直接执行会静默失败（exit 0 无任何输出）。统一解析符号链接后用 node 直跑真实入口。
    """
    try:
        real = Path(wenyan_bin).resolve()
        if real.suffix == ".js" and shutil.which("node"):
            return ["node", str(real)]
    except Exception:
        pass
    return [wenyan_bin]


def _theme_installed(theme: str, wenyan_bin: str | None = None) -> bool:
    """检查指定主题是否已在 wenyan 中安装。"""
    base = _wenyan_command(wenyan_bin or _check_wenyan() or "wenyan")
    try:
        result = subprocess.run(
            base + ["theme", "-l"],
            capture_output=True, text=True, timeout=10,
            encoding="utf-8", errors="replace",
        )
        return theme in (result.stdout or "")
    except Exception:
        return False


def _get_theme_render_args(theme: str) -> list[str]:
    """把 --theme 参数解析为 wenyan render 的主题参数。

    优先级：CSS 路径（绝对/相对 CWD/相对技能根）→ wenyan 已安装主题名 → 内置 fallback。
    """
    if theme.endswith(".css"):
        candidate = Path(theme).expanduser()
        if candidate.exists():
            return ["-c", str(candidate.resolve())]
        rel = SKILL_ROOT / theme
        if rel.exists():
            return ["-c", str(rel.resolve())]
    if _theme_installed(theme):
        return ["-t", theme]
    return ["-c", str(FALLBACK_CSS)]


# ---------------------------------------------------------------------------
# 微信 API 辅助（直调，绕过 wenyan publish 的 token 缓存等坑）
# ---------------------------------------------------------------------------

def _strip_anchor_links(content: str) -> str:
    """移除锚点链接 [text](#anchor) 保留纯文本（微信 45166 内容安全审查）。"""
    return re.sub(r"\[([^\]]+)\]\(#[^)]+\)", r"\1", content)


def _truncate_title(title: str, max_bytes: int = 64) -> str:
    """截断标题到 max_bytes 个 UTF-8 字节（微信 45003），逐字符回退避免截断中文。"""
    encoded = title.encode("utf-8")
    if len(encoded) <= max_bytes:
        return title
    while len(title.encode("utf-8")) > max_bytes:
        title = title[:-1]
    return title


def _wenyan_render_to_html(wenyan_bin: str, markdown_path: Path, theme_args: list[str],
                           highlight: str = "atom-one-dark") -> str | None:
    """用 wenyan render 将 Markdown 转为带内联样式的 HTML。"""
    try:
        cmd = _wenyan_command(wenyan_bin) + [
            "render", "-f", str(markdown_path),
            *theme_args,
            "-h", highlight,
            "--no-mac-style", "--no-footnote",
        ]
        result = subprocess.run(
            cmd,
            capture_output=True, text=True, encoding="utf-8",
            timeout=30,
        )
        stdout = result.stdout or ""
        logger.info(f"wenyan render exit={result.returncode} "
                    f"stdout={len(stdout)}B stderr={len(result.stderr or '')}B")
        if stdout.strip():
            html = re.sub(r'\s*data-provider="[^"]*"', "", stdout)
            return html
        logger.error(f"wenyan render 失败: {(result.stderr or '')[:300]}")
        return None
    except Exception as e:
        logger.error(f"wenyan render 异常: {e}")
        return None


def _get_wechat_token() -> str | None:
    """获取微信 access_token。"""
    app_id = os.environ.get("WECHAT_APP_ID", "")
    app_secret = os.environ.get("WECHAT_APP_SECRET", "")
    if not app_id or not app_secret:
        return None
    try:
        url = (f"https://api.weixin.qq.com/cgi-bin/token"
               f"?grant_type=client_credential&appid={urllib.parse.quote(app_id)}"
               f"&secret={urllib.parse.quote(app_secret)}")
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read().decode())
        token = data.get("access_token")
        if not token:
            logger.error(f"获取 token 失败: {data}")
        return token
    except Exception as e:
        logger.error(f"获取 token 失败: {e}")
        return None


def _upload_image_to_wechat(token: str, image_path: Path) -> dict:
    """上传图片到微信永久素材库，返回 {'media_id': ..., 'url': ...}。"""
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    boundary = "----" + uuid.uuid4().hex
    body = b""
    body += (f"--{boundary}\r\nContent-Disposition: form-data; "
             f'name="media"; filename="{image_path.name}"\r\n').encode()
    body += b"Content-Type: image/png\r\n\r\n"
    body += img_bytes + b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"https://api.weixin.qq.com/cgi-bin/material/add_material"
        f"?access_token={token}&type=image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def _create_wechat_draft(token: str, title: str, html_content: str,
                         thumb_media_id: str) -> dict:
    """通过 API 创建微信草稿。注意 ensure_ascii=False 防中文乱码。"""
    draft = {
        "articles": [{
            "title": title,
            "content": html_content,
            "thumb_media_id": thumb_media_id,
            "need_open_comment": 0,
            "only_fans_can_comment": 0,
        }]
    }
    body = json.dumps(draft, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={token}",
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


# ---------------------------------------------------------------------------
# 主流水线
# ---------------------------------------------------------------------------

def execute(params: dict) -> str:
    """执行流水线：format → theme → preview → publish。返回 JSON 字符串。"""
    _fix_ssl()
    article_path = params.get("article_path", "")
    theme = params.get("theme", "assets/blue.css")
    skip_format = params.get("skip_format", False)
    dry_run = params.get("dry_run", False)
    highlight = params.get("highlight", "atom-one-dark")
    use_llm = params.get("use_llm", True)

    # 封面图：自定义优先，其次内置
    cover_path = Path(params["cover"]).expanduser() if params.get("cover") else DEFAULT_COVER

    path = Path(article_path).expanduser()
    if not path.exists():
        return json.dumps(
            {"success": False, "error": f"文章文件不存在: {article_path}"},
            ensure_ascii=False,
        )

    content = path.read_text(encoding="utf-8")
    title = _extract_title(content, str(path))

    # --- Step 1: Format（正文内容零修改） ---
    output_dir = Path(params["output_dir"]).expanduser() if params.get("output_dir") \
        else path.parent / "output"
    formatted_path = output_dir / (path.stem + "_wechat.md")

    if not skip_format:
        output_dir.mkdir(parents=True, exist_ok=True)
        analysis = _analyze_with_llm(content, use_llm)
        formatted = _apply_format(content, analysis, cover_path, str(path))

        # 微信要求至少一张图片：兜底补封面
        if "![" not in formatted and cover_path.exists():
            body_start = formatted.find("## ")
            cover_ref = f"![封面图]({cover_path})"
            if body_start > 0:
                formatted = formatted[:body_start].rstrip() + f"\n\n{cover_ref}\n\n" + formatted[body_start:]
            else:
                formatted = formatted.rstrip() + f"\n\n{cover_ref}"

        formatted_path.write_text(formatted, encoding="utf-8")
        logger.info(f"格式化完成: {formatted_path}")
        content = formatted
        path = formatted_path
        title = _extract_title(content, str(path))
    elif not formatted_path.exists():
        output_dir.mkdir(parents=True, exist_ok=True)
        formatted_path.write_text(content, encoding="utf-8")
        path = formatted_path

    # --- Step 2: Theme（wenyan 可用性 + CSS 解析） ---
    wenyan_bin = _check_wenyan()
    if not wenyan_bin:
        return json.dumps(
            {
                "success": False,
                "step": "theme",
                "error": "wenyan CLI 未安装。请运行: npm install -g @wenyan-md/cli",
                "preview": {
                    "title": title,
                    "word_count": len(content),
                    "sections": len(re.findall(r"^## ", content, re.MULTILINE)),
                    "theme": theme,
                },
            },
            ensure_ascii=False,
        )

    theme_args = _get_theme_render_args(theme)

    # --- Step 3: Preview ---
    word_count = len(content)
    sections = len(re.findall(r"^## ", content, re.MULTILINE))

    if dry_run:
        return json.dumps(
            {
                "success": True,
                "step": "preview",
                "message": "预览完成（dry-run 模式，未实际发布）",
                "preview": {
                    "title": title,
                    "word_count": word_count,
                    "sections": sections,
                    "theme": theme,
                    "highlight": highlight,
                    "cover": str(cover_path),
                    "file": str(path),
                },
            },
            ensure_ascii=False,
        )

    # --- Step 4: Publish（wenyan render + 直调微信 API） ---
    # 凭证检查在此处（而非入口），使 dry-run 无凭证也可跑
    if not os.environ.get("WECHAT_APP_ID") or not os.environ.get("WECHAT_APP_SECRET"):
        return json.dumps(
            {
                "success": False,
                "step": "publish",
                "error": "缺少微信凭证，请设置环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET（或在技能目录 .env 中配置）",
                "suggestion": "凭证配置后重试；正式发布还要求服务器 IP 已加入公众号后台 IP 白名单",
            },
            ensure_ascii=False,
        )

    tmp_md = Path(tempfile.gettempdir()) / f"wechat_publish_{uuid.uuid4().hex}.md"
    try:
        # 4a. 获取 access_token
        token = _get_wechat_token()
        if not token:
            return json.dumps(
                {"success": False, "step": "publish",
                 "error": "获取微信 access_token 失败，请检查 WECHAT_APP_ID 和 WECHAT_APP_SECRET，"
                          "以及公众号后台 IP 白名单是否包含本机 IP",
                 "suggestion": "errcode 40001/40164 多为凭证错误或 IP 不在白名单"},
                ensure_ascii=False,
            )

        # 4b. 上传封面图
        if cover_path.exists():
            img_data = _upload_image_to_wechat(token, cover_path)
            thumb_media_id = img_data.get("media_id", "")
            cover_url = img_data.get("url", "")
            if not thumb_media_id:
                logger.warning(f"封面上传异常: {img_data}")
        else:
            thumb_media_id = ""
            cover_url = ""

        # 4c. 内容清洗：锚点链接（45166）+ 封面路径替换为微信素材 URL
        md_content = _strip_anchor_links(path.read_text(encoding="utf-8"))
        if cover_url:
            md_content = re.sub(
                rf"!\[([^\]]*)\]\([^\)]*{re.escape(cover_path.name)}[^\)]*\)",
                f"![\\1]({cover_url})",
                md_content,
            )

        safe_title = _truncate_title(title)

        # 4d/4e. 写临时文件 → wenyan render → 内联样式 HTML
        tmp_md.write_text(md_content, encoding="utf-8")
        html = _wenyan_render_to_html(wenyan_bin, tmp_md, theme_args, highlight)
        if not html:
            return json.dumps(
                {"success": False, "step": "publish",
                 "error": "wenyan render 失败，无法生成带样式的 HTML"},
                ensure_ascii=False,
            )

        # 修复 HTML 中残留的本地封面路径
        if cover_url:
            html = re.sub(
                rf'src="[^"]*{re.escape(cover_path.name)}[^"]*"',
                f'src="{cover_url}"',
                html,
            )

        # 4f. 创建草稿（ensure_ascii=False 防乱码）
        draft_result = _create_wechat_draft(token, safe_title, html, thumb_media_id)

        if "media_id" in draft_result:
            return json.dumps(
                {
                    "success": True,
                    "step": "publish",
                    "message": f"文章「{title}」已成功发布到微信公众号草稿箱",
                    "title": title,
                    "word_count": word_count,
                    "sections": sections,
                    "theme": theme,
                    "article_path": str(path),
                    "media_id": draft_result["media_id"],
                },
                ensure_ascii=False,
            )

        errmsg = draft_result.get("errmsg", str(draft_result))
        errcode = draft_result.get("errcode", "")
        suggestion = ""
        if errcode == 45166:
            suggestion = "文章内容含锚点链接等被微信安全机制拦截，可尝试进一步简化内容"
        elif errcode == 45003:
            suggestion = "标题超限（已自动截断），如仍失败请手动缩短标题"
        elif errcode == 40007:
            suggestion = "封面图 media_id 无效，检查封面图是否上传成功"
        return json.dumps(
            {
                "success": False, "step": "publish",
                "error": f"创建草稿失败 ({errcode}): {errmsg[:300]}",
                "suggestion": suggestion,
            },
            ensure_ascii=False,
        )
    except Exception as e:
        return json.dumps(
            {"success": False, "step": "publish", "error": f"发布异常: {e}"},
            ensure_ascii=False,
        )
    finally:
        if tmp_md.exists():
            tmp_md.unlink()


def main() -> None:
    # 日志走 stderr，stdout 只留 JSON
    logging.basicConfig(
        stream=sys.stderr,
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(levelname)s %(message)s",
    )
    _load_skill_env()

    parser = argparse.ArgumentParser(description="微信公众号文章排版发布流水线")
    parser.add_argument("article_path", help="要发布的 Markdown 文件路径")
    parser.add_argument("--theme", default="assets/blue.css",
                        help="CSS 主题文件路径或 wenyan 已安装主题名（默认: 内置 blue.css）")
    parser.add_argument("--highlight", default="atom-one-dark", help="代码高亮主题")
    parser.add_argument("--dry-run", action="store_true", help="仅预览不发布（不要求微信凭证）")
    parser.add_argument("--skip-format", action="store_true", help="跳过格式化，直接使用原文件")
    parser.add_argument("--cover", default=None, help="自定义封面图路径（默认: 内置 cover.png）")
    parser.add_argument("--no-llm", dest="use_llm", action="store_false",
                        help="跳过 LLM 结构分析，直接正则排版（离线可用）")
    parser.add_argument("--output-dir", default=None,
                        help="格式化产物输出目录（默认: <文章同目录>/output/）")
    args = parser.parse_args()

    result = execute(
        {
            "article_path": args.article_path,
            "theme": args.theme,
            "highlight": args.highlight,
            "dry_run": args.dry_run,
            "skip_format": args.skip_format,
            "cover": args.cover,
            "use_llm": args.use_llm,
            "output_dir": args.output_dir,
        }
    )
    print(result)


if __name__ == "__main__":
    main()
