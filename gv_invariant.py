def check_invariants(delta, state):
    # monotonic constraint growth only
    if delta < 0:
        return False

    # cap growth
    if state["constraint_level"] + delta > 1.0:
        return False

    return True
