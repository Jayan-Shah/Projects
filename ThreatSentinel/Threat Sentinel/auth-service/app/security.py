# /auth-service/app/security.py - DEFINITIVE FINAL VERSION

import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

# --- Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_for_development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Setup the password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Core Cryptographic Functions ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares a plain-text password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generates a secure bcrypt hash for a given plain-text password."""
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    """Creates a new, signed JSON Web Token (JWT)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt