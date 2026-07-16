# petit-prince-story

Turn each chapter of a markdown document into an SVG storyboard in *The Little Prince* hand-drawn style.

The Little Prince stands on a planet; each chapter's theme decides which symbolic character visits. One ≤12 character golden quote per scene. Quiet, restrained, breathing story sketches.

## Quick Start

### Prerequisites

- [Claude Code](https://claude.ai) installed
- This project cloned locally

### Steps

**1. Start Claude Code in the project directory**

```bash
cd petit-prince-story
claude
```

Claude auto-loads `.claude/skills/petit-prince-story/SKILL.md` — the skill is ready.

**2. Input your markdown**

```
Turn this markdown into Little Prince storyboard scenes
```

Paste or reference your markdown content.

**3. Get storyboards**

Claude will: present the 7-step workflow → parse by chapter → output a storyboard table (chapter/character/quote/meaning) for confirmation → generate SVGs → QA check → composite and display.

### Parameterized Usage

Specify parameters naturally in conversation:

| Parameter | Example |
|-----------|---------|
| `style` | "Use **watercolor** style" |
| `size` | "Change size to **800x600**" |
| `composite` | "Compose into a **grid**" / "**scroll**" |

Full example:

```
Turn this markdown into Little Prince storyboard scenes, watercolor style, composite into a grid
```

### Viewing Results

- Individual SVGs saved to `assets/illustrations/`
- Composite saved as `grid-3x2.svg` or `scroll.svg`
- Open `gallery.html` to browse interactively: keyboard **← →** navigate, touch swipe, auto-play

## Skill Architecture

petit-prince-story is a Claude Code skill with a "main file + reference files" layered design:

- **Main file** (`SKILL.md`) — concise positioning, parameters, workflow, output style
- **Reference files** (`references/`, 6 files) — detailed content in separate files; Claude reads on demand

```
.claude/skills/petit-prince-story/
├── SKILL.md                 # Main: positioning + parameters + workflow + output
├── references/
│   ├── svg-style.md         # Style rules (line/watercolor) + palette
│   ├── characters.md        # 6 characters + decision table + SVG snippets
│   ├── composition.md       # Card anatomy + responsive sizing + composite
│   ├── scene-template.svg   # 600×800 skeleton template (annotated)
│   ├── qa-checklist.md      # Required checks / failure signals / iteration
│   └── gallery-template.html# Gallery page template
├── scripts/
│   └── generate-scenes-gif.js # SVG → animated GIF
└── agents/
    └── openai.yaml          # Cross-platform agent interface
```

## Character Decision Table

| Content Signal | Guest |
|---|---|
| Love / Unique / Cherish / Pride / Concern | 🌹 Rose |
| Insight / See clearly / Responsibility / Tame / Friendship | 🦊 Fox |
| Narrative / Lost childhood / Adult world / Memory / Fall | 👨‍✈️ Pilot |
| Life / Death / Farewell / Mystery / Turning point / Riddle | 🐍 Snake |
| Rhythm / Timing / Repetition / Watch / Polling | 🪔 Lamplighter |
| Journey / Exploration / No strong theme | Prince alone |

## Styles & Parameters

| Style | Description |
|-------|-------------|
| `line` (default) | Pure stroke `#141414`, only pupil filled, cinnabar `#C0392B` accent |
| `watercolor` | Same geometry + soft fills (sandy yellow, dark green, mustard, ochre fox) |

| Parameter | Values | Default |
|-----------|--------|---------|
| `style` | `line` / `watercolor` | `line` |
| `size` | `WxH` | `600x800` |
| `composite` | `grid` / `scroll` / `none` | `grid` |

## Six Rules

1. **Semantic fit** — character mapping must be accurate
2. **Unified composition** — reuse prince definition, only change guest + title + quote
3. **No overlap** — prince and guest distance ≥80px, text within bounds
4. **Quality over quantity** — stars ≤12, no extra props
5. **Unique scene per chapter** — same guest in multiple scenes requires different star layout, atmosphere, and environment
6. **Unexpected attraction** — every scene offers one visual surprise

## Workflow

0. **Preview** — present the 7-step workflow to the user before starting
1. **Parse** — split by H2/H3, pick character from decision table, distill ≤12 char quote
2. **Storyboard table** — list chapter/character/quote/meaning for user confirmation
3. **Generate SVG** — use `scene-template.svg` skeleton, draw each scene
4. **QA check** — verify required items / failure signals
5. **Save & composite** — SVGs to `assets/illustrations/`, compose grid/scroll
6. **Gallery page** — output `gallery.html` for interactive browsing
7. **(Optional) Export GIF** — run script to generate animation

## Project Structure

```
petit-prince-story/
├── .claude/skills/petit-prince-story/  # Skill core (see above)
├── assets/illustrations/               # Generated scene SVGs
├── gallery.html                        # Interactive gallery browser
├── grid-3x2.svg                        # Grid composite sample
├── samples/                            # Demo samples
├── package.json                        # Dependencies (GIF generation)
├── README.md                           # Chinese version
└── README.en.md                        # This file
```
