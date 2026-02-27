"""
Face Detection Routes
API endpoints for logging face detection events and statistics
Week 3, Wednesday - Face Detection Event Logging
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from uuid import UUID
from datetime import datetime
from typing import List, Optional

from app.db.database import get_db
from app.db.models import FaceDetectionEvent, Session as DBSession
from app.schemas.eeg import FaceDetectionData
from app.api.dependencies import get_current_active_user
from pydantic import BaseModel, Field

router = APIRouter(prefix="/face", tags=["Face Detection"])


# ============================================
# REQUEST/RESPONSE SCHEMAS
# ============================================

class FaceEventCreate(BaseModel):
    """Schema for creating a face detection event"""
    session_id: UUID
    timestamp: datetime
    eye_aspect_ratio: Optional[float] = Field(None, ge=0, le=1)
    mouth_aspect_ratio: Optional[float] = Field(None, ge=0)
    eyes_closed: bool = False
    yawning: bool = False
    blink_count: int = Field(default=0, ge=0)
    blink_rate: Optional[float] = Field(None, ge=0)
    head_yaw: Optional[float] = None
    head_pitch: Optional[float] = None
    head_roll: Optional[float] = None
    face_fatigue_score: Optional[float] = Field(None, ge=0, le=100)


class FaceEventBatch(BaseModel):
    """Schema for batch face detection events"""
    session_id: UUID
    events: List[FaceDetectionData]


class FaceEventResponse(BaseModel):
    """Response for single face event"""
    id: int
    session_id: UUID
    timestamp: datetime
    created: bool = True
    
    class Config:
        from_attributes = True


class FaceStatsResponse(BaseModel):
    """Aggregate statistics for face detection"""
    session_id: UUID
    total_events: int
    duration_seconds: Optional[float]
    avg_blink_rate: Optional[float]
    total_blinks: Optional[int]
    eyes_closed_count: int
    eyes_closed_percentage: Optional[float]
    yawn_count: int
    avg_fatigue_score: Optional[float]
    max_fatigue_score: Optional[float]
    head_movement: dict


# ============================================
# ENDPOINTS
# ============================================

@router.post("/events", response_model=FaceEventResponse, status_code=201)
async def log_face_event(
    event: FaceEventCreate,
    db: Session = Depends(get_db)
):
    """
    Log a single face detection event
    
    - **session_id**: Active session ID
    - **timestamp**: Event timestamp (ISO format)
    - **eye_aspect_ratio**: EAR value (0-1)
    - **blink_rate**: Blinks per minute
    - **face_fatigue_score**: Fatigue score (0-100)
    """
    # Verify session exists
    session = db.query(DBSession).filter(DBSession.id == event.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create face detection event
    face_event = FaceDetectionEvent(
        session_id=event.session_id,
        timestamp=event.timestamp,
        eye_aspect_ratio=event.eye_aspect_ratio,
        mouth_aspect_ratio=event.mouth_aspect_ratio,
        eyes_closed=event.eyes_closed,
        yawning=event.yawning,
        blink_count=event.blink_count,
        blink_rate=event.blink_rate,
        head_yaw=event.head_yaw,
        head_pitch=event.head_pitch,
        head_roll=event.head_roll,
        face_fatigue_score=event.face_fatigue_score
    )
    
    db.add(face_event)
    db.commit()
    db.refresh(face_event)
    
    return FaceEventResponse(
        id=face_event.id,
        session_id=face_event.session_id,
        timestamp=face_event.timestamp,
        created=True
    )


@router.post("/events/batch")
async def log_face_events_batch(
    batch: FaceEventBatch,
    db: Session = Depends(get_db)
):
    """
    Log multiple face detection events in batch
    
    More efficient for high-frequency data (~30 FPS from MediaPipe)
    """
    # Verify session exists
    session = db.query(DBSession).filter(DBSession.id == batch.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Create face events
    face_events = []
    for event in batch.events:
        face_event = FaceDetectionEvent(
            session_id=batch.session_id,
            timestamp=event.timestamp,
            eye_aspect_ratio=event.eye_aspect_ratio,
            mouth_aspect_ratio=event.mouth_aspect_ratio,
            eyes_closed=event.eyes_closed,
            yawning=event.yawning,
            blink_count=event.blink_count,
            blink_rate=event.blink_rate,
            head_yaw=event.head_yaw,
            head_pitch=event.head_pitch,
            head_roll=event.head_roll,
            face_fatigue_score=event.face_fatigue_score
        )
        face_events.append(face_event)
    
    # Bulk insert for performance
    db.bulk_save_objects(face_events)
    db.commit()
    
    return {
        "status": "success",
        "session_id": str(batch.session_id),
        "events_inserted": len(face_events)
    }


@router.get("/events")
async def get_face_events(
    session_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get face detection event history for a session (paginated)
    
    - **session_id**: Session ID to query
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Max records to return (1-100, default 20)
    """
    # Get events
    events = db.query(FaceDetectionEvent)\
        .filter(FaceDetectionEvent.session_id == session_id)\
        .order_by(FaceDetectionEvent.timestamp.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    # Get total count
    total = db.query(func.count(FaceDetectionEvent.id))\
        .filter(FaceDetectionEvent.session_id == session_id)\
        .scalar()
    
    return {
        "session_id": str(session_id),
        "total": total,
        "skip": skip,
        "limit": limit,
        "events": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "eye_aspect_ratio": e.eye_aspect_ratio,
                "eyes_closed": e.eyes_closed,
                "yawning": e.yawning,
                "blink_rate": e.blink_rate,
                "face_fatigue_score": e.face_fatigue_score
            }
            for e in events
        ]
    }


@router.get("/stats/{session_id}", response_model=FaceStatsResponse)
async def get_face_statistics(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get aggregate face detection statistics for a session
    
    Returns:
    - Total events and duration
    - Average blink rate and total blinks
    - Eyes closed duration and percentage
    - Yawn count
    - Average and max fatigue scores
    - Head movement analytics
    """
    # Verify session exists
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get aggregate statistics
    stats = db.query(
        func.count(FaceDetectionEvent.id).label('total_events'),
        func.avg(FaceDetectionEvent.blink_rate).label('avg_blink_rate'),
        func.max(FaceDetectionEvent.blink_count).label('max_blink_count'),
        func.count(FaceDetectionEvent.id).filter(
            FaceDetectionEvent.eyes_closed == True
        ).label('eyes_closed_count'),
        func.count(FaceDetectionEvent.id).filter(
            FaceDetectionEvent.yawning == True
        ).label('yawn_count'),
        func.avg(FaceDetectionEvent.face_fatigue_score).label('avg_fatigue'),
        func.max(FaceDetectionEvent.face_fatigue_score).label('max_fatigue'),
        func.avg(FaceDetectionEvent.head_yaw).label('avg_yaw'),
        func.avg(FaceDetectionEvent.head_pitch).label('avg_pitch'),
        func.avg(FaceDetectionEvent.head_roll).label('avg_roll'),
        func.min(FaceDetectionEvent.timestamp).label('first_timestamp'),
        func.max(FaceDetectionEvent.timestamp).label('last_timestamp')
    ).filter(FaceDetectionEvent.session_id == session_id).first()
    
    # Calculate duration
    duration = None
    if stats.first_timestamp and stats.last_timestamp:
        duration = (stats.last_timestamp - stats.first_timestamp).total_seconds()
    
    # Calculate eyes closed percentage
    eyes_closed_pct = None
    if stats.total_events > 0:
        eyes_closed_pct = (stats.eyes_closed_count / stats.total_events) * 100
    
    return FaceStatsResponse(
        session_id=session_id,
        total_events=stats.total_events or 0,
        duration_seconds=duration,
        avg_blink_rate=round(stats.avg_blink_rate, 2) if stats.avg_blink_rate else None,
        total_blinks=stats.max_blink_count or 0,
        eyes_closed_count=stats.eyes_closed_count or 0,
        eyes_closed_percentage=round(eyes_closed_pct, 2) if eyes_closed_pct else None,
        yawn_count=stats.yawn_count or 0,
        avg_fatigue_score=round(stats.avg_fatigue, 2) if stats.avg_fatigue else None,
        max_fatigue_score=round(stats.max_fatigue, 2) if stats.max_fatigue else None,
        head_movement={
            "avg_yaw": round(stats.avg_yaw, 3) if stats.avg_yaw else 0,
            "avg_pitch": round(stats.avg_pitch, 3) if stats.avg_pitch else 0,
            "avg_roll": round(stats.avg_roll, 3) if stats.avg_roll else 0
        }
    )


@router.get("/realtime/{session_id}")
async def get_latest_face_detection(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get the most recent face detection event for a session
    
    Useful for real-time monitoring dashboards
    """
    latest = db.query(FaceDetectionEvent)\
        .filter(FaceDetectionEvent.session_id == session_id)\
        .order_by(FaceDetectionEvent.timestamp.desc())\
        .first()
    
    if not latest:
        raise HTTPException(status_code=404, detail="No face detection events found for this session")
    
    return {
        "session_id": str(session_id),
        "timestamp": latest.timestamp.isoformat(),
        "eye_aspect_ratio": latest.eye_aspect_ratio,
        "eyes_closed": latest.eyes_closed,
        "yawning": latest.yawning,
        "blink_rate": latest.blink_rate,
        "face_fatigue_score": latest.face_fatigue_score,
        "head_pose": {
            "yaw": latest.head_yaw,
            "pitch": latest.head_pitch,
            "roll": latest.head_roll
        }
    }
