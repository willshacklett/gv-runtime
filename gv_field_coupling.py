from __future__ import annotations

from typing import Dict

from gv_field_state import AXES


def initialize_coupling() -> Dict[str, Dict[str, float]]:
    return {
        a: {b: (0.0 if a == b else 0.05) for b in AXES}
        for a in AXES
    }


def update_coupling(
    coupling: Dict[str, Dict[str, float]],
    strain: Dict[str, float],
    lr: float = 0.05,
    max_weight: float = 0.5,
) -> Dict[str, Dict[str, float]]:
    """
    Adaptive coupling based on strain correlation.
    """
    new_coupling = {a: dict(row) for a, row in coupling.items()}

    for i in AXES:
        for j in AXES:
            if i == j:
                continue

            influence = strain[i] * strain[j]
            delta = lr * influence

            new_coupling[i][j] = min(
                max_weight,
                max(0.0, new_coupling[i][j] + delta),
            )

    return new_coupling


def apply_field_coupling(
    delta: Dict[str, float],
    coupling: Dict[str, Dict[str, float]],
) -> Dict[str, float]:
    """
    Apply cross-axis influence using adaptive coupling matrix.
    """
    adjusted = dict(delta)

    for target in AXES:
        for source in AXES:
            if target == source:
                continue
            adjusted[target] += coupling[source][target] * delta.get(source, 0.0)

    return adjusted
