#!/usr/bin/env python3
"""Score candidate placements with Laya (System 1 model); heuristic fallback.

Real-first: use `from laya import Router` when laya is installed.
Fallback: deterministic heuristic from precomputed geometric features.

Input JSON (--candidates): a list of candidates, each:
    {
      "id": "spot_3",
      "sentence": "The element sits in the upper-left, overlapping the title by a small amount, with a 24px margin.",
      "features": {"overlap": 0.1, "margin": 28.0, "alignment": 0.8, "centered": 0.4}
    }
  - `sentence` is written by CODE from geometry; Laya only reads it.
  - `features` are the same numbers, used by the heuristic fallback.

Output JSON:
    {"engine": "laya" | "laya+heuristic" | "heuristic",
     "ranked": [{"id": ..., "score": 0..1}, ...]}

Usage:
    python laya_place.py --candidates spots.json \
        --question "Is this a clean, uncluttered placement for the element?"
"""
import argparse
import json
import sys

# Laya is wording-sensitive (see references/laya_usage.md). Average a few
# phrasings of the SAME question to stabilise the score.
PHRASINGS = [
    "Is this a clean, uncluttered placement for the element?",
    "Does this position keep the element clear of other content with good margins?",
    "Is this a well-composed spot for the element on the canvas?",
]


def heuristic(features: dict) -> float:
    """0..1 score from precomputed geometry. Higher = better placement."""
    overlap = min(1.0, max(0.0, float(features.get("overlap", 0.0))))   # 0..1 fraction
    margin = min(1.0, float(features.get("margin", 0.0)) / 40.0)        # px, saturate @40
    alignment = min(1.0, max(0.0, float(features.get("alignment", 0.0))))
    centered = min(1.0, max(0.0, float(features.get("centered", 0.0))))
    score = 1.0 - 0.6 * overlap + 0.2 * margin + 0.1 * alignment + 0.1 * centered
    return max(0.0, min(1.0, score))


def laya_scores_multi(sentences: list, question: str):
    """Average Laya P(placement_quality) across phrasings. None on per-item error."""
    from laya import Router  # heavy import; only when Laya is available
    router = Router(preload=True)
    out = [[] for _ in sentences]
    for phr in PHRASINGS:
        questions = {"placement_quality": {"type": "noul", "instructions": phr}}
        for i, s in enumerate(sentences):
            try:
                res = router.predict(s, questions)
                out[i].append(float(res["answers"]["placement_quality"]["noul"]))
            except Exception:  # noqa: BLE001
                out[i].append(None)
    return [
        (sum(x) / len(x)) if x and all(v is not None for v in x) else None
        for x in out
    ]


def score_candidates(candidates: list, question: str, use_laya: bool = True) -> dict:
    sentences = [c.get("sentence", "") for c in candidates]
    engine = "heuristic"
    scores = [heuristic(c.get("features", {})) for c in candidates]

    if use_laya:
        try:
            laya_s = laya_scores_multi(sentences, question)
            if all(s is not None for s in laya_s):
                scores = laya_s
                engine = "laya"
            else:
                scores = [
                    l if l is not None else heuristic(c.get("features", {}))
                    for l, c in zip(laya_s, candidates)
                ]
                engine = "laya+heuristic"
        except Exception as e:  # noqa: BLE001
            sys.stderr.write(f"[laya_place] Laya unavailable, heuristic: {e}\n")

    ranked = sorted(
        [{"id": c.get("id"), "score": round(float(s), 4)} for c, s in zip(candidates, scores)],
        key=lambda x: x["score"],
        reverse=True,
    )
    return {"engine": engine, "ranked": ranked}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", required=True, help="JSON file: list of candidates")
    ap.add_argument("--question",
                    default="Is this a clean, uncluttered placement for the element?")
    ap.add_argument("--no-laya", action="store_true", help="force heuristic")
    a = ap.parse_args()

    with open(a.candidates, "r", encoding="utf-8") as f:
        candidates = json.load(f)

    result = score_candidates(candidates, a.question, use_laya=not a.no_laya)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
