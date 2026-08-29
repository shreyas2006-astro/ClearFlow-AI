# NITK AI-Powered Administrative Workflow & Approval System
## Build Documentation — 2–3 Day Hackathon Sprint

---

## 0. Two stacks, not one — read this first

You pitched a **production-vision stack** on slides 5–6 (Next.js, PostgreSQL, Celery, full RBAC). That stack is *correct to pitch* but *wrong to build in 3 days*. Judges score the demo on whether the hard part — AI extraction + dynamic routing — actually works, not on whether you shipped a polished Next.js app.

So this doc uses a **demo-optimized stack** that is a genuine subset of the pitched one (nothing here contradicts your slides — you're just building the load-bearing 20% first). Mention this explicitly if asked: *"For the pilot we prioritized the extraction and routing engine; the production plan uses Next.js/Postgres/Celery as shown."*

---

## 1. Final tech stack for the build

| Layer | Choice | Why (speed-optimized) |
|---|---|---|
| Language | Python 3.11 | One language across AI + backend = less context switching for a 3-day team |
| Backend API | FastAPI | Async, auto-generates OpenAPI docs (useful for judges), minimal boilerplate |
| Database | SQLite + SQLAlchemy | Zero setup, file-based, trivial to reset between demo runs. (State clearly: "Postgres in production" — schema is identical) |
| Document parsing | PyMuPDF (`fitz`) for PDFs, `python-docx` for Word | Fast, no OCR dependency for typed documents |
| OCR (stretch only) | Tesseract via `pytesseract` | Only if you have spare hours Day 3 — handle one scanned-form demo case |
| AI extraction | Claude API (Anthropic) or GPT-4o-mini, structured JSON output | LLM-based parsing handles messy/unstructured proposal text better than regex |
| Rule/routing engine | Custom Python matcher driven by a JSON/YAML rules file | A real rules engine (Drools etc.) is overkill; config-driven logic is enough to prove "dynamic routing," and it's literally data, not hardcoded if-else — which is your scaling argument from slide 9 |
| SLA/escalation | Plain `datetime` diff computed on read (no scheduler) | Celery/BullMQ is real overhead for 3 days; computing "days pending" live is visually identical in a demo |
| Frontend | Streamlit | A working multi-role dashboard in ~150 lines vs. days of React work. Explicitly a placeholder for the Next.js/Shadcn UI on your slides |
| IRIS integration | Stubbed SSO (`fake_iris_auth.py`) returning a JWT with a role claim | You don't have real IRIS API access — a clearly-labeled stub sells the integration story without lying about having it working |
| Deployment for demo | Local + `ngrok` (optional) if judges need a link | No need to actually deploy anywhere |

---

## 2. Team split (balanced skills, 3 people assumed — adjust for your actual headcount)

| Role | Owns | Day 1 | Day 2 | Day 3 |
|---|---|---|---|---|
| **AI/ML lead** | Extraction pipeline | Prompt design, JSON schema, test on sample docs | Wire extraction into request-creation API | Handle edge cases, demo docs, OCR stretch |
| **Backend lead** | API, DB, rule engine | DB schema, project skeleton | Rule engine, approval endpoints, SLA calc | Bug fixes, seed demo data, audit log |
| **Frontend/full-stack lead** | Streamlit dashboard, IRIS stub | Skim FastAPI docs, plan screens | Build upload + extraction-preview screen | Build role dashboards + demo polish |

If you're only 2 people, merge backend+frontend; if 4, add a "demo/QA" person dedicated to Day 3 rehearsal and edge-case document testing.

---

## 3. Data model

```
requests
├── id (PK)
├── request_type        # 'event' | 'budget' | 'lab_access' | 'travel_grant'
├── raw_text             # extracted document text
├── extracted_json       # structured fields (see §5)
├── status                # 'pending' | 'approved' | 'rejected' | 'revision_requested'
├── current_stage_index   # pointer into approval_steps
├── created_at
├── updated_at

approval_steps
├── id (PK)
├── request_id (FK -> requests.id)
├── stage_order           # 1, 2, 3...
├── stakeholder_role       # 'faculty_advisor' | 'hod' | 'dean_swo' | 'dean_rd' | 'director'
├── status                 # 'pending' | 'approved' | 'rejected' | 'sent_back'
├── sla_days               # threshold for this stage
├── entered_at             # when it started sitting with this stakeholder
├── resolved_at

audit_log
├── id (PK)
├── request_id (FK)
├── actor_role
├── action                 # 'submitted' | 'approved' | 'rejected' | 'sent_back' | 'escalated'
├── timestamp
├── notes
```

This maps directly to your slide 3 stages: `requests` = intake, `extracted_json` = AI extraction output, `approval_steps` = routing + stakeholder review, `entered_at`/`sla_days` = SLA tracking, `audit_log` = the audit trail slide.

---

## 4. Rule engine — the routing config (this is your "wow, it's actually dynamic" moment)

Store rules as data, not code:

```yaml
# rules.yaml
event_approval:
  - if: "budget <= 10000"
    route: [faculty_advisor, hod]
  - if: "budget > 10000 and budget <= 50000"
    route: [faculty_advisor, hod, dean_swo]
  - if: "budget > 50000"
    route: [faculty_advisor, hod, dean_swo, director]

travel_grant:
  - if: "always"
    route: [faculty_advisor, hod, dean_rd]

lab_access:
  - if: "always"
    route: [faculty_advisor, hod]
```

Matcher (deliberately simple — this is ~30 lines, don't over-engineer it):

```python
import yaml

def load_rules(path="rules.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)

def resolve_route(request_type: str, extracted: dict, rules: dict) -> list[str]:
    candidates = rules.get(request_type, [])
    context = {"budget": extracted.get("budget_amount", 0)}
    for rule in candidates:
        cond = rule["if"]
        if cond == "always" or eval(cond, {}, context):  # safe here: cond comes from your own YAML, not user input
            return rule["route"]
    return ["hod"]  # fallback
```

**Demo move:** show three requests live — a ₹8,000 club budget, a ₹35,000 one, and a ₹75,000 one — and let the judges watch the routing change in real time. This single demo beat proves "dynamic rule engine" better than any slide.

---

## 5. AI extraction pipeline

**Step 1 — raw text extraction**
```python
import fitz  # PyMuPDF
def extract_pdf_text(path):
    doc = fitz.open(path)
    return "\n".join(page.get_text() for page in doc)

from docx import Document
def extract_docx_text(path):
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)
```

**Step 2 — structured JSON via LLM.** Define the target schema explicitly and force the model to fill it:

```python
EXTRACTION_SCHEMA = {
    "event_name": "string or null",
    "event_date": "YYYY-MM-DD or null",
    "venue": "string or null",
    "budget_amount": "number or null",
    "faculty_advisor": "string or null",
    "requesting_club": "string or null",
    "request_type": "one of: event, budget, lab_access, travel_grant",
    "compliance_flags": ["list of any missing required fields"]
}

PROMPT = """Extract the following fields from this campus proposal document.
Return ONLY valid JSON matching this schema, no other text:
{schema}

Document text:
{text}
"""
```

Call your LLM of choice with this prompt, parse the JSON response, validate it against a Pydantic model, and reject/flag anything that fails validation (this "compliance_flags" idea is a nice live callback to your Module 1 pitch — "actively flags incomplete proposals").

**Pydantic validation model:**
```python
from pydantic import BaseModel
from typing import Optional, List

class ExtractedRequest(BaseModel):
    event_name: Optional[str]
    event_date: Optional[str]
    venue: Optional[str]
    budget_amount: Optional[float]
    faculty_advisor: Optional[str]
    requesting_club: Optional[str]
    request_type: str
    compliance_flags: List[str] = []
```

**Test documents to prepare (Day 1, before writing any extraction code):** write 4–5 fake but realistic proposal docs — one clean event proposal, one budget request, one travel grant, one messy/incomplete one (missing advisor name — to show `compliance_flags` catching it), and optionally one scanned-image PDF if attempting OCR.

---

## 6. API endpoints (FastAPI)

| Method | Path | Purpose |
|---|---|---|
| POST | `/requests/upload` | Upload doc → extract → validate → create request + auto-route via rule engine |
| GET | `/requests` | List all requests (filter by role/status for dashboard) |
| GET | `/requests/{id}` | Full detail: extracted JSON, current stage, audit log |
| POST | `/requests/{id}/approve` | Advance to next stage, log audit entry |
| POST | `/requests/{id}/reject` | Mark rejected, log audit entry |
| POST | `/requests/{id}/send_back` | Loop back to submitter (the revision-loop you mentioned on slide 3) |
| GET | `/requests/{id}/sla_status` | Computed live: days pending at current stage vs. `sla_days` threshold |
| POST | `/auth/iris_stub` | Fake SSO — returns `{role, name, token}` for demo login switching |

FastAPI gives you `/docs` (Swagger UI) automatically — genuinely useful to show judges the API surface exists and is real, not mocked.

---

## 7. Minimal frontend (Streamlit)

Screens needed, in priority order:
1. **Upload + extraction preview** — upload a doc, show raw text → extracted JSON side by side (this sells the AI module directly)
2. **Routing visualization** — after submission, show the resolved approval chain as a simple horizontal list with the current stage highlighted
3. **Role-based dashboard** — a role selector (Student / Faculty Advisor / HOD / Dean) filters which requests show as "awaiting your action"; approve/reject/send-back buttons
4. **Audit trail view** — timestamped log for a selected request

Skip: fancy styling, animations, multi-page routing polish — all things you correctly deprioritized in your scope choice.

---

## 8. IRIS integration stub

Since you don't have real IRIS API access, build a clearly-labeled stub rather than faking a live integration:

```python
# fake_iris_auth.py
FAKE_USERS = {
    "student1": {"role": "student", "name": "Aditya R"},
    "advisor1": {"role": "faculty_advisor", "name": "Dr. Kamath"},
    "hod1": {"role": "hod", "name": "Dr. Shenoy"},
    "dean1": {"role": "dean_swo", "name": "Dr. Bhat"},
}

def fake_login(username: str):
    return FAKE_USERS.get(username, {"role": "unknown", "name": "Guest"})
```

When presenting, say explicitly: *"This simulates IRIS SSO — in production this is a real OAuth call to IRIS's existing identity system, so users never create a new account."* Judges respect honesty about what's mocked far more than an implication that IRIS is really connected.

---

## 9. Day-by-day plan

**Day 1 — Foundation + extraction**
- Hrs 0–2: repo scaffold, DB schema migrations, 4–5 sample proposal documents written
- Hrs 2–6: extraction pipeline (text extraction + LLM call + Pydantic validation) working standalone on all sample docs
- Hrs 6–8: `/requests/upload` endpoint wired to extraction pipeline, returns structured JSON
- **End-of-day demo-able milestone:** upload any of your 5 sample docs via Swagger UI, get back clean structured JSON

**Day 2 — Routing + backend logic**
- Hrs 0–3: `rules.yaml` + matcher, unit-test with all 3 budget tiers
- Hrs 3–6: `approval_steps` creation on submit, `/approve` `/reject` `/send_back` endpoints, audit log writes
- Hrs 6–8: SLA computation endpoint, integration test: submit → auto-route → approve through full chain
- **End-of-day milestone:** a request can go from upload to fully approved through the CLI/Swagger, with correct routing per budget tier and a populated audit log

**Day 3 — UI + IRIS stub + rehearsal**
- Hrs 0–4: Streamlit screens 1–3 (upload preview, routing view, role dashboard)
- Hrs 4–5: IRIS stub + role-switch login
- Hrs 5–6: audit trail screen
- Hrs 6–8: seed 5–6 demo requests at different stages/budget tiers, rehearse the live walkthrough (see below), fix bugs surfaced by rehearsal — **do not add new features after this point**

---

## 10. The live demo script (rehearse this exact sequence)

1. Upload the clean event proposal → show extracted JSON appear
2. Upload the incomplete one → show a `compliance_flag` catch a missing field
3. Submit three pre-prepared requests at ₹8k / ₹35k / ₹75k → show three different routing chains resolve live
4. Switch role to HOD → approve one → switch to Dean → show it now appears on their queue → approve
5. Show the SLA/dwell-time view on a seeded old request that's "3 days overdue" → point out the escalation flag
6. Show the audit trail for that request, timestamped end to end
7. Close with: *"Everything you just saw ran on rules.yaml and a Pydantic schema — both are data, which is why this scales to travel grants, lab access, or another NIT entirely, without new code."*

That closing line ties directly back to your slide 9 scaling argument — judges remember pitches that callback to their own slides during the live demo.

---

## 11. Stretch goals (only if Day 3 finishes early)

- OCR path for one scanned/handwritten sample document
- A second rule set for `lab_access` with a different stakeholder chain, to prove generality beyond one workflow
- A simple bar chart (Streamlit has this built in) showing average dwell time per stage across your seeded demo data — a live version of your slide 7 metrics
