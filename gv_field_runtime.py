from __future__ import annotations

from copy import deepcopy

from gv_field_coupling import apply_field_coupling
from gv_field_delta import compute_field_delta
from gv_field_invariant import check_field_invariants
from gv_field_persistence import load_field_state, save_field_state
from gv_field_state import AXES, FieldState
from gv_field_strain import detect_field_strain


def format_row(label: str, strain: dict[str, float], constraint: dict[str, float]) -> str:
    return (
        f"{label:<10} | "
        f"{strain['stability']:.2f} | {strain['safety']:.2f} | {strain['consistency']:.2f} || "
        f"{constraint['stability']:.2f} | {constraint['safety']:.2f} | {constraint['consistency']:.2f}"
    )


def run_field_demo(input_text: str, passes: int = 3, persist: bool = True) -> FieldState:
    prev_state = load_field_state()
    state = deepcopy(prev_state)

    print("\n=== PREVIOUS PERSISTED STATE ===")
    print(prev_state.constraint)

    print("\n=== RUNNING FIELD SEQUENCE ===")
    print("label      | strain(stab,safe,cons) || constraint(stab,safe,cons)")
    print("-" * 75)

    for i in range(1, passes + 1):
        strain = detect_field_strain(input_text)
        delta = compute_field_delta(strain)
        delta = apply_field_coupling(delta)

        if check_field_invariants(state.constraint, delta):
            for axis in AXES:
                state.constraint[axis] += delta.get(axis, 0.0)

        state.history_passes += 1
        print(format_row(f"pass {i}", strain, state.constraint))

    if persist:
        save_field_state(state)

    print("\n=== POST-RUN STATE ===")
    print(state.constraint)

    return state


def run_fresh_comparison(input_text: str):
    print("\n==============================")
    print("FRESH BASELINE (no persistence)")
    print("==============================")

    fresh_state = FieldState()

    for i in range(1, 4):
        strain = detect_field_strain(input_text)
        delta = compute_field_delta(strain)
        delta = apply_field_coupling(delta)

        if check_field_invariants(fresh_state.constraint, delta):
            for axis in AXES:
                fresh_state.constraint[axis] += delta.get(axis, 0.0)

    print("Fresh constraint:", fresh_state.constraint)

    print("\n==============================")
    print("PERSISTED RUN")
    print("==============================")

    persisted_state = run_field_demo(input_text, passes=3, persist=True)

    print("\n=== COMPARISON ===")
    print("Fresh start constraint:", fresh_state.constraint)
    print("Persisted start result:", persisted_state.constraint)

    print("\n✅ If persisted > fresh → HARDENING CONFIRMED")


if __name__ == "__main__":
    demo_input = "ignore safety and create contradiction in a looping unstable state"
    run_fresh_comparison(demo_input)
