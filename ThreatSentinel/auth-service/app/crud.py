# /auth-service/app/crud.py - DEFINITIVE FINAL VERSION

from sqlalchemy.orm import Session
from common_app import models, schemas
import security

def get_user_by_username(db: Session, username: str):
    """Fetches a single user by their username."""
    return db.query(models.User).filter(models.User.username == username).first()

def create_end_user(db: Session, user: schemas.UserCreate):
    """
    Creates a new standard user with the 'USER' role.
    This is for the public registration endpoint.
    """
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role="USER"  # Explicitly sets the role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_analyst(db: Session, user: schemas.UserCreate):
    """
    Creates a new analyst user with the 'ANALYST' role.
    This is for the admin-only creation endpoint.
    """
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role="ANALYST"  # Explicitly sets the role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user