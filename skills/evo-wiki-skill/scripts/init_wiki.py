#!/usr/bin/env python3
"""初始化 evo-wiki-skill 知识库骨架。

用法:
    python init_wiki.py [--project <项目根>]

默认以当前目录为项目根，在 <项目根>/.wiki-skill/ 下创建 Raw / Wiki / staging /
archive 骨架。可重复执行，已存在的文件不会被覆盖。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

RAW_README = """# Raw 层

存放每次任务的执行轨迹，文件名 `YYYY-MM-DD-<slug>.md`，模板见
`.agents/skills/evo-wiki-skill/assets/templates/raw-record-template.md`。

**本目录只追加，永不修改或删除**（evo-wiki-skill 不变量 1）。
记录有误不删原文，追加一条「修正：」条目。
"""

INDEX_TEMPLATE = """# Wiki 索引

## 配置
- 技能目录: .agents/skills
- 已提炼水位线: （无，首次提炼将分析 raw/ 全部轨迹）
- 下一个模式编号: 1

## 模式表
| ID | 标题 | 状态 | 出现次数 | 最近证据 | 关联技能 |
|---|---|---|---|---|---|
"""

LOGS_TEMPLATE = """# 进化日志

每轮一条，倒序追加。格式：

```markdown
## YYYY-MM-DD · 进化 #N
- 提炼: 分析 X 条轨迹，新增 P-0XX，更新 P-0XX
- 提案: 为 <技能> 提交 <新建/补丁>（解决 P-0XX），待门控
- 门控: 已接受（测试 X/X 通过）/ 已拒绝（原因一句话）
```
"""

IMPACT_TEMPLATE = """# 技能改动台账

每次提案一条，倒序追加。**拒绝原因必填**——它是下一轮提案的避坑清单。格式：

```markdown
## 提案 #N · YYYY-MM-DD · <技能名>（新建/补丁）
- 解决: P-0XX
- 改动: <diff 摘要，必要时贴关键 diff>
- 结果: 待门控 / 已接受 / 已拒绝
- 原因: <接受理由，或拒绝原因（必填）>
```
"""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="初始化 evo-wiki-skill 知识库骨架（.wiki-skill/），幂等可重复执行"
    )
    parser.add_argument("--project", default=".", help="项目根目录（默认当前目录）")
    args = parser.parse_args()

    root = Path(args.project).resolve() / ".wiki-skill"
    created: list[str] = []
    skipped: list[str] = []

    def place(rel: str, content: str | None = None) -> None:
        path = root / rel
        if path.exists():
            skipped.append(rel)
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        if content is not None:
            path.write_text(content, encoding="utf-8", newline="\n")
        else:
            path.touch()
        created.append(rel)

    place("raw/README.md", RAW_README)
    place("wiki/INDEX.md", INDEX_TEMPLATE)
    place("wiki/logs.md", LOGS_TEMPLATE)
    place("wiki/skill-impact.md", IMPACT_TEMPLATE)
    place("wiki/patterns/.gitkeep")
    place("staging/.gitkeep")
    place("archive/.gitkeep")

    print(f"知识库位置: {root}")
    for rel in created:
        print(f"  创建  {rel}")
    for rel in skipped:
        print(f"  跳过  {rel}（已存在）")
    if created:
        print("下一步: 任务结束后说「记录一下」，把执行轨迹存入 raw/。")
    else:
        print("知识库已就绪，无新建文件。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
