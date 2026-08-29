from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from .database import Base


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    request_type = Column(String, nullable=False)  # event | budget | lab_access | travel_grant
    raw_text = Column(String, nullable=True)
    extracted_json = Column(JSON, nullable=True)
    status = Column(String, default="pending")  # pending | approved | rejected | revision_requested
    current_stage_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    approval_steps = relationship("ApprovalStep", back_populates="request", order_by="ApprovalStep.stage_order")
    audit_entries = relationship("AuditLog", back_populates="request", order_by="AuditLog.timestamp")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    stage_order = Column(Integer, nullable=False)
    stakeholder_role = Column(String, nullable=False)  # faculty_advisor | hod | dean_swo | dean_rd | director
    status = Column(String, default="pending")  # pending | approved | rejected | sent_back
    sla_days = Column(Integer, default=3)
    entered_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    request = relationship("Request", back_populates="approval_steps")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"))
    actor_role = Column(String, nullable=False)
    action = Column(String, nullable=False)  # submitted | approved | rejected | sent_back | escalated
    timestamp = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    request = relationship("Request", back_populates="audit_entries")
