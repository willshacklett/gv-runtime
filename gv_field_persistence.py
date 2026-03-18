from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from gv_field_state import FieldState, default_constraint, default_coupling

STATE_PATH = Path("gv_field_state.json")


def save_field_state(state: FieldState, path: Path = STATE_PATH) -> None:
    payload: dict[str, Any] = {
        "constraint": state.constraint,
        "coupling": state.coupling,
        "history_passes": state.history_passes,
    }
    path.write_text(json.dumps(payload, indent=2))


def load_field_state(path: Path = STATE_PATH) -> FieldState:
    if not path.exists():
        return FieldState()

    payload = json.loads(path.read_text())

    constraint = payload.get("constraint") or default_constraint()
    coupling = payload.get("coupling") or default_coupling()
    history_passes = payload.get("history_passes", 0)

    return FieldState(
        constraint=constraint,
        coupling=coupling,
        history_passes=history_passes,
    )
