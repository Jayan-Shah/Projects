# /auth-service/app/main.py - DEFINITIVE FINAL VERSION

import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import from our shared library
from common_app import models, schemas, database
from common_app.security import require_role # Use the updated require_role

# Import local service-specific logic
import crud
import security

# Load the approved list for USER registration on startup
APPROVED_IDS = os.getenv("APPROVED_SERVICE_IDS", "").split(',')

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI(title="Threat Sentinel Authentication Service")

origins = [
    "http://localhost:3000", # CERT Dashboard
    "http://localhost:3001", # User Portal
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def create_master_admin_on_startup():
    """
    Runs once on service startup. Creates the master 'ArmyChief' ADMIN user
    if they do not already exist in the database.
    """
    db = database.SessionLocal()
    try:
        admin_user = crud.get_user_by_username(db, username="ArmyChief")
        if not admin_user:
            print("Master Admin 'ArmyChief' not found. Creating...")
            admin_password = "SuperIndiaIsBest!"
            hashed_password = security.get_password_hash(admin_password)
            db_admin = models.User(
                username="ArmyChief",
                hashed_password=hashed_password,
                role="ADMIN"  # Explicitly set the role to ADMIN
            )
            db.add(db_admin)
            db.commit()
            print("Master Admin 'ArmyChief' created successfully.")
    finally:
        db.close()

@app.post("/register", response_model=schemas.User, tags=["User Actions"])
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    Public registration endpoint for Defence Personnel and Families (USER role).
    Registration is only allowed if the username (Service ID) is in the approved whitelist.
    """
    if user.username not in APPROVED_IDS:
        raise HTTPException(status_code=403, detail="Service ID is not authorized for registration.")
    
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="This Service ID has already been registered.")
    
    # Call the specific, secure function for creating end-users
    return crud.create_end_user(db=db, user=user)

@app.post("/login", response_model=schemas.Token, tags=["User Actions"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    """Authenticates any user (USER, ANALYST, ADMIN) and returns a JWT."""
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/admin/create-analyst", response_model=schemas.User, tags=["Admin Actions"])
def create_analyst_account(
    user_to_create: schemas.UserCreate,
    db: Session = Depends(database.get_db),
    # This endpoint is protected and requires the token of an ADMIN user.
    # The role MUST be passed as a list to match the updated security function.
    current_admin: models.User = Depends(require_role(["ADMIN"]))
):
    """Creates a new analyst account. Only accessible by Admins."""
    db_user = crud.get_user_by_username(db, username=user_to_create.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Service ID is already registered")
    
    # Call the specific, secure function for creating analysts
    return crud.create_analyst(db=db, user=user_to_create)