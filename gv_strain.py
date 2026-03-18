def detect_strain(input_text, state):
    keywords = ["ignore", "break", "contradiction", "loop"]
    score = sum(1 for k in keywords if k in input_text.lower())
    return score / max(1, len(keywords))
