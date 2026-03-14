# /common/app/security.py - DEFINITIVE, FINAL, AND SECURE VERSION

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from . import models, database

security_scheme = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_for_development")
ALGORITHM = "HS256"

def get_user(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

async def get_current_user(
    authorization: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(database.get_db)
) -> models.User:
    token = authorization.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role") # Get the role directly from the token payload
        if username is None or role is None:
            raise credentials_exception
        
        user = get_user(db, username=username)
        if user is None:
            raise credentials_exception
        
        # This is now the single source of truth for authorization checks.
        user.token_role = role
        return user
        
    except JWTError:
        raise credentials_exception

def require_role(required_roles: list[str]):
    """
    A dependency factory that checks the user's role based on the JWT.
    """
    async def role_checker(current_user: models.User = Depends(get_current_user)):
        # --- THIS IS THE CRITICAL FIX ---
        # We now check against `user.token_role`, which comes directly from the JWT.
        if not hasattr(current_user, 'token_role') or current_user.token_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role",
            )
        return current_user
    return role_checker