"""
Session Playback API Routes
Retrieve historical EEG, face, game event data for session replay
Week 4 - Session Playback Feature
Week 5 - Optimized with TimescaleDB continuous aggregates
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
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


@router.get("/{session_id}/eeg/aggregated")
async def get_session_eeg_aggregated(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    bucket: str = Query("1min", regex="^(1min|5min)$", description="Bucket size: '1min' or '5min'"),
    start_time: Optional[datetime] = Query(None, description="Filter from timestamp"),
    end_time: Optional[datetime] = Query(None, description="Filter to timestamp"),
):
    """
    Get pre-aggregated EEG band powers from TimescaleDB continuous aggregates.

    Much faster than querying raw eeg_data for dashboard charts — uses
    pre-computed 1-minute or 5-minute materialized views.

    - **bucket**: '1min' (default) or '5min'
    - Use **5min** for full-session overview; **1min** for detailed view
    """
    _get_user_session(session_id, current_user, db)

    view = "eeg_1min_agg" if bucket == "1min" else "eeg_5min_agg"

    sql = text(f"""
        SELECT
            bucket,
            avg_delta,
            avg_theta,
            avg_alpha,
            avg_beta,
            avg_gamma,
            avg_theta_alpha_ratio,
            avg_fatigue_score,
            avg_signal_quality,
            sample_count
        FROM {view}
        WHERE session_id = :session_id
          AND (:start_time IS NULL OR bucket >= :start_time)
          AND (:end_time IS NULL OR bucket <= :end_time)
        ORDER BY bucket ASC
    """)

    rows = db.execute(sql, {
        "session_id": str(session_id),
        "start_time": start_time,
        "end_time": end_time,
    }).fetchall()

    return {
        "session_id": str(session_id),
        "bucket_size": bucket,
        "total": len(rows),
        "data": [dict(r._mapping) for r in rows],
    }


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

    Optimized: uses a single UNION ALL SQL query with DB-side sorting and
    pagination instead of loading all rows into Python memory.
    EEG rows are sampled via TimescaleDB time_bucket (1-second buckets) to avoid
    overwhelming the response with 256-Hz raw data.
    """
    _get_user_session(session_id, current_user, db)

    time_filter_eeg = ""
    time_filter_face = ""
    time_filter_game = ""
    time_filter_alert = ""
    params: dict = {"session_id": str(session_id)}

    if start_time:
        params["start_time"] = start_time
        time_filter_eeg   += " AND timestamp >= :start_time"
        time_filter_face  += " AND timestamp >= :start_time"
        time_filter_game  += " AND timestamp >= :start_time"
        time_filter_alert += " AND timestamp >= :start_time"
    if end_time:
        params["end_time"] = end_time
        time_filter_eeg   += " AND timestamp <= :end_time"
        time_filter_face  += " AND timestamp <= :end_time"
        time_filter_game  += " AND timestamp <= :end_time"
        time_filter_alert += " AND timestamp <= :end_time"

    # Count query (fast — uses indexes)
    count_sql = text(f"""
        SELECT
            (SELECT COUNT(*) FROM eeg_data
             WHERE session_id = :session_id {time_filter_eeg}) +
            (SELECT COUNT(*) FROM face_detection_events
             WHERE session_id = :session_id {time_filter_face}) +
            (SELECT COUNT(*) FROM game_events
             WHERE session_id = :session_id {time_filter_game}) +
            (SELECT COUNT(*) FROM alerts
             WHERE session_id = :session_id {time_filter_alert})
        AS total
    """)
    total = db.execute(count_sql, params).scalar() or 0

    offset = (page - 1) * page_size

    # Unified UNION ALL — DB sorts & paginates; EEG sampled to 1-second buckets
    data_sql = text(f"""
        (
            SELECT
                'eeg'                       AS type,
                time_bucket('1 second', timestamp) AS timestamp,
                jsonb_build_object(
                    'theta_alpha_ratio', AVG(theta_alpha_ratio),
                    'signal_quality',    AVG(signal_quality),
                    'cognitive_state',   MAX(cognitive_state),
                    'eeg_fatigue_score', AVG(eeg_fatigue_score)
                ) AS data
            FROM eeg_data
            WHERE session_id = :session_id {time_filter_eeg}
            GROUP BY time_bucket('1 second', timestamp)
        )
        UNION ALL
        (
            SELECT
                'face'                      AS type,
                timestamp,
                jsonb_build_object(
                    'id',                id,
                    'eyes_closed',       eyes_closed,
                    'yawning',           yawning,
                    'blink_rate',        blink_rate,
                    'face_fatigue_score', face_fatigue_score
                ) AS data
            FROM face_detection_events
            WHERE session_id = :session_id {time_filter_face}
        )
        UNION ALL
        (
            SELECT
                'game'                      AS type,
                timestamp,
                jsonb_build_object(
                    'id',             id,
                    'event_type',     event_type,
                    'speed',          speed,
                    'lane_deviation', lane_deviation
                ) AS data
            FROM game_events
            WHERE session_id = :session_id {time_filter_game}
        )
        UNION ALL
        (
            SELECT
                'alert'                     AS type,
                timestamp,
                jsonb_build_object(
                    'id',             id,
                    'alert_level',    alert_level,
                    'fatigue_score',  fatigue_score,
                    'trigger_reason', trigger_reason,
                    'acknowledged',   acknowledged
                ) AS data
            FROM alerts
            WHERE session_id = :session_id {time_filter_alert}
        )
        ORDER BY timestamp ASC
        LIMIT :limit OFFSET :offset
    """)

    params["limit"] = page_size
    params["offset"] = offset

    rows = db.execute(data_sql, params).fetchall()

    events = [
        TimelineEvent(type=r.type, timestamp=r.timestamp, data=r.data)
        for r in rows
    ]

    return TimelineResponse(
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
        events=events,
    )
