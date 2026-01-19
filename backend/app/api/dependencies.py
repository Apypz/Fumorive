"""
API Dependencies
FastAPI dependencies for authentication and database
Week 2, Wednesday - Updated with Redis caching
"""

from fastapi import Depends, HTTPException, status
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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if token is blacklisted (logout)
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    payload = verify_token(token, token_type="access")
    if payload is None:
        raise credentials_exception
    
    # Extract user ID
    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception
    
    # Try to get user from Redis cache first
    cached_user_data = get_cached_user(user_id)
    if cached_user_data:
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
        return user
    
    # Cache miss - get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


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
