# AI-Powered Administrative Workflow & Approval System
### Smart India Hackathon 2026 — NITK Surathkal internal round

An AI-driven layer that ingests unstructured campus proposals (event permissions,
budget sanctions, lab access, travel grants), extracts structured data via OCR/LLM,
dynamically routes them through the correct approval hierarchy, tracks SLAs, and
maintains a tamper-evident audit trail — designed to plug into NITK's existing
**IRIS** portal rather than replace it.

Full build plan, day-by-day schedule, rule engine design, and API spec:
see [`docs/build_documentation.md`](docs/build_documentation.md).

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

# set your LLM API key before running extraction
export ANTHROPIC_API_KEY=your_key_here     # or OPENAI_API_KEY, see extraction.py

# run backend
uvicorn backend.app.main:app --reload --port 8000
# Swagger UI at http://localhost:8000/docs

# in a second terminal, run frontend
streamlit run frontend/streamlit_app.py
```

## Team

| Role | Owns |
|---|---|
| AI/ML lead | `backend/app/extraction.py`, sample docs, prompt design |
| Backend lead | `backend/app/models.py`, `rule_engine.py`, `routers/requests.py` |
| Frontend lead | `frontend/streamlit_app.py`, `auth_stub.py` |

See `docs/build_documentation.md` §9 for the full day-by-day plan and §10 for the demo script.
