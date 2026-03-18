def compute_delta(strain, state):
    # bounded adjustment
    return min(0.1, strain * 0.2)
