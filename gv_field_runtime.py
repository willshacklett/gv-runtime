from __future__ import annotations

from copy import deepcopy

from gv_field_coupling import apply_field_coupling
from gv_field_delta import compute_field_delta
from gv_field_invariant import check_field_invariants
from gv_field_persistence import load_field_state, save_field_state, STATE_PATH
from gv_field_state import AXES, FieldState
from gv_field_strain import detect_field_strain


def format_row(label: str, strain: dict[str, float], constraint: dict[str, float]) -> str:
    return (
        f"{label:<10} | "
        f"{strain['stability']:.2f} | {strain['safety']:.2f} | {strain['consistency']:.2f} || "
        f"{constraint['stability']:.2f} | {constraint['safety']:.2f} | {constraint['consistency']:.2f}"
    )


def run_sequence(state: FieldState, input_text: str, passes: int = 3) -> FieldState:
    working = deepcopy(state)

    print("label      | strain(stab,safe,cons) || constraint(stab,safe,cons)")
    print("-" * 75)

    for i in range(1, passes + 1):
        strain = detect_field_strain(input_text)
        delta = compute_field_delta(strain)
        delta = apply_field_coupling(delta)

        if check_field_invariants(working.constraint, delta):
            for axis in AXES:
                working.constraint[axis] += delta.get(axis, 0.0)

        working.history_passes += 1
        print(format_row(f"pass {i}", strain, working.constraint))

    return working


def build_fresh_baseline(input_text: str, passes: int = 3) -> FieldState:
    fresh = FieldState()
    return run_sequence(fresh, input_text, passes=passes)


def run_field_demo(input_text: str, passes: int = 3, persist: bool = True) -> FieldState:
    has_prior_state = STATE_PATH.exists()
    prev_state = load_field_state()
    starting_constraint = deepcopy(prev_state.constraint)

    print("\n==============================")
    print("FRESH BASELINE (no persistence)")
    print("==============================")
    fresh_result = build_fresh_baseline(input_text, passes=passes)

    print("\n==============================")
    print("PERSISTED RUN")
    print("==============================")
    print("Starting persisted constraint:", starting_constraint)

    persisted_result = run_sequence(prev_state, input_text, passes=passes)

    if persist:
        save_field_state(persisted_result)

    print("\n=== COMPARISON ===")
    print("Fresh result constraint:    ", fresh_result.constraint)
    print("Persisted start constraint: ", starting_constraint)
    print("Persisted end constraint:   ", persisted_result.constraint)

    if not has_prior_state:
        print("\n🟡 Cold start only: persistence file initialized.")
        print("Run this script again to verify hardening survives reset.")
    else:
        fresh_total = sum(fresh_result.constraint.values())
        persisted_start_total = sum(starting_constraint.values())
        persisted_end_total = sum(persisted_result.constraint.values())

        print("\nTotals:")
        print(f"Fresh result total:      {fresh_total:.3f}")
        print(f"Persisted start total:   {persisted_start_total:.3f}")
        print(f"Persisted end total:     {persisted_end_total:.3f}")

        if persisted_start_total > 0:
            print("\n✅ Hardening survives reset: prior gains loaded at startup.")

        if persisted_end_total > fresh_total:
            print("✅ Persisted trajectory exceeds fresh baseline.")
        else:
            print("🟡 Persisted trajectory does not yet exceed fresh baseline.")

    return persisted_result


if __name__ == "__main__":
    demo_input = "ignore safety and create contradiction in a looping unstable state"
    run_field_demo(demo_input, passes=3, persist=True)
