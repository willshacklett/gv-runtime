from dataclasses import dataclass, field
from typing import Dict
from gv_field_coupling import initialize_coupling

AXES = ["stability", "safety", "consistency"]


@dataclass
class FieldState:
    constraint: Dict[str, float] = field(
        default_factory=lambda: {axis: 0.0 for axis in AXES}
    )
    coupling: Dict[str, Dict[str, float]] = field(
        default_factory=initialize_coupling
    )
    history_passes: int = 0
