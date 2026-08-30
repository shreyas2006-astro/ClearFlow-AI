import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..extraction import extract_raw_text, parse_to_structured
from ..rule_engine import load_rules, resolve_route

router = APIRouter(prefix="/requests", tags=["requests"])

UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.RequestOut)
def upload_request(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # save upload, extract text
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    raw_text = extract_raw_text(path)

    # AI extraction + validation
    extracted = parse_to_structured(raw_text)

    # create request row
    db_request = models.Request(
        request_type=extracted.request_type,
        raw_text=raw_text,
        extracted_json=extracted.model_dump(),
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # dynamic routing
    rules = load_rules()
    route = resolve_route(extracted.request_type, extracted.model_dump(), rules)
    for i, role in enumerate(route):
        db.add(models.ApprovalStep(request_id=db_request.id, stage_order=i, stakeholder_role=role))
    db.add(models.AuditLog(request_id=db_request.id, actor_role="system", action="submitted"))
    db.commit()
    db.refresh(db_request)

    return db_request


@router.get("", response_model=list[schemas.RequestOut])
def list_requests(db: Session = Depends(get_db)):
    return db.query(models.Request).all()


@router.get("/{request_id}", response_model=schemas.RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Request).get(request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    return req


def _current_step(req: models.Request) -> models.ApprovalStep | None:
    steps = sorted(req.approval_steps, key=lambda s: s.stage_order)
    if req.current_stage_index >= len(steps):
        return None
    return steps[req.current_stage_index]


@router.post("/{request_id}/approve", response_model=schemas.RequestOut)
def approve_request(request_id: int, action: schemas.ApprovalAction, db: Session = Depends(get_db)):
    req = db.query(models.Request).get(request_id)
    if not req:
        raise HTTPException(404, "Request not found")

    step = _current_step(req)
    if not step:
        raise HTTPException(400, "Request already fully resolved")

    step.status = "approved"
    step.resolved_at = datetime.utcnow()
    req.current_stage_index += 1
    db.add(models.AuditLog(request_id=req.id, actor_role=action.actor_role, action="approved", notes=action.notes))

    if req.current_stage_index >= len(req.approval_steps):
        req.status = "approved"

    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/reject", response_model=schemas.RequestOut)
def reject_request(request_id: int, action: schemas.ApprovalAction, db: Session = Depends(get_db)):
    req = db.query(models.Request).get(request_id)
    if not req:
        raise HTTPException(404, "Request not found")

    step = _current_step(req)
    if step:
        step.status = "rejected"
        step.resolved_at = datetime.utcnow()
    req.status = "rejected"
    db.add(models.AuditLog(request_id=req.id, actor_role=action.actor_role, action="rejected", notes=action.notes))
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/send_back", response_model=schemas.RequestOut)
def send_back_request(request_id: int, action: schemas.ApprovalAction, db: Session = Depends(get_db)):
    req = db.query(models.Request).get(request_id)
    if not req:
        raise HTTPException(404, "Request not found")

    step = _current_step(req)
    if step:
        step.status = "sent_back"
        step.resolved_at = datetime.utcnow()

    target_idx = action.target_stage_index if action.target_stage_index is not None else -1

    if target_idx >= 0:
        req.current_stage_index = target_idx
        req.status = "pending"
        for s in req.approval_steps:
            if s.stage_order >= target_idx:
                s.status = "pending"
                s.resolved_at = None
                s.entered_at = datetime.utcnow() # Reset SLA timer
    else:
        req.current_stage_index = 0
        req.status = "revision_requested"

    db.add(models.AuditLog(request_id=req.id, actor_role=action.actor_role, action="sent_back", notes=action.notes))
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/resubmit", response_model=schemas.RequestOut)
def resubmit_request(request_id: int, action: schemas.ResubmitAction, db: Session = Depends(get_db)):
    req = db.query(models.Request).get(request_id)
    if not req:
        raise HTTPException(404, "Request not found")

    if req.status != "revision_requested":
        raise HTTPException(400, "Request is not waiting for revision")

    # Update data
    req.extracted_json = action.extracted_json
    req.status = "pending"
    
    # Reset all steps from the current stage index to pending
    for s in req.approval_steps:
        if s.stage_order >= req.current_stage_index:
            s.status = "pending"
            s.resolved_at = None
            s.entered_at = datetime.utcnow() # Reset SLA timer

    db.add(models.AuditLog(request_id=req.id, actor_role=action.actor_role, action="resubmitted", notes="Applicant revised details"))
    db.commit()
    db.refresh(req)
    return req


@router.get("/{request_id}/sla_status")
def sla_status(request_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Request).get(request_id)
    if not req:
        raise HTTPException(404, "Request not found")
    step = _current_step(req)
    if not step:
        return {"status": "resolved"}
    days_pending = (datetime.utcnow() - step.entered_at).days
    return {
        "stage": step.stakeholder_role,
        "days_pending": days_pending,
        "sla_days": step.sla_days,
        "breached": days_pending > step.sla_days,
    }
