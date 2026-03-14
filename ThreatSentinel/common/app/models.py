import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .database import Base
from .schemas import IncidentStatus

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submitted_by = Column(String, index=True, nullable=False)
    incident_type = Column(String, default="URL_SUBMISSION")
    submitted_url = Column(String, nullable=True)
    submitted_text = Column(String, nullable=True)
    description = Column(String, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.PENDING_ANALYSIS)
    created_at = Column(DateTime, default=datetime.utcnow)
    analysis_result = Column(JSONB, nullable=True)
    resolution = Column(Text, nullable=True) # <-- NEW COLUMN

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, nullable=False)