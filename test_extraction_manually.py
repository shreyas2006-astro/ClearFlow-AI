"""One-off sanity check — not part of the app. Run this once to confirm your
GEMINI_API_KEY actually works end-to-end before building anything on top of it.

Run from repo root: python test_extraction_manually.py
"""

from backend.app.extraction import extract_raw_text, parse_to_structured

DOCS = [
    "sample_docs/event_proposal_clean.txt",
    "sample_docs/budget_request_35k.txt",
    "sample_docs/budget_request_75k.txt",
    "sample_docs/travel_grant.txt",
    "sample_docs/incomplete_proposal.txt",   # the important one — check compliance_flags below
]

for path in DOCS:
    print(f"\n{'='*60}\n{path}\n{'='*60}")
    raw_text = extract_raw_text(path)
    try:
        result = parse_to_structured(raw_text)
        print(result.model_dump_json(indent=2))
    except Exception as e:
        print(f"FAILED: {e}")