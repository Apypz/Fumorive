"""
Session Playback API Routes
Retrieve historical EEG, face, game event data for session replay
Week 4 - Session Playback Feature
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.db.models import (
    User, Session as SessionModel, EEGData, FaceDetectionEvent, GameEvent, Alert
)
from app.schemas.eeg import (
    EEGDataResponse, FaceEventResponse, GameEventResponse,
    PaginatedEEGResponse, PaginatedFaceResponse, PaginatedGameResponse,
    TimelineEvent, TimelineResponse
)
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/sessions", tags=["Session Playback"])


def _get_user_session(session_id: UUID, current_user: User, db: Session) -> SessionModel:
    """Helper: get session and verify ownership"""
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    if session.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    return session


@router.get("/{session_id}/eeg", response_model=PaginatedEEGResponse)
async def get_session_eeg(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_time: Optional[datetime] = Query(None, description="Filter from timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter to timestamp"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
):
    """
    Get EEG data for a session with optional time-range filtering.
    
    - **start_time**: ISO datetime to filter from
    - **end_time**: ISO datetime to filter to
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 100, max: 1000)
    """
    _get_user_session(session_id, current_user, db)

    query = db.query(EEGData).filter(EEGData.session_id == session_id)

    if start_time:
        query = query.filter(EEGData.timestamp >= start_time)
    if end_time:
        query = query.filter(EEGData.timestamp <= end_time)

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(EEGData.timestamp.asc()).offset(offset).limit(page_size).all()

    return PaginatedEEGResponse(
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
        data=records,
    )


@router.get("/{session_id}/face", response_model=PaginatedFaceResponse)
async def get_session_face(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_time: Optional[datetime] = Query(None, description="Filter from timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter to timestamp"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
):
    """
    Get face detection events for a session with optional time-range filtering.
    """
    _get_user_session(session_id, current_user, db)

    query = db.query(FaceDetectionEvent).filter(FaceDetectionEvent.session_id == session_id)

    if start_time:
        query = query.filter(FaceDetectionEvent.timestamp >= start_time)
    if end_time:
        query = query.filter(FaceDetectionEvent.timestamp <= end_time)

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(FaceDetectionEvent.timestamp.asc()).offset(offset).limit(page_size).all()

    return PaginatedFaceResponse(
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
        data=records,
    )


@router.get("/{session_id}/game-events", response_model=PaginatedGameResponse)
async def get_session_game_events(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_time: Optional[datetime] = Query(None, description="Filter from timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter to timestamp"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
):
    """
    Get game events for a session with optional time-range and type filtering.
    """
    _get_user_session(session_id, current_user, db)

    query = db.query(GameEvent).filter(GameEvent.session_id == session_id)

    if start_time:
        query = query.filter(GameEvent.timestamp >= start_time)
    if end_time:
        query = query.filter(GameEvent.timestamp <= end_time)
    if event_type:
        query = query.filter(GameEvent.event_type == event_type)

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(GameEvent.timestamp.asc()).offset(offset).limit(page_size).all()

    return PaginatedGameResponse(
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
        data=records,
    )


@router.get("/{session_id}/timeline", response_model=TimelineResponse)
async def get_session_timeline(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_time: Optional[datetime] = Query(None, description="Filter from timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter to timestamp"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(200, ge=1, le=1000, description="Items per page"),
):
    """
    Get a unified timeline of ALL events (EEG, face, game, alerts) for a session,
    merged and sorted chronologically.
    """
    _get_user_session(session_id, current_user, db)

    events: list[TimelineEvent] = []

    # Helper to build time-range filter
    def _time_filter(query, model):
        if start_time:
            query = query.filter(model.timestamp >= start_time)
        if end_time:
            query = query.filter(model.timestamp <= end_time)
        return query

    # EEG data (sampled — take every Nth record to avoid overwhelming timeline)
    eeg_query = _time_filter(
        db.query(EEGData).filter(EEGData.session_id == session_id), EEGData
    )
    for row in eeg_query.order_by(EEGData.timestamp.asc()).limit(500).all():
        events.append(TimelineEvent(
            type="eeg",
            timestamp=row.timestamp,
            data={
                "id": row.id,
                "theta_alpha_ratio": row.theta_alpha_ratio,
                "signal_quality": row.signal_quality,
                "cognitive_state": row.cognitive_state,
                "eeg_fatigue_score": row.eeg_fatigue_score,
            }
        ))

    # Face events
    face_query = _time_filter(
        db.query(FaceDetectionEvent).filter(FaceDetectionEvent.session_id == session_id),
        FaceDetectionEvent
    )
    for row in face_query.order_by(FaceDetectionEvent.timestamp.asc()).limit(500).all():
        events.append(TimelineEvent(
            type="face",
            timestamp=row.timestamp,
            data={
                "id": row.id,
                "eyes_closed": row.eyes_closed,
                "yawning": row.yawning,
                "blink_rate": row.blink_rate,
                "face_fatigue_score": row.face_fatigue_score,
            }
        ))

    # Game events
    game_query = _time_filter(
        db.query(GameEvent).filter(GameEvent.session_id == session_id), GameEvent
    )
    for row in game_query.order_by(GameEvent.timestamp.asc()).limit(500).all():
        events.append(TimelineEvent(
            type="game",
            timestamp=row.timestamp,
            data={
                "id": row.id,
                "event_type": row.event_type,
                "speed": row.speed,
                "lane_deviation": row.lane_deviation,
            }
        ))

    # Alerts
    alert_query = _time_filter(
        db.query(Alert).filter(Alert.session_id == session_id), Alert
    )
    for row in alert_query.order_by(Alert.timestamp.asc()).all():
        events.append(TimelineEvent(
            type="alert",
            timestamp=row.timestamp,
            data={
                "id": row.id,
                "alert_level": row.alert_level,
                "fatigue_score": row.fatigue_score,
                "trigger_reason": row.trigger_reason,
                "acknowledged": row.acknowledged,
            }
        ))

    # Sort all events chronologically
    events.sort(key=lambda e: e.timestamp)

    total = len(events)
    offset = (page - 1) * page_size
    page_events = events[offset: offset + page_size]

    return TimelineResponse(
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
        events=page_events,
    )
