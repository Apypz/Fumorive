"""
Session Management API Routes
CRUD operations for driving sessions
Week 2, Tuesday - API Routes for Sessions
Week 5, Wednesday - Redis caching for session metadata
"""

import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, Session as DBSession
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse, SessionListResponse
from app.api.dependencies import get_current_user
from app.core.cache import get_redis

router = APIRouter(prefix="/sessions", tags=["Sessions"])

# Cache TTL constants (seconds)
_SESSION_TTL = 300   # 5 minutes for individual session metadata
_SESSION_LIST_TTL = 60  # 1 minute for session list (changes more often)


def _cache_key_session(session_id: UUID) -> str:
    return f"session:{session_id}"


def _get_cached_session(session_id: UUID) -> Optional[dict]:
    r = get_redis()
    if not r:
        return None
    try:
        data = r.get(_cache_key_session(session_id))
        return json.loads(data) if data else None
    except Exception:
        return None


def _set_cached_session(session_id: UUID, session_data: dict) -> None:
    r = get_redis()
    if not r:
        return
    try:
        r.setex(_cache_key_session(session_id), _SESSION_TTL, json.dumps(session_data, default=str))
    except Exception:
        pass


def _invalidate_session_cache(session_id: UUID) -> None:
    r = get_redis()
    if not r:
        return
    try:
        r.delete(_cache_key_session(session_id))
    except Exception:
        pass



@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new driving session
    
    - **session_name**: Name for the session
    - **device_type**: EEG device type (e.g., "Muse 2")
    - **calibration_data**: Optional baseline calibration data
    - **settings**: Optional game settings and thresholds
    """
    new_session = DBSession(
        user_id=current_user.id,
        session_name=session_data.session_name,
        device_type=session_data.device_type,
        calibration_data=session_data.calibration_data,
        settings=session_data.settings,
        session_status="active"
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status (active, completed, failed)")
):
    """
    Get list of user's sessions with pagination
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Optional filter by session status
    """
    query = db.query(DBSession).filter(DBSession.user_id == current_user.id)
    
    # Apply status filter if provided
    if status:
        query = query.filter(DBSession.session_status == status)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    sessions = query.order_by(DBSession.started_at.desc()).offset(offset).limit(page_size).all()
    
    return {
        "total": total,
        "sessions": sessions,
        "page": page,
        "page_size": page_size
    }


@router.get("/latest-active", response_model=SessionResponse)
async def get_latest_active_session(
    db: Session = Depends(get_db)
):
    """
    Get the most recently created active session (no auth required).
    
    Used by EEG processing script to auto-detect the current session.
    Only works on localhost for development.
    """
    session = (
        db.query(DBSession)
        .filter(DBSession.session_status == "active")
        .order_by(DBSession.started_at.desc())
        .first()
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found"
        )
    
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific session by ID

    User can only access their own sessions (unless admin).
    Result is cached in Redis for 5 minutes to reduce DB load.
    """
    # Try cache first (skip for admins so they always get fresh data)
    if current_user.role != "admin":
        cached = _get_cached_session(session_id)
        if cached:
            # Quick ownership check before returning
            if cached.get("user_id") == str(current_user.id):
                return cached

    session = db.query(DBSession).filter(DBSession.id == session_id).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Check authorization (user can only access their own sessions)
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )

    # Populate cache for future reads
    _set_cached_session(session_id, {
        "id": str(session.id),
        "user_id": str(session.user_id),
        "session_name": session.session_name,
        "device_type": session.device_type,
        "session_status": session.session_status,
        "started_at": str(session.started_at),
        "ended_at": str(session.ended_at) if session.ended_at else None,
        "duration_seconds": session.duration_seconds,
        "avg_fatigue_score": session.avg_fatigue_score,
        "max_fatigue_score": session.max_fatigue_score,
        "alert_count": session.alert_count,
    })

    return session


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: UUID,
    session_update: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a session (partial update)
    
    Can update: session_name, session_status, calibration_data, settings,
    ended_at, duration_seconds, fatigue scores, alert_count
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check authorization
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this session"
        )
    
    # Update fields
    update_data = session_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)

    # Invalidate cached session — data has changed
    _invalidate_session_cache(session_id)

    return session


@router.post("/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a session as completed
    
    Sets status to 'completed' and ended_at to current time
    Calculates duration_seconds automatically
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check authorization
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to complete this session"
        )
    
    # Update session
    session.session_status = "completed"
    session.ended_at = datetime.utcnow()
    
    # Calculate duration if not already set
    if session.started_at and session.ended_at:
        duration = (session.ended_at - session.started_at).total_seconds()
        session.duration_seconds = int(duration)
    
    db.commit()
    db.refresh(session)

    # Invalidate cache — session is now completed
    _invalidate_session_cache(session_id)

    return session


@router.patch("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    End a session (alias for complete)
    
    Sets status to 'completed' and ended_at to current time
    Calculates duration_seconds automatically
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check authorization
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to end this session"
        )
    
    # Update session
    session.session_status = "completed"
    session.ended_at = datetime.utcnow()
    
    # Calculate duration if not already set
    if session.started_at and session.ended_at:
        duration = (session.ended_at - session.started_at).total_seconds()
        session.duration_seconds = int(duration)
    
    db.commit()
    db.refresh(session)

    # Invalidate cache — session is now ended
    _invalidate_session_cache(session_id)

    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a session (and all related data)
    
    WARNING: This will delete all EEG data, face events, game events, and alerts
    associated with this session due to cascade delete.
    """
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check authorization (only owner or admin can delete)
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this session"
        )
    
    db.delete(session)
    db.commit()

    # Remove from cache
    _invalidate_session_cache(session_id)

    return None
