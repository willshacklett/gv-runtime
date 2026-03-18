from __future__ import annotations

from typing import Dict


def apply_field_coupling(delta: Dict[str, float]) -> Dict[str, float]:
    """
    Minimal fixed coupling:
    - consistency lightly supports stability
    - safety lightly supports consistency
    """
    adjusted = dict(delta)

    adjusted["stability"] += 0.10 * delta.get("consistency", 0.0)
    adjusted["consistency"] += 0.10 * delta.get("safety", 0.0)

    return adjusted
