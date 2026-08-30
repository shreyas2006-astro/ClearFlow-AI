from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class ExtractedRequest(BaseModel):
    """What the LLM extraction step must return, validated before a Request row is created."""
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    venue: Optional[str] = None
    budget_amount: Optional[float] = None
    faculty_advisor: Optional[str] = None
    requesting_club: Optional[str] = None
    request_type: str  # event | budget | lab_access | travel_grant
    compliance_flags: List[str] = []


class ApprovalStepOut(BaseModel):
    stage_order: int
    stakeholder_role: str
    status: str
    sla_days: int
    entered_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    actor_role: str
    action: str
    timestamp: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class RequestOut(BaseModel):
    id: int
    request_type: str
    extracted_json: dict
    status: str
    current_stage_index: int
    created_at: datetime
    approval_steps: List[ApprovalStepOut] = []
    audit_entries: List[AuditLogOut] = []

    class Config:
        from_attributes = True


class ApprovalAction(BaseModel):
    actor_role: str
    notes: Optional[str] = None
    target_stage_index: Optional[int] = None
