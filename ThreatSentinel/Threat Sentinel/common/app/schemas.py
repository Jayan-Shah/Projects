from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from enum import Enum
from typing import List, Optional

# --- Incident Schemas ---
class IncidentStatus(str, Enum):
    PENDING_ANALYSIS = "PENDING_ANALYSIS"
    ANALYSIS_IN_PROGRESS = "ANALYSIS_IN_PROGRESS"
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
    ESCALATED = "ESCALATED"

# --- Structure for the rich analysis result ---
class AnalysisDetail(BaseModel):
    analyzer_name: str
    result: str
    score_contribution: int

class AnalysisResult(BaseModel):
    final_verdict: str = Field(..., example="malicious")
    risk_score: int = Field(..., example=85)
    severity: str = Field(..., example="HIGH")
    summary: str = Field(..., example="File contains active macros.")
    details: List[AnalysisDetail]

# --- Core Incident Schemas ---
class IncidentBase(BaseModel):
    submitted_by: str = Field(..., example="pilot_user_007")
    incident_type: str = Field(default="URL_SUBMISSION", example="URL_SUBMISSION")
    submitted_url: str | None = Field(default=None, example="http://suspicious-link.com/login")
    submitted_text: str | None = Field(default=None, example="Suspicious SMS content here")
    description: str = Field(..., example="Received a phishing SMS with this link.")

class IncidentCreate(IncidentBase):
    pass

class Incident(IncidentBase):
    id: UUID
    status: IncidentStatus
    created_at: datetime
    analysis_result: Optional[AnalysisResult] = None
    resolution: Optional[str] = None # <-- NEW FIELD

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: UUID
    is_active: bool
    role: str

    class Config:
        from_attributes = True

# --- Token Schema ---
class Token(BaseModel):
    access_token: str
    token_type: str