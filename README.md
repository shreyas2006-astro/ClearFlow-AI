# AI-Powered Administrative Workflow & Approval System
### Smart India Hackathon 2026 — NITK Surathkal internal round

An AI-driven layer that ingests unstructured campus proposals (event permissions,
budget sanctions, lab access, travel grants), extracts structured data via OCR/LLM,
dynamically routes them through the correct approval hierarchy, tracks SLAs, and
maintains a tamper-evident audit trail — designed to plug into NITK's existing
**IRIS** portal rather than replace it.

---

## Repo structure

```
.
├── backend/                 FastAPI service — extraction, rule engine, approvals API
│   ├── app/
│   │   ├── main.py           FastAPI app entrypoint
│   │   ├── database.py       SQLAlchemy engine/session (SQLite for the demo)
│   │   ├── models.py         ORM models: requests, approval_steps, audit_log
│   │   ├── schemas.py        Pydantic request/response + extraction schemas
│   │   ├── rules.yaml        Approval routing rules (data, not code)
│   │   ├── rule_engine.py    Loads rules.yaml, resolves a route for a request
│   │   ├── extraction.py     PDF/DOCX text extraction + LLM structured parsing
│   │   ├── auth_stub.py      Fake IRIS SSO — returns a role for demo login
│   │   └── routers/
│   │       └── requests.py   /requests endpoints (upload, approve, reject, etc.)
│   └── tests/
│       └── test_rule_engine.py
├── frontend/
│   └── streamlit_app.py     Minimal multi-role dashboard (upload, routing, approvals, audit)
├── sample_docs/             Sample proposal text files for testing extraction
├── docs/
│   └── build_documentation.md
├── data/                     SQLite DB lives here at runtime (gitignored)
├── requirements.txt
└── .gitignore
```

## Quickstart

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# run backend
uvicorn backend.app.main:app --reload --port 8000
# Swagger UI at http://localhost:8000/docs

# in a second terminal, run frontend
cd frontend-react
npm run dev
```

## Team

| Role | Owns |
|---|---|
| AI/ML Leads | `backend/app/extraction.py`, sample docs, prompt design |
| Backend Leads | `backend/app/models.py`, `rule_engine.py`, `routers/requests.py` |
| Frontend Leads | `frontend/streamlit_app.py`, `auth_stub.py` |

