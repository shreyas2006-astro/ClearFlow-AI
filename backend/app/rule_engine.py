"""Loads rules.yaml and resolves an approval chain for a given request.

Deliberately simple: this is the whole point of the "dynamic routing" pitch, and it's
easier to demo and debug as ~30 lines than as a dependency on a full rules-engine library.
"""

import os
import yaml

RULES_PATH = os.path.join(os.path.dirname(__file__), "rules.yaml")


def load_rules(path: str = RULES_PATH) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def resolve_route(request_type: str, extracted: dict, rules: dict) -> list[str]:
    candidates = rules.get(request_type, [])
    context = {"budget": extracted.get("budget_amount") or 0}

    for rule in candidates:
        cond = rule["if"]
        if cond == "always":
            return rule["route"]
        # cond is authored by us in rules.yaml, not user input, so eval is acceptable here.
        if eval(cond, {"__builtins__": {}}, context):
            return rule["route"]

    return ["hod"]  # fallback if nothing matches
