import json
from gv_field_runtime import GVFieldRuntime

runtime = GVFieldRuntime()

def export():
    state = runtime.state  # assuming 2D or flattenable
    with open("dashboard/data/state.json", "w") as f:
        json.dump(state, f)

if __name__ == "__main__":
    export()
