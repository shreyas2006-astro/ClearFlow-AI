"""Step 1: get raw text out of whatever the user uploaded.
Step 2: ask an LLM to fill in ExtractedRequest, validated with Pydantic.

Fill in call_llm() with whichever provider you have a key for — Anthropic shown below,
swap for openai.chat.completions.create(...) if using GPT instead.
"""

import json
import os

import fitz  # PyMuPDF
from docx import Document

from .schemas import ExtractedRequest

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

Document text:
{text}
"""


def extract_pdf_text(path: str) -> str:
    doc = fitz.open(path)
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
    """Anthropic example — swap for your provider of choice."""
    import anthropic

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def parse_to_structured(raw_text: str) -> ExtractedRequest:
    prompt = PROMPT_TEMPLATE.format(schema=SCHEMA_HINT, text=raw_text)
    raw_response = call_llm(prompt)

    cleaned = raw_response.strip().strip("`").removeprefix("json").strip()
    data = json.loads(cleaned)
    return ExtractedRequest(**data)
