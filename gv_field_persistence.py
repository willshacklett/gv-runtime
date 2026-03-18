from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from gv_field_state import FieldState

STATE_PATH = Path("gv_field_state.json")


def save_field_state(state: FieldState, path: Path = STATE_PATH) -> None:
    payload: dict[str, Any] = {
        "constraint": state.constraint,
        "history_passes": state.history_passes,
    }
    path.write_text(json.dumps(payload, indent=2))


def load_field_state(path: Path = STATE_PATH) -> FieldState:
    if not path.exists():
        return FieldState()

    payload = json.loads(path.read_text())
    return FieldState(
        constraint=payload.get("constraint", {}),
        history_passes=payload.get("history_passes", 0),
    )
