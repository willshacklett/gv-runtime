from __future__ import annotations

from typing import Dict


def compute_field_delta(strain: Dict[str, float]) -> Dict[str, float]:
    """
    Bounded per-axis adaptation.
    """
    return {axis: min(0.1, value * 0.2) for axis, value in strain.items()}
