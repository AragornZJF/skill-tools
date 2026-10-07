#!/usr/bin/env python3
"""Generate an SVG design element with an LLM (DeepSeek / GLM / ...); template fallback.

Real-first: call an OpenAI-compatible Chat API when the provider's API key is set
and reachable. Supported providers (extend PROVIDERS to add more):
    deepseek -> https://api.deepseek.com/chat/completions   model deepseek-chat
    glm      -> https://open.bigmodel.cn/api/paas/v4/chat/completions  model glm-4-flash
Fallback: return assets/template_element.svg (label replaced) when the key is
missing or the call fails, so the downstream pipeline always has an element.

Stdlib-only (urllib) to avoid extra dependencies; the Chat Completions wire format
is provider-agnostic across these backends.

Usage:
    python llm_svg.py --brief "minimal ginkgo leaf line art" --provider deepseek \
        --view-box "0 0 200 200" --out element.svg
    python llm_svg.py --brief "极简银杏叶线稿" --provider glm --label GINKGO
"""
import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error

# OpenAI-compatible Chat Completions backends. Add an entry to support a new LLM.
PROVIDERS = {
    "deepseek": {
        "url": "https://api.deepseek.com/chat/completions",
        "model": "deepseek-chat",
        "env_key": "DEEPSEEK_API_KEY",
    },
    "glm": {
        "url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        "model": "glm-4-flash",
        "env_key": "GLM_API_KEY",
    },
}

SYSTEM = (
    "You are a precise SVG illustrator for design layouts. "
    "Return ONLY valid, self-contained SVG markup. "
    "No markdown fences, no commentary, no explanation. "
    "Use the exact viewBox requested. Keep it flat, no external assets, "
    "no scripts. Prefer simple shapes and a cohesive palette."
)


def _extract_svg(text: str) -> str:
    text = text.strip()
    m = re.search(r"```(?:svg)?\s*(.*?)```", text, re.S)
    if m:
        text = m.group(1).strip()
    start = text.find("<svg")
    end = text.rfind("</svg>")
    if start != -1 and end != -1:
        return text[start:end + 6]
    if start != -1:
        return text[start:]
    return ""


def call_llm(provider: str, brief: str, view_box: str, api_key: str, model: str | None) -> str:
    cfg = PROVIDERS[provider]
    payload = {
        "model": model or cfg["model"],
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content":
             f"Brief: {brief}\nviewBox: {view_box}\nOutput the SVG now."},
        ],
        "temperature": 0.7,
        "max_tokens": 1200,
    }
    req = urllib.request.Request(
        cfg["url"],
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


def template_svg(label: str) -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    p = os.path.join(here, "..", "assets", "template_element.svg")
    try:
        with open(p, "r", encoding="utf-8") as f:
            svg = f.read()
        return svg.replace("PLACEHOLDER", (label or "ELEMENT")[:16].upper())
    except FileNotFoundError:
        return ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>"
                f"<rect width='200' height='200' fill='#f4c430' opacity='0.15'/>"
                f"<text x='100' y='105' text-anchor='middle' font-size='20'>"
                f"{(label or 'ELEMENT')[:16].upper()}</text></svg>")


def generate(brief: str, provider: str = "deepseek", view_box: str = "0 0 200 200",
             api_key: str | None = None, label: str = "ELEMENT") -> dict:
    if provider not in PROVIDERS:
        return {"engine": "template", "provider": provider, "svg": template_svg(label),
                "raw": None, "error": f"unknown provider '{provider}'"}
    cfg = PROVIDERS[provider]
    api_key = api_key or os.environ.get(cfg["env_key"]) or os.environ.get("LLM_API_KEY")
    if api_key:
        try:
            raw = call_llm(provider, brief, view_box, api_key, None)
            svg = _extract_svg(raw)
            if svg:
                return {"engine": provider, "provider": provider, "svg": svg, "raw": raw}
        except Exception as e:  # noqa: BLE001
            sys.stderr.write(f"[llm_svg] {provider} API failed, using template: {e}\n")
    svg = template_svg(label)
    return {"engine": "template", "provider": provider, "svg": svg, "raw": None}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--brief", required=True)
    ap.add_argument("--provider", default="deepseek", choices=sorted(PROVIDERS))
    ap.add_argument("--view-box", default="0 0 200 200")
    ap.add_argument("--label", default="ELEMENT")
    ap.add_argument("--out")
    ap.add_argument("--key")
    a = ap.parse_args()
    res = generate(a.brief, a.provider, a.view_box, a.key, a.label)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(res["svg"])
        print(json.dumps({"engine": res["engine"], "provider": res["provider"], "out": a.out},
                         ensure_ascii=False))
    else:
        print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
