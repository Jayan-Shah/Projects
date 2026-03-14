# /file-analysis-service/app/crud.py

from sqlalchemy.orm import Session
from uuid import UUID

from common_app import models
from common_app.schemas import IncidentStatus, AnalysisResult

def get_incident_by_id(db: Session, incident_id: UUID):
    """Fetches a single incident from the database by its ID."""
    return db.query(models.Incident).filter(models.Incident.id == incident_id).first()

def update_incident_analysis(db: Session, incident_id: UUID, status: IncidentStatus, result: dict):
    """
    Updates an incident's status and analysis result.
    The 'result' dict is automatically validated by SQLAlchemy against the Pydantic model
    defined in the common schemas.
    """
    db_incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if db_incident:
        db_incident.status = status
        db_incident.analysis_result = result
        db.commit()
        db.refresh(db_incident)
    return db_incident