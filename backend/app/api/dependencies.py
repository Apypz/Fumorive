"""
API Dependencies
FastAPI dependencies for authentication and database
Week 2, Wednesday - Updated with Redis caching
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.db.models import User
from app.core.security import verify_token
from app.core.cache import is_token_blacklisted, get_cached_user

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token
    
    Enhanced with Redis:
    - Checks if token is blacklisted (logout)
    - Tries to get user from cache before database query
    
    Args:
        token: JWT access token from Authorization header
        db: Database session
    
    Returns:
        Current authenticated User object
    
    Raises:
        HTTPException: If token is invalid, blacklisted, or user not found
    """
    print("\n" + "="*50)
    print("[AUTH] Starting get_current_user...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if token is blacklisted (logout)
    try:
        print("[LOG] Checking if token is blacklisted...")
        if is_token_blacklisted(token):
            print(f"[ERR] Token is blacklisted")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        print("[OK] Token is not blacklisted")
    except Exception as e:
        # If blacklist check fails (Redis down), allow the token through
        print(f"[WARN]  Blacklist check failed, allowing token: {e}")
    
    # Verify token
    print("[LOG] Calling verify_token...")
    payload = verify_token(token, token_type="access")
    if payload is None:
        print(f"[ERR] Token verification failed")
        raise credentials_exception
    print(f"[OK] Token payload received: {payload}")
    
    # Extract user ID - try 'user_id' first, then fall back to 'sub'
    # Note: Token was created with user_id as UUID and sub as email
    user_id_str: Optional[str] = payload.get("user_id") or payload.get("sub")
    print(f"[LOG] User ID from token: {user_id_str}")
    if user_id_str is None:
        print("[ERR] No 'user_id' or 'sub' field in token payload")
        raise credentials_exception
    
    try:
        user_id = UUID(user_id_str)
        print(f"[OK] User UUID: {user_id}")
    except ValueError as e:
        print(f"[ERR] Invalid UUID format: {e}")
        raise credentials_exception
    
    # Try to get user from Redis cache first
    print(f"[LOG] Checking cache for user {user_id}...")
    try:
        cached_user_data = get_cached_user(user_id)
    except Exception as e:
        print(f"[WARN]  Cache lookup failed, falling back to DB: {e}")
        cached_user_data = None
    if cached_user_data:
        print(f"[OK] User found in cache")
        # Reconstruct User object from cached data
        user = User(
            id=UUID(cached_user_data["id"]),
            email=cached_user_data["email"],
            hashed_password=cached_user_data["hashed_password"],
            full_name=cached_user_data["full_name"],
            role=cached_user_data["role"],
            is_active=cached_user_data["is_active"]
        )
        # Note: This is a detached instance, won't track changes
        # For read-only operations (most auth checks), this is fine
        print(f"[OK] get_current_user completed successfully (from cache)")
        print("="*50 + "\n")
        return user
    
    # Cache miss - get user from database
    print(f"[LOG] Cache miss, querying database for user {user_id}...")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        print(f"[ERR] User {user_id} not found in database!")
        raise credentials_exception
    print(f"[OK] User found in database: {user.email}")
    
    if not user.is_active:
        print(f"[ERR] User {user.email} is not active")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    print(f"[OK] User {user.email} is active")
    
    print(f"[OK] get_current_user completed successfully")
    print("="*50 + "\n")
    return user


async def get_eeg_or_user_auth(
    request: Request,
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
):
    """
    Dual auth dependency for EEG endpoints.
    
    Accepts EITHER:
    1. X-EEG-API-Key header (for EEG server process) — no JWT needed
    2. Standard Bearer JWT token (for browser/frontend)
    
    Returns the authenticated User or a sentinel string "eeg_internal".
    """
    from app.core.config import settings
    
    # Check internal API key first
    eeg_key = request.headers.get("X-EEG-API-Key")
    if eeg_key:
        if eeg_key == settings.EEG_INTERNAL_KEY:
            return "eeg_internal"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid EEG API key",
        )
    
    # Fall back to JWT auth
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await get_current_user(token=token, db=db)


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user (convenience wrapper)
    
    Args:
        current_user: Current user from get_current_user dependency
    
    Returns:
        Current active User object
    """
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to require admin role
    
    Args:
        current_user: Current user from get_current_user dependency
    
    Returns:
        Current User if admin
    
    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_researcher_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to require researcher or admin role
    
    Args:
        current_user: Current user from get_current_user dependency
    
    Returns:
        Current User if researcher or admin
    
    Raises:
        HTTPException: If user is not researcher or admin
    """
    if current_user.role not in ["researcher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researcher or admin access required"
        )
    return current_user
