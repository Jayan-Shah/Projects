from sqlalchemy.orm import Session
from sqlalchemy import or_ # <-- CORRECTED IMPORT
from uuid import UUID
from common_app import models, schemas
from common_app.schemas import IncidentStatus

def create_incident(db: Session, incident: schemas.IncidentCreate, submitted_by: str):
    # This function is unchanged
    incident_data = incident.dict()
    incident_data['submitted_by'] = submitted_by
    db_incident = models.Incident(**incident_data)
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

def close_incident(db: Session, incident_id: UUID, analyst_username: str):
    """
    Manually closes an incident by setting its resolution.
    IT NO LONGER OVERWRITES THE ORIGINAL ANALYSIS.
    """
    db_incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if db_incident:
        # We only set the resolution field. The original findings are preserved.
        db_incident.resolution = f"Manually reviewed and closed by analyst: {analyst_username}."
        db.commit()
        db.refresh(db_incident)
    return db_incident

def get_incidents(db: Session, user: models.User, skip: int = 0, limit: int = 100):
    # This function is unchanged
    if user.role in ["ADMIN", "ANALYST"]:
        return db.query(models.Incident).order_by(models.Incident.created_at.desc()).offset(skip).limit(limit).all()
    else: # This is a regular 'USER'
        return db.query(models.Incident).filter(models.Incident.submitted_by == user.username).order_by(models.Incident.created_at.desc()).offset(skip).limit(limit).all()

def get_open_incidents(db: Session, user: models.User, skip: int = 0, limit: int = 100):
    """
    Gets all incidents that are NOT resolved yet.
    """
    query = db.query(models.Incident).filter(models.Incident.resolution == None)
    
    if user.role not in ["ADMIN", "ANALYST"]:
        query = query.filter(models.Incident.submitted_by == user.username)
        
    return query.order_by(models.Incident.created_at.desc()).offset(skip).limit(limit).all()

def get_closed_incidents(db: Session, skip: int = 0, limit: int = 100):
    """
    Gets all incidents that HAVE been resolved.
    """
    return db.query(models.Incident).filter(
        models.Incident.resolution != None
    ).order_by(models.Incident.created_at.desc()).offset(skip).limit(limit).all()