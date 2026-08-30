from backend.app.rule_engine import load_rules, resolve_route


def test_low_budget_event_routes_to_hod_only():
    # request_type "event" specifically — this caught a real bug where rules.yaml
    # had the key "event_approval" but extraction.py produces "event", causing a
    # silent fallback to ["hod"] with no faculty_advisor step at all.
    rules = load_rules()
    route = resolve_route("event", {"budget_amount": 8000}, rules)
    assert route == ["faculty_advisor", "hod"]


def test_low_budget_routes_to_hod_only():
    rules = load_rules()
    route = resolve_route("budget", {"budget_amount": 8000}, rules)
    assert route == ["faculty_advisor", "hod"]


def test_mid_budget_routes_to_dean_swo():
    rules = load_rules()
    route = resolve_route("budget", {"budget_amount": 35000}, rules)
    assert route == ["faculty_advisor", "hod", "dean_swo"]


def test_high_budget_routes_to_director():
    rules = load_rules()
    route = resolve_route("budget", {"budget_amount": 75000}, rules)
    assert route == ["faculty_advisor", "hod", "dean_swo", "director"]


def test_travel_grant_always_routes_same_way():
    rules = load_rules()
    route = resolve_route("travel_grant", {}, rules)
    assert route == ["faculty_advisor", "hod", "dean_rd"]
