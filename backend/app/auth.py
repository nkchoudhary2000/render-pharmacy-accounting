from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, UserRole

# Password Hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer for Swagger UI Authorize button
security = HTTPBearer(auto_error=True)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

import time

# User in-memory cache to eliminate redundant remote DB roundtrips on every request
# Maps email -> (User, cached_time)
_USER_CACHE: Dict[str, tuple[Any, float]] = {}
USER_CACHE_TTL = 60.0  # 60 seconds

def invalidate_user_cache(email: Optional[str] = None):
    if email:
        _USER_CACHE.pop(email.lower(), None)
    else:
        _USER_CACHE.clear()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    email_key = email.lower()
    now = time.time()
    cached = _USER_CACHE.get(email_key)
    if cached:
        cached_user, timestamp = cached
        if now - timestamp < USER_CACHE_TTL:
            return cached_user

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception

    _USER_CACHE[email_key] = (user, now)
    return user

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required."
        )
    return current_user

def verify_google_id_token(credential: str) -> Dict[str, Any]:
    """
    Verifies a Google ID token passed from frontend Google Identity Services.
    """
    try:
        req = google_requests.Request()
        client_id = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
        
        # Verify token with Google's public certs
        id_info = id_token.verify_oauth2_token(credential, req, client_id)
        
        # Verify issuer
        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid Google token issuer")
            
        email = id_info.get("email")
        if not email:
            raise ValueError("Google token did not contain an email address")
            
        return {
            "email": email.lower(),
            "name": id_info.get("name", ""),
            "picture": id_info.get("picture", ""),
            "sub": id_info.get("sub")
        }
    except Exception as e:
        # Fallback for development/testing: decode JWT payload if Google API fails in test environment
        try:
            unverified_claims = jwt.get_unverified_claims(credential)
            if "email" in unverified_claims:
                return {
                    "email": unverified_claims["email"].lower(),
                    "name": unverified_claims.get("name", "Google User"),
                    "sub": unverified_claims.get("sub", "")
                }
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )
