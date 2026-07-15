# AI Document Reader · Super Mario Gold Miner 🪙🍄✨❓🧪

> Treat any article as a "mine" — the text is a row of bricks waiting to be bumped. Jump hard and knock out **coins, mushrooms, stars, and question blocks**, then test if you really understand.

A [Claude Code Skill](https://docs.claude.com/en/docs/claude-code/skills) for **deep-reading any article**. Three modes, one closed loop:

| Mode | What it does | Output |
|------|--------------|--------|
| 🪙 **Gold-Miner** (default) | A four-stage deep analysis that "mines" maximum value from the article | Structured core viewpoints / action steps / hidden insights / follow-up questions |
| 🗺️ **GPS** | Weaves the article's core concepts into an interactive knowledge graph | A single offline minified HTML knowledge graph (node–relation–category) |
| 🧪 **Test Mode** | Bloom's 6-level quiz, one question at a time | Total score / wrong-answer analysis / correct answers |

---

## Why Mario (the metaphor isn't decoration)

Each game element stands for **a different layer of value**. It's a memory hook, and it stops the analysis from collapsing into one mushy summary:

| Element | Meaning | Value layer |
|---------|---------|-------------|
| 🪙 **Coin** | The core points the article actually makes | The most visible, what to remember first |
| 🍄 **Mushroom** | Actions you can take right now that make you stronger | Power-up — knowledge turned into action |
| ✨ **Star** | Insights the author never said out loud, hidden between the lines | Second-order synthesis beyond the text |
| ❓ **Question block** | Follow-up questions that lead to the next level | One-off reading → ongoing exploration |
| 🧪 **Test tube** | Bloom's 6-level mastery assessment | Diagnose weak spots, feed back into learning |

Each owns its own layer — **don't merge them, don't skip any, don't just summarize**.

---

## Key features

- **Fixed four-stage Gold-Miner contract**: Read-through → Mine the nuggets (exactly 3 action steps) → The unexpected (hidden insights) → Follow-up questions. Fixed headings + emoji act as "signals," identical character-for-character.
- **Test Mode with Bloom's 6 levels**: Remembering → Understanding → Applying → Analyzing → Evaluating → Creating. One question at a time with instant feedback. Final report includes total score, wrong-answer analysis, and correct answers.
- **Continue from the question blocks**: every question in stage 4 is an entry point for the next round — reading isn't a one-shot thing.
- **All three modes, seamlessly joined**: core concepts from Gold-Miner → quiz with Test Mode → weave weak spots into GPS graph.
- **Backed by the official renderer**: GPS HTML is produced by [`knowledge-graph-map`](https://www.npmjs.com/package/knowledge-graph-map) (by 江枫 / JiangFeng, MIT) — same template, same themes, same layouts, **visually 100% identical to the online version**.
- **Offline single minified HTML by default**: ECharts / template / Font Awesome / picker all inlined + minified, unused Tailwind removed — a single `.html` opens by double-click with no network (no subresources, most robust over `file://`). `--folder` switches to a folder form (JS/CSS as separate files).
- **2 layouts × 4 themes**: force / radial × dark-tech / nature-fresh / warm-sunset / ocean-deep, switchable live on the page at runtime.

---

## Quick start

### 1. Trigger the skill

In Claude Code, just state your intent — no commands to memorize. For example:

```
Mine this article: D:\articles\some-article.md
Deep-read this and pull out action steps I can do right now
Make a knowledge graph of the core concepts in this article
What is this article about? Mine it for me
```

The skill automatically decides which mode to run (Gold-Miner, GPS, or Test); when intent is ambiguous it runs Gold-Miner first, then offers to continue into GPS or Test Mode.

### 2. The three modes compose

Recommended loop: **Gold-Miner first** (dig out core concepts) → **Test Mode** (check mastery, expose weak spots) → **GPS next** (weave weak concepts into a graph for reinforcement).

---

## Directory structure

```
doc-reader-mario/
├── SKILL.md                  # Skill entry (mode detection + outline of both modes + caveats)
├── README.md                 # This file (Chinese)
├── README.en.md              # English version of this file
├── agents/
│   └── openai.yaml           # OpenAI agent interface manifest (display name / trigger / default prompt)
├── references/
│   ├── gold-miner.md         # Gold-Miner mode detailed guide (stage rules + original Prompt source)
│   ├── gps-guide.md          # GPS mode detailed guide (JSON schema + validation + theme/layout reference)
│   └── bloom-test.md         # Test Mode detailed guide (6-level rules + feedback format + examples)
├── scripts/
│   ├── offline-bundle.js     # Offline bundler: default single minified HTML (--folder → folder), visually identical to online
│   └── vendor-cache/         # Dependency cache (downloaded once online, then fully offline)
│       ├── echarts.min.js
│       ├── fontawesome-all.min.css
│       └── fa-solid-900.woff2
└── templates/
    ├── sample-graph.json     # Full JSON sample (a 16-node knowledge graph of this skill itself)
    └── sample-graph-output/  # Pre-bundled offline demo (--folder form: index.html + vendor/ + js/ + css/)
```

> **Progressive disclosure**: `SKILL.md` holds only the outline; when a step needs more depth, read the matching file in `references/`; `scripts/` and `templates/` are independently runnable resources.

---

## GPS rendering pipeline

```
Article ──Gold-Miner──▶ graph.json (intermediate, deleted after) ──knowledge-graph-map CLI──▶ online HTML (CDN refs)
                                                                │
                                                  offline-bundle.js│inline all + minify + remove Tailwind
                                                                ▼
                                                  offline single minified HTML (*.html, double-click) ✅
```

**Render (produces the online HTML, done by knowledge-graph-map):**
```bash
npx knowledge-graph-map -f graph.json --theme dark-tech --layout force \
  -o article-name-knowledge-graph.html --no-open
```

**Offline bundling (run by default, produces a single minified HTML):**
```bash
node <skill-dir>/scripts/offline-bundle.js article-name-knowledge-graph.html
```

Default output is a **single minified HTML** (same-name `.html`, overwrites input) — ECharts / template / Font Awesome / picker all inlined + minified, unused Tailwind removed, no external refs, **opens by double-click** (no subresources — most robust over `file://`).

What the bundler does (audited and verified, not a subjective claim):
- **ECharts** → inlined (literal `</script>` in its source is escaped before inlining so the HTML parser doesn't truncate the `<script>`).
- **Font Awesome** → CSS inlined + the solid font embedded as base64 (identical icons).
- **Template logic / page styles / picker** → extracted, **minified**, then inlined (minify is safe: never touches `//`, preserves newlines for ASI; echarts/FA are pre-minified and skipped).
- **Tailwind Play** → **removed** (every class the template uses is custom CSS or an icon class; zero styling contribution, look unchanged).

> **Size**: ~1.7MB (echarts ~1MB + FA woff2 ~210KB dominate, both already compressed). Minify only trims the template parts (~2KB, <1%); a real size cut needs a custom graph-only echarts build.

**`--folder` folder form** (optional): JS/CSS split into separate files, HTML keeps only `<script src>`/`<link>`, double-click `index.html`:

```
article-name-knowledge-graph/
├── index.html              # <script src> + <link> local JS/CSS
├── vendor/{echarts.min.js, fontawesome.min.css, fa-solid-900.woff2}
├── js/{graph.js, theme-picker.js}
└── css/{page.css, theme-picker.css}
```

---

## Requirements

- **Runtime**: Claude Code.
- **GPS rendering**: Node.js (the first `npx knowledge-graph-map` downloads the package online once, then it's cached).
  - Without Node: install Node, or install the official skill — `npx knowledge-graph-map --install-skill`.
- **Gold-Miner mode**: pure text analysis, zero external dependencies.

---

## Relationship to `knowledge-graph-map`

[`knowledge-graph-map`](https://www.npmjs.com/package/knowledge-graph-map) is the **official renderer** for this skill's GPS mode; it also ships its own `/knowledge-graph` Claude Code Skill.

This skill is a **larger reading loop**: Gold-Miner (distill concepts) + GPS (weave them into a graph). The GPS stage reuses the official renderer directly and **does not reimplement it** — one data source, no drift.

---

## Credits & sources

- The Gold-Miner persona and four-stage structure originate from **JiangFeng (江枫)**'s "Super Mario Gold Miner" Prompt (version 0.2). The full original text is quoted in `references/gold-miner.md`.
- GPS renderer: [`knowledge-graph-map`](https://www.npmjs.com/package/knowledge-graph-map) ([Gitee mirror](https://gitee.com/scedm/knowledge-graph-map)), by JiangFeng, MIT.

---

## License

Follows the upstream `knowledge-graph-map` MIT license. The original article and Prompt are copyrighted by their original authors; this project references them only as a reading-analysis tool.
