"""
reflect.py  Structured reflection generator for self-evolving skills.

Usage:
    python scripts/evolve/reflect.py

Outputs a JSON template prompting the agent to reflect on the completed task.
"""

import json
import sys


REFLECTION_TEMPLATE = {
    "prompt": "Reflect on the task you just completed. Answer each question concisely.",
    "questions": [
        {
            "id": "went_well",
            "question": "What went well?",
            "hint": "Patterns, approaches, or techniques that were effective"
        },
        {
            "id": "went_wrong",
            "question": "What went wrong?",
            "hint": "Errors, inefficiencies, or surprises encountered"
        },
        {
            "id": "learned",
            "question": "What was learned?",
            "hint": "New knowledge about tools, APIs, the codebase, or domain"
        },
        {
            "id": "different",
            "question": "What would you do differently?",
            "hint": "Concrete behavioral changes for next time"
        }
    ]
}


def main():
    print(json.dumps(REFLECTION_TEMPLATE, indent=2))
    print("\n# Copy the above JSON, fill in your answers, then pipe to record_learning.py:", file=sys.stderr)
    print("#   python scripts/evolve/record_learning.py ...", file=sys.stderr)


if __name__ == "__main__":
    main()
