import json
import time
from gv_field_runtime import GVFieldRuntime

OUTPUT_PATH = "../dashboard/data/state.json"
TRACE_PATH = "../dashboard/data/trace.json"

runtime = GVFieldRuntime()

trace_buffer = []
MAX_TRACE = 100


def normalize_state(state):
    # ensure it's JSON-safe 2D list
    return [[float(v) for v in row] for row in state]


def export_state():
    state = normalize_state(runtime.state)

    with open(OUTPUT_PATH, "w") as f:
        json.dump({"grid": state}, f)


def export_trace():
    with open(TRACE_PATH, "w") as f:
        json.dump({"trace": trace_buffer}, f)


def run_loop(interval=0.1):
    global trace_buffer

    while True:
        runtime.run_step()

        state = normalize_state(runtime.state)

        # store trace snapshot
        trace_buffer.append(state)

        if len(trace_buffer) > MAX_TRACE:
            trace_buffer.pop(0)

        export_state()
        export_trace()

        time.sleep(interval)


if __name__ == "__main__":
    run_loop()
