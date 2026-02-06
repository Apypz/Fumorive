"""
User Management API Routes
Profile retrieval and updates
Week 3, Monday - User Profile Features
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.schemas.user import UserResponse, UserUpdate
from app.api.dependencies import get_current_user
from app.core.cache import cache_user_session, invalidate_user_cache

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get current logged-in user profile
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile
    
    - **full_name**: Update display name
    - **profile_picture**: Update avatar URL/path
    """
    # Check if anything to update
    if not user_update.model_dump(exclude_unset=True):
        return current_user
        
    # Update fields
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
        
    if user_update.profile_picture is not None:
        current_user.profile_picture = user_update.profile_picture
        
    # Commit changes
    db.commit()
    db.refresh(current_user)
    
    # Update cache
    user_cache_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "hashed_password": current_user.hashed_password,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "profile_picture": current_user.profile_picture
    }
    
    cache_user_session(current_user.id, user_cache_data)
    
    return current_user
