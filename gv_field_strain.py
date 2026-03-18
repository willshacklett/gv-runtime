from __future__ import annotations

from typing import Dict


def detect_field_strain(input_text: str) -> Dict[str, float]:
    """
    Minimal keyword-driven strain detector.
    Returns per-axis strain in [0.0, 1.0].
    """
    text = input_text.lower()

    signals = {
        "stability": ["break", "loop", "crash", "unstable"],
        "safety": ["ignore", "bypass", "unsafe", "override"],
        "consistency": ["contradiction", "conflict", "inconsistent", "drift"],
    }

    result: Dict[str, float] = {}
    for axis, keywords in signals.items():
        hits = sum(1 for kw in keywords if kw in text)
        result[axis] = min(1.0, hits / max(1, len(keywords)))

    return result
