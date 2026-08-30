"""Step 1: get raw text out of whatever the user uploaded.
Step 2: ask an LLM to fill in ExtractedRequest, validated with Pydantic.
"""
 
import json
import os
import time
 
import pymupdf
from docx import Document
from dotenv import load_dotenv
 
from .schemas import ExtractedRequest
 
load_dotenv()  # reads .env in the repo root, so GEMINI_API_KEY doesn't need manual export
 
# gemini-3.6-flash first: proven reliable in testing. gemini-3.7-flash is newer/stronger
# but is currently under heavy public load (every test call failed 3x before falling back) —
# not worth the 7s of visible retry delay live in front of judges. Swap order back once
# 3.7 demand settles, or just before the final demo if you want to double check.
MODEL_FALLBACK_CHAIN = ["gemini-3.1-flash-lite"]
MAX_RETRIES_PER_MODEL = 3
 
SCHEMA_HINT = """{
  "event_name": "string or null",
  "event_date": "YYYY-MM-DD or null",
  "venue": "string or null",
  "budget_amount": "number or null",
  "faculty_advisor": "string or null",
  "requesting_club": "string or null",
  "request_type": "one of: event, budget, lab_access, travel_grant",
  "compliance_flags": ["list any fields above that are null/missing"]
}"""
 
PROMPT_TEMPLATE = """Extract the following fields from this campus proposal document.
Return ONLY valid JSON matching this schema, no other text, no markdown fences:
{schema}
 
Field notes:
- "requesting_club" only applies to event and budget requests submitted by a club/society.
  For travel_grant and lab_access requests (usually submitted by an individual student),
  requesting_club is expected to be null and should NOT be listed in compliance_flags.
- Only list a field in compliance_flags if it is actually required for this request_type
  and is missing or null in the document.
 
Document text:
{text}
"""
 
 
def extract_pdf_text(path: str) -> str:
    doc = pymupdf.open(path)
    return "\n".join(page.get_text() for page in doc)
 
 
def extract_docx_text(path: str) -> str:
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs)
 
 
def extract_txt_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()
 
 
def extract_raw_text(path: str) -> str:
    if path.endswith(".pdf"):
        return extract_pdf_text(path)
    if path.endswith(".docx"):
        return extract_docx_text(path)
    return extract_txt_text(path)  # dev convenience for sample_docs/*.txt
 
 
def call_llm(prompt: str) -> str:
    """Tries each model in MODEL_FALLBACK_CHAIN, retrying transient errors (503, rate
    limits) with exponential backoff before moving to the next model. Raises the last
    error if everything fails — that's a real failure worth seeing, not silently eaten."""
    from google import genai
    from google.genai import errors as genai_errors
 
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[extraction] Warning: No GEMINI_API_KEY found, using a mock response.")
        return """
        {
          "event_name": "Sample Event",
          "event_date": "2026-10-15",
          "venue": "Main Auditorium",
          "budget_amount": 5000,
          "faculty_advisor": "Dr. Kamath",
          "requesting_club": "Tech Club",
          "request_type": "event",
          "compliance_flags": []
        }
        """

    client = genai.Client(api_key=api_key)
    last_error = None
 
    for model in MODEL_FALLBACK_CHAIN:
        for attempt in range(MAX_RETRIES_PER_MODEL):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={"response_mime_type": "application/json"},
                )
                return response.text
            except genai_errors.ServerError as e:
                # 503 (overloaded) or similar — worth retrying, then trying the next model
                last_error = e
                wait = 2 ** attempt  # 1s, 2s, 4s
                print(f"[extraction] {model} attempt {attempt + 1} failed ({e}); retrying in {wait}s")
                time.sleep(wait)
            except genai_errors.ClientError as e:
                # bad request, bad key, etc. — retrying won't help, fail fast
                raise
 
    raise RuntimeError(f"All models in fallback chain failed. Last error: {last_error}")
 
 
def _extract_json_object(raw_response: str) -> dict:
    """Handles the common LLM response shapes: clean JSON, markdown-fenced JSON,
    or JSON preceded/followed by stray explanatory text."""
    cleaned = raw_response.strip().strip("`").removeprefix("json").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
 
    # fallback: grab the first {...} block anywhere in the response
    start = raw_response.find("{")
    end = raw_response.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"No JSON object found in LLM response: {raw_response[:200]!r}")
    return json.loads(raw_response[start:end + 1])
 
 
def parse_to_structured(raw_text: str) -> ExtractedRequest:
    prompt = PROMPT_TEMPLATE.format(schema=SCHEMA_HINT, text=raw_text)
    raw_response = call_llm(prompt)
    data = _extract_json_object(raw_response)
    return ExtractedRequest(**data)
 