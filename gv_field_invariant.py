from __future__ import annotations

from typing import Dict


def check_field_invariants(
    constraint: Dict[str, float],
    delta: Dict[str, float],
    max_constraint: float = 1.0,
) -> bool:
    """
    Enforce:
    - no negative deltas
    - no per-axis overshoot above max_constraint
    """
    for axis, d in delta.items():
        if d < 0:
            return False
        if constraint.get(axis, 0.0) + d > max_constraint:
            return False

    return True
