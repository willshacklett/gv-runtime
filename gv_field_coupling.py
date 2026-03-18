from __future__ import annotations

from typing import Dict

from gv_field_state import AXES


def update_coupling(
    coupling: Dict[str, Dict[str, float]],
    strain: Dict[str, float],
    lr: float = 0.05,
    decay: float = 0.02,
    max_weight: float = 0.5,
) -> Dict[str, Dict[str, float]]:
    """
    Adaptive coupling update with:
    - growth under correlated strain
    - controlled decay
    - row-wise normalization
    - bounded weights
    """
    updated = {
        source: dict(targets) for source, targets in coupling.items()
    }

    # adaptive growth
    for source in AXES:
        for target in AXES:
            if source == target:
                continue

            influence = strain[source] * strain[target]
            delta_weight = lr * influence
            updated[source][target] += delta_weight

    # controlled decay
    for source in AXES:
        for target in AXES:
            if source == target:
                continue

            updated[source][target] *= (1.0 - decay)

    # clamp
    for source in AXES:
        for target in AXES:
            if source == target:
                continue

            updated[source][target] = min(
                max_weight,
                max(0.0, updated[source][target]),
            )

    # row-wise normalization
    for source in AXES:
        row_sum = sum(
            updated[source][target]
            for target in AXES
            if target != source
        )

        if row_sum > 0.0:
            for target in AXES:
                if target == source:
                    continue
                updated[source][target] /= row_sum

    return updated


def apply_field_coupling(
    delta: Dict[str, float],
    coupling: Dict[str, Dict[str, float]],
    influence_scale: float = 0.10,
) -> Dict[str, float]:
    """
    Apply cross-axis influence from the coupling matrix.
    """
    adjusted = dict(delta)

    for target in AXES:
        cross = 0.0

        for source in AXES:
            if source == target:
                continue

            cross += coupling[source][target] * delta[source]

        adjusted[target] += influence_scale * cross

    return adjusted


def average_coupling(coupling: Dict[str, Dict[str, float]]) -> float:
    total = 0.0
    count = 0

    for source in AXES:
        for target in AXES:
            if source == target:
                continue
            total += coupling[source][target]
            count += 1

    return total / count if count else 0.0
