from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

AXES = ["stability", "safety", "consistency"]


@dataclass
class FieldState:
    constraint: Dict[str, float] = field(
        default_factory=lambda: {axis: 0.0 for axis in AXES}
    )
    history_passes: int = 0
