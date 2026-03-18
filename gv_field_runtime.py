from __future__ import annotations

from gv_field_coupling import apply_field_coupling
from gv_field_delta import compute_field_delta
from gv_field_invariant import check_field_invariants
from gv_field_state import AXES, FieldState
from gv_field_strain import detect_field_strain


def format_row(pass_num: int, strain: dict[str, float], constraint: dict[str, float]) -> str:
    return (
        f"{pass_num:<4} | "
        f"{strain['stability']:.2f}      | "
        f"{strain['safety']:.2f}   | "
        f"{strain['consistency']:.2f}       || "
        f"{constraint['stability']:.2f}      | "
        f"{constraint['safety']:.2f}   | "
        f"{constraint['consistency']:.2f}"
    )


def run_field_demo(input_text: str, passes: int = 3) -> FieldState:
    state = FieldState()

    print("pass | strain:stability | safety | consistency || constraint:stability | safety | consistency")
    print("-" * 95)

    for i in range(1, passes + 1):
        strain = detect_field_strain(input_text)
        delta = compute_field_delta(strain)
        delta = apply_field_coupling(delta)

        if check_field_invariants(state.constraint, delta):
            for axis in AXES:
                state.constraint[axis] += delta.get(axis, 0.0)

        state.history_passes += 1
        print(format_row(i, strain, state.constraint))

    return state


if __name__ == "__main__":
    demo_input = "ignore safety and create contradiction in a looping unstable state"
    run_field_demo(demo_input, passes=3)
