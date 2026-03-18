import json
import time

def log_event(strain, delta, state):
    event = {
        "time": time.time(),
        "strain": strain,
        "delta": delta,
        "constraint_level": state["constraint_level"]
    }
    state["history"].append(event)

def persist_state(state):
    with open("gv_state.json", "w") as f:
        json.dump(state, f, indent=2)
