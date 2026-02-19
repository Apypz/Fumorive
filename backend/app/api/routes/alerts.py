"""
Alert Management Routes
CRUD endpoints for fatigue alerts
Week 4, Monday - Alerting System API
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.db.database import get_db
from app.db.models import Alert, Session as DBSession, User
from app.schemas.eeg import AlertData, AlertResponse, AlertUpdate, AlertList
from app.api.dependencies import get_current_user
from app.core.rate_limiter import limiter, LIMIT_READ, LIMIT_WRITE

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=AlertList)
@limiter.limit(LIMIT_READ)
async def list_alerts(
    request: Request,
    session_id: Optional[UUID] = Query(None, description="Filter by session ID"),
    alert_level: Optional[str] = Query(None, pattern="^(warning|critical)$", description="Filter by alert level"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment status"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all alerts with optional filtering
    
    **Query Parameters:**
    - session_id: Filter by specific session
    - alert_level: Filter by warning/critical
    - acknowledged: Filter by acknowledgment status
    - start_date, end_date: Date range filtering
    - limit, offset: Pagination
    
    **Returns:**
    - Paginated list of alerts with total count
    """
    # Build query with filters — scope by user unless admin/researcher
    query = db.query(Alert)
    if current_user.role not in ("admin", "researcher"):
        query = query.join(DBSession, Alert.session_id == DBSession.id).filter(
            DBSession.user_id == current_user.id
        )
    # Apply filters
    if session_id:
        query = query.filter(Alert.session_id == session_id)
    
    if alert_level:
        query = query.filter(Alert.alert_level == alert_level)
    
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    
    if start_date:
        query = query.filter(Alert.timestamp >= start_date)
    
    if end_date:
        query = query.filter(Alert.timestamp <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply sorting (most recent first)
    query = query.order_by(Alert.timestamp.desc())
    
    # Apply pagination
    alerts = query.limit(limit).offset(offset).all()
    
    return AlertList(
        total=total,
        limit=limit,
        offset=offset,
        alerts=alerts
    )


@router.get("/{alert_id}", response_model=AlertResponse)
@limiter.limit(LIMIT_READ)
async def get_alert(
    request: Request,
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get specific alert by ID
    
    **Path Parameters:**
    - alert_id: Alert ID (integer)
    
    **Returns:**
    - Alert details
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    # Verify ownership unless admin/researcher
    if current_user.role not in ("admin", "researcher"):
        session = db.query(DBSession).filter(DBSession.id == alert.session_id).first()
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return alert


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(LIMIT_WRITE)
async def create_alert(
    request: Request,
    alert_data: AlertData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create new fatigue alert
    
    **Request Body:**
    - session_id: UUID of session
    - timestamp: Alert timestamp
    - alert_level: warning or critical
    - fatigue_score: Combined fatigue score (0-100)
    - eeg_contribution: EEG weight (default 0.6)
    - face_contribution: Face weight (default 0.4)
    - trigger_reason: Reason for alert
    
    **Returns:**
    - Created alert with ID
    """
    # Verify session exists and belongs to user
    session = db.query(DBSession).filter(DBSession.id == alert_data.session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {alert_data.session_id} not found"
        )
    if current_user.role not in ("admin", "researcher") and session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Create alert
    alert = Alert(
        session_id=alert_data.session_id,
        timestamp=alert_data.timestamp,
        alert_level=alert_data.alert_level,
        fatigue_score=alert_data.fatigue_score,
        eeg_contribution=alert_data.eeg_contribution,
        face_contribution=alert_data.face_contribution,
        trigger_reason=alert_data.trigger_reason,
        acknowledged=False
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    # Update session alert count
    session.alert_count = (session.alert_count or 0) + 1
    db.commit()
    
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
@limiter.limit(LIMIT_WRITE)
async def update_alert(
    request: Request,
    alert_id: int,
    update_data: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update alert (acknowledge/dismiss)
    
    **Path Parameters:**
    - alert_id: Alert ID
    
    **Request Body:**
    - acknowledged: Mark as acknowledged (optional)
    - trigger_reason: Update trigger reason (optional)
    
    **Returns:**
    - Updated alert
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )
    
    # Verify ownership
    if current_user.role not in ("admin", "researcher"):
        session = db.query(DBSession).filter(DBSession.id == alert.session_id).first()
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Update fields
    if update_data.acknowledged is not None:
        alert.acknowledged = update_data.acknowledged
    
    if update_data.trigger_reason is not None:
        alert.trigger_reason = update_data.trigger_reason
    
    db.commit()
    db.refresh(alert)
    
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(LIMIT_WRITE)
async def delete_alert(
    request: Request,
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete alert
    
    **Path Parameters:**
    - alert_id: Alert ID
    
    **Returns:**
    - 204 No Content on success
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    # Verify ownership
    if current_user.role not in ("admin", "researcher"):
        session = db.query(DBSession).filter(DBSession.id == alert.session_id).first()
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    db.delete(alert)
    db.commit()
    
    return None


@router.get("/session/{session_id}/summary")
@limiter.limit(LIMIT_READ)
async def get_session_alert_summary(
    request: Request,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get alert summary for a session
    
    **Path Parameters:**
    - session_id: Session UUID
    
    **Returns:**
    - Alert statistics (total, warning, critical, acknowledged)
    """
    # Verify session exists
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Count alerts by type
    total_alerts = db.query(Alert).filter(Alert.session_id == session_id).count()
    warning_alerts = db.query(Alert).filter(
        and_(Alert.session_id == session_id, Alert.alert_level == "warning")
    ).count()
    critical_alerts = db.query(Alert).filter(
        and_(Alert.session_id == session_id, Alert.alert_level == "critical")
    ).count()
    acknowledged_alerts = db.query(Alert).filter(
        and_(Alert.session_id == session_id, Alert.acknowledged == True)
    ).count()
    
    return {
        "session_id": str(session_id),
        "total_alerts": total_alerts,
        "warning_alerts": warning_alerts,
        "critical_alerts": critical_alerts,
        "acknowledged_alerts": acknowledged_alerts,
        "unacknowledged_alerts": total_alerts - acknowledged_alerts
    }
