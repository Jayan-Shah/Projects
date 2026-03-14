# /intake-service/app/main.py - DEFINITIVE VERSION

import uuid
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse

from common_app import models, schemas, database
from common_app.security import get_current_user, require_role

import crud
import producer
from minio_client import client as minio_client, MINIO_BUCKET

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI(title="Defence Cyber Incident Intake Service")

origins = [ "http://localhost:3000", "http://localhost:3001" ]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.post("/incidents/file", response_model=schemas.Incident, status_code=201, tags=["Incident Submission"])
def create_file_incident(description: str = Form(...), file: UploadFile = File(...), db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # ... (This endpoint's code is unchanged)
    try:
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'dat'
        object_name = f"{uuid.uuid4()}.{file_extension}"
        minio_client.put_object(MINIO_BUCKET, object_name, file.file, -1, part_size=10*1024*1024, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error storing forensic file.")
    finally:
        file.file.close()
    incident_to_create = schemas.IncidentCreate(submitted_by=current_user.username, incident_type=file.content_type or "file", submitted_text=object_name, description=description, submitted_url=None)
    db_incident = crud.create_incident(db=db, incident=incident_to_create, submitted_by=current_user.username)
    message_body = {"incident_id": str(db_incident.id), "file_object_name": object_name, "content_type": file.content_type}
    producer.publish_message(message_body)
    return db_incident

@app.post("/incidents/url", response_model=schemas.Incident, status_code=201, tags=["Incident Submission"])
def create_url_incident(incident: schemas.IncidentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # ... (This endpoint's code is unchanged)
    db_incident = crud.create_incident(db=db, incident=incident, submitted_by=current_user.username)
    message_body = {"incident_id": str(db_incident.id), "submitted_url": db_incident.submitted_url}
    producer.publish_message(message_body)
    return db_incident

# --- THIS IS THE FIX ---
# This is the original, correct endpoint for fetching incidents based on role.
# It serves BOTH the user portal (filtered to self) and the admin portal (all incidents).
@app.get("/incidents/", response_model=list[schemas.Incident], tags=["Incident Viewing"])
def read_all_incidents_by_role(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_incidents(db, user=current_user, skip=skip, limit=limit)

# This is the NEW endpoint specifically for the Analyst's "Live Feed" (only PENDING incidents)
@app.get("/incidents/open", response_model=list[schemas.Incident], tags=["Incident Viewing"])
def read_open_incidents(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_open_incidents(db, user=current_user, skip=skip, limit=limit)

@app.get("/incidents/closed", response_model=list[schemas.Incident], tags=["Incident Viewing"])
def read_closed_incidents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    # This now correctly checks for either role.
    current_user: models.User = Depends(require_role(["ADMIN", "ANALYST"]))
):
    """Retrieves a list of all CLOSED incidents for the archive."""
    incidents = crud.get_closed_incidents(db, skip=skip, limit=limit)
    return incidents

@app.post("/incidents/{incident_id}/close", response_model=schemas.Incident, tags=["Incident Actions"])
def close_incident_by_analyst(incident_id: uuid.UUID, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # ... (This endpoint's code is unchanged)
    if current_user.role not in ["ADMIN", "ANALYST"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted for your role")
    updated_incident = crud.close_incident(db, incident_id=incident_id, analyst_username=current_user.username)
    if not updated_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return updated_incident

@app.get("/incidents/view/{object_name}", tags=["Incident Viewing"])
async def get_incident_file(object_name: str, current_user: models.User = Depends(get_current_user)):
    # ... (This endpoint's code is unchanged)
    try:
        file_data = minio_client.get_object(MINIO_BUCKET, object_name)
        return StreamingResponse(file_data.stream(32 * 1024), media_type=file_data.headers.get("Content-Type", "application/octet-stream"))
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found or access denied.")