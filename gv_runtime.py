from gv_strain import detect_strain
from gv_delta import compute_delta
from gv_invariant import check_invariants
from gv_persistence import log_event, persist_state

STATE = {
    "constraint_level": 0.0,
    "history": []
}

def run_step(input_text):
    # 1. Detect strain
    strain = detect_strain(input_text, STATE)

    # 2. Compute local delta
    delta = compute_delta(strain, STATE)

    # 3. Check invariants
    if check_invariants(delta, STATE):
        # 4. Apply delta (bounded)
        STATE["constraint_level"] += delta
        
        # 5. Log + persist
        log_event(strain, delta, STATE)
        persist_state(STATE)

    return STATE
