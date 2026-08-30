"""Populate the DB with a few requests at different stages, without touching extraction
or the LLM at all — lets you build/test approve/reject/SLA endpoints independently on
Day 2, and gives you ready-made demo data for Day 3 rehearsal.

Run from repo root: python -m backend.seed_data
"""

from datetime import datetime, timedelta

from backend.app.database import Base, engine, SessionLocal
from backend.app import models
from backend.app.rule_engine import load_rules, resolve_route

Base.metadata.create_all(bind=engine)
db = SessionLocal()

DEMO_REQUESTS = [
    {
        "request_type": "budget",
        "extracted_json": {
            "event_name": "Robotics Workshop 2026", "budget_amount": 8000,
            "faculty_advisor": "Dr. Kamath", "requesting_club": "IEEE RAS NITK",
            "request_type": "budget", "compliance_flags": [],
        },
    },
    {
        "request_type": "budget",
        "extracted_json": {
            "event_name": "Techniche Coding Marathon", "budget_amount": 35000,
            "faculty_advisor": "Dr. Shenoy", "requesting_club": "CS Club",
            "request_type": "budget", "compliance_flags": [],
        },
    },
    {
        "request_type": "budget",
        "extracted_json": {
            "event_name": "Engineerium Main Stage", "budget_amount": 75000,
            "faculty_advisor": "Dr. Bhat", "requesting_club": "Student Technical Council",
            "request_type": "budget", "compliance_flags": [],
        },
    },
    {
        "request_type": "travel_grant",
        "extracted_json": {
            "event_name": "SIH 2026 Grand Finale Travel", "budget_amount": 22000,
            "faculty_advisor": "Dr. Kamath", "requesting_club": None,
            "request_type": "travel_grant", "compliance_flags": [],
        },
    },
]

rules = load_rules()

for i, item in enumerate(DEMO_REQUESTS):
    req = models.Request(request_type=item["request_type"], extracted_json=item["extracted_json"])
    db.add(req)
    db.commit()
    db.refresh(req)

    route = resolve_route(item["request_type"], item["extracted_json"], rules)
    # make the 3rd seeded request (index 2, the 75k one) look SLA-overdue for the demo
    entered_at = datetime.utcnow() - timedelta(days=5) if i == 2 else datetime.utcnow()
    for stage_order, role in enumerate(route):
        db.add(models.ApprovalStep(
            request_id=req.id, stage_order=stage_order, stakeholder_role=role,
            entered_at=entered_at if stage_order == 0 else datetime.utcnow(),
        ))
    db.add(models.AuditLog(request_id=req.id, actor_role="system", action="submitted"))
    db.commit()

print(f"Seeded {len(DEMO_REQUESTS)} demo requests.")
db.close()