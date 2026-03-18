from __future__ import annotations

from typing import Dict

from gv_field_state import AXES


def update_coupling(
    coupling: Dict[str, Dict[str, float]],
    strain: Dict[str, float],
    lr: float = 0.05,
    max_weight: float = 0.50,
) -> Dict[str, Dict[str, float]]:
    """
    Increase cross-axis coupling when two axes are both under strain.
    This is a simple bounded adaptive rule.
    """
    updated: Dict[str, Dict[str, float]] = {
        source: dict(targets) for source, targets in coupling.items()
    }

    for source in AXES:
        for target in AXES:
            if source == target:
                continue

            influence = strain.get(source, 0.0) * strain.get(target, 0.0)
            delta_weight = lr * influence
            new_weight = updated[source][target] + delta_weight
            updated[source][target] = min(max_weight, max(0.0, new_weight))

    return updated


def apply_field_coupling(
    delta: Dict[str, float],
    coupling: Dict[str, Dict[str, float]],
    influence_scale: float = 0.10,
) -> Dict[str, float]:
    """
    Apply adaptive cross-axis influence to the per-axis delta.
    """
    adjusted = dict(delta)

    for target in AXES:
        cross_influence = 0.0

        for source in AXES:
            if source == target:
                continue
            cross_influence += coupling[source][target] * delta.get(source, 0.0)

        adjusted[target] += influence_scale * cross_influence

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
