from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

AXES = ["stability", "safety", "consistency"]


def default_constraint() -> Dict[str, float]:
    return {axis: 0.0 for axis in AXES}


def default_coupling() -> Dict[str, Dict[str, float]]:
    return {
        source: {
            target: (0.0 if source == target else 0.05)
            for target in AXES
        }
        for source in AXES
    }


@dataclass
class FieldState:
    constraint: Dict[str, float] = field(default_factory=default_constraint)
    coupling: Dict[str, Dict[str, float]] = field(default_factory=default_coupling)
    history_passes: int = 0
