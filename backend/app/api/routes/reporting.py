"""
Reporting API Routes
Aggregated statistics for dashboard reporting and analytics.
Week 6, Wednesday - Reporting API & Data Aggregation

Endpoints:
  GET /reports/summary          — overall system stats (admin)
  GET /reports/sessions         — user session statistics
  GET /reports/sessions/{id}    — per-session deep stats
  GET /reports/fatigue-trend    — fatigue score trend over time
  GET /reports/alerts           — alert breakdown / frequency
"""

import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.db.database import get_db
from app.db.models import User, Session as DBSession, EEGData, FaceDetectionEvent, Alert
from app.api.dependencies import get_current_user, require_researcher_or_admin
from app.core.rate_limiter import limiter, LIMIT_EXPORT
from app.core.redis import get_redis

logger = logging.getLogger("fumorive.reporting")

router = APIRouter(prefix="/reports", tags=["Reports"])

_REPORT_CACHE_TTL = 300  # 5 minutes — safe for aggregate stats


def _get_cached(cache_key: str):
    """Return cached JSON value or None."""
    r = get_redis()
    if not r:
        return None
    try:
        raw = r.get(cache_key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def _set_cached(cache_key: str, value: dict, ttl: int = _REPORT_CACHE_TTL) -> None:
    """Persist JSON value to Redis with a TTL."""
    r = get_redis()
    if not r:
        return
    try:
        r.setex(cache_key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


# ----------------------------------------------
# HELPERS
# ----------------------------------------------

def _session_base_query(db: Session, user: User):
    """Return a query scoped to the current user (admin sees all)."""
    q = db.query(DBSession)
    if user.role not in ("admin", "researcher"):
        q = q.filter(DBSession.user_id == user.id)
    return q


# ----------------------------------------------
# 1. SESSION STATISTICS
# ----------------------------------------------

@router.get("/sessions", summary="Session statistics for current user")
@limiter.limit(LIMIT_EXPORT)
async def session_statistics(
    request: Request,                        # required by slowapi
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
):
    """
    Aggregated session stats for the authenticated user
    (researcher/admin see all users).

    Returns counts, average durations, fatigue scores, and alert totals.
    Results are cached for 5 minutes per user + days combination.
    """
    cache_key = f"report:sessions:{current_user.id}:{days}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = _session_base_query(db, current_user).filter(DBSession.started_at >= since)

    rows = q.with_entities(
        func.count(DBSession.id).label("total_sessions"),
        func.count(DBSession.id).filter(DBSession.session_status == "completed").label("completed"),
        func.count(DBSession.id).filter(DBSession.session_status == "active").label("active"),
        func.count(DBSession.id).filter(DBSession.session_status == "failed").label("failed"),
        func.avg(DBSession.duration_seconds).label("avg_duration_s"),
        func.sum(DBSession.duration_seconds).label("total_duration_s"),
        func.avg(DBSession.avg_fatigue_score).label("avg_fatigue"),
        func.max(DBSession.max_fatigue_score).label("peak_fatigue"),
        func.sum(DBSession.alert_count).label("total_alerts"),
    ).one()

    result = {
        "period_days": days,
        "sessions": {
            "total":     rows.total_sessions or 0,
            "completed": rows.completed or 0,
            "active":    rows.active or 0,
            "failed":    rows.failed or 0,
        },
        "duration": {
            "avg_seconds":   round(rows.avg_duration_s or 0, 1),
            "total_seconds": rows.total_duration_s or 0,
            "avg_minutes":   round((rows.avg_duration_s or 0) / 60, 1),
        },
        "fatigue": {
            "avg_score":  round(rows.avg_fatigue or 0, 2),
            "peak_score": round(rows.peak_fatigue or 0, 2),
        },
        "alerts": {
            "total": rows.total_alerts or 0,
        },
    }

    _set_cached(cache_key, result)
    return result


# ----------------------------------------------
# 2. PER-SESSION DEEP STATS
# ----------------------------------------------

@router.get("/sessions/{session_id}", summary="Deep stats for a single session")
@limiter.limit(LIMIT_EXPORT)
async def session_detail_report(
    request: Request,
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Detailed statistics for a single session:
    - EEG band power averages
    - Face event counts (blinks, yawns, eye closures)
    - Alert timeline summary
    - Fatigue score distribution (bucketed into 10-point ranges)
    """
    session = _session_base_query(db, current_user).filter(DBSession.id == session_id).first()
    if not session:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # EEG aggregates — use continuous aggregate if available, else raw
    eeg_row = db.execute(text("""
        SELECT
            AVG(avg_delta)              AS avg_delta,
            AVG(avg_theta)              AS avg_theta,
            AVG(avg_alpha)              AS avg_alpha,
            AVG(avg_beta)               AS avg_beta,
            AVG(avg_gamma)              AS avg_gamma,
            AVG(avg_theta_alpha_ratio)  AS avg_theta_alpha_ratio,
            AVG(avg_fatigue_score)      AS avg_eeg_fatigue,
            AVG(avg_signal_quality)     AS avg_signal_quality,
            SUM(sample_count)           AS total_samples
        FROM eeg_1min_agg
        WHERE session_id = :sid
    """), {"sid": str(session_id)}).one()

    # Face event aggregates
    face_row = db.query(
        func.count(FaceDetectionEvent.id).label("total_events"),
        func.count(FaceDetectionEvent.id).filter(FaceDetectionEvent.eyes_closed == True).label("eyes_closed_count"),
        func.count(FaceDetectionEvent.id).filter(FaceDetectionEvent.yawning == True).label("yawn_count"),
        func.avg(FaceDetectionEvent.blink_rate).label("avg_blink_rate"),
        func.avg(FaceDetectionEvent.face_fatigue_score).label("avg_face_fatigue"),
    ).filter(FaceDetectionEvent.session_id == session_id).one()

    # Alert breakdown
    alert_rows = db.query(
        Alert.alert_level,
        func.count(Alert.id).label("count"),
    ).filter(Alert.session_id == session_id).group_by(Alert.alert_level).all()

    alert_breakdown = {row.alert_level: row.count for row in alert_rows}

    # Fatigue score distribution (buckets: 0-9, 10-19, ..., 90-100)
    dist_rows = db.execute(text("""
        SELECT
            width_bucket(avg_fatigue_score, 0, 101, 10) - 1 AS bucket,
            COUNT(*) AS cnt
        FROM eeg_1min_agg
        WHERE session_id = :sid AND avg_fatigue_score IS NOT NULL
        GROUP BY bucket
        ORDER BY bucket
    """), {"sid": str(session_id)}).fetchall()

    distribution = {f"{b * 10}-{b * 10 + 9}": int(c) for b, c in dist_rows if b is not None}

    return {
        "session_id":   str(session_id),
        "session_name": session.session_name,
        "status":       session.session_status,
        "started_at":   session.started_at.isoformat() if session.started_at else None,
        "ended_at":     session.ended_at.isoformat() if session.ended_at else None,
        "duration_s":   session.duration_seconds,
        "eeg": {
            "avg_delta":            round(eeg_row.avg_delta or 0, 4),
            "avg_theta":            round(eeg_row.avg_theta or 0, 4),
            "avg_alpha":            round(eeg_row.avg_alpha or 0, 4),
            "avg_beta":             round(eeg_row.avg_beta or 0, 4),
            "avg_gamma":            round(eeg_row.avg_gamma or 0, 4),
            "avg_theta_alpha_ratio":round(eeg_row.avg_theta_alpha_ratio or 0, 4),
            "avg_fatigue_score":    round(eeg_row.avg_eeg_fatigue or 0, 2),
            "avg_signal_quality":   round(eeg_row.avg_signal_quality or 0, 3),
            "total_samples":        int(eeg_row.total_samples or 0),
        },
        "face": {
            "total_events":     face_row.total_events or 0,
            "eyes_closed_count": face_row.eyes_closed_count or 0,
            "yawn_count":       face_row.yawn_count or 0,
            "avg_blink_rate":   round(face_row.avg_blink_rate or 0, 2),
            "avg_fatigue_score": round(face_row.avg_face_fatigue or 0, 2),
        },
        "alerts": {
            "total":     sum(alert_breakdown.values()),
            "breakdown": alert_breakdown,
        },
        "fatigue_distribution": distribution,
    }


# ----------------------------------------------
# 3. FATIGUE TREND (time-series for charts)
# ----------------------------------------------

@router.get("/fatigue-trend", summary="Fatigue score trend over time")
@limiter.limit(LIMIT_EXPORT)
async def fatigue_trend(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    bucket: str = Query("1 day", regex=r"^(1 hour|6 hours|1 day|1 week)$",
                        description="Time bucket size"),
):
    """
    Average daily (or hourly) fatigue scores aggregated across all user sessions.
    Useful for rendering a trend chart on the dashboard.
    Results are cached for 5 minutes per user + parameters combination.
    """
    cache_key = f"report:fatigue:{current_user.id}:{days}:{bucket}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Join eeg_1min_agg → sessions to scope by user
    scope_filter = "" if current_user.role in ("admin", "researcher") else \
        "AND s.user_id = :user_id"

    rows = db.execute(text(f"""
        SELECT
            time_bucket(:bucket, a.bucket)  AS period,
            AVG(a.avg_fatigue_score)        AS avg_fatigue,
            AVG(a.avg_theta_alpha_ratio)    AS avg_theta_alpha,
            COUNT(DISTINCT a.session_id)    AS session_count
        FROM eeg_1min_agg a
        JOIN sessions s ON s.id = a.session_id
        WHERE a.bucket >= :since
          {scope_filter}
        GROUP BY period
        ORDER BY period ASC
    """), {
        "bucket":  bucket,
        "since":   since,
        "user_id": str(current_user.id),
    }).fetchall()

    result = {
        "period_days": days,
        "bucket_size": bucket,
        "data": [
            {
                "period":           row.period.isoformat(),
                "avg_fatigue":      round(row.avg_fatigue or 0, 2),
                "avg_theta_alpha":  round(row.avg_theta_alpha or 0, 4),
                "session_count":    row.session_count,
            }
            for row in rows
        ],
    }

    _set_cached(cache_key, result)
    return result


# ----------------------------------------------
# 4. ALERT REPORT
# ----------------------------------------------

@router.get("/alerts", summary="Alert frequency and breakdown report")
@limiter.limit(LIMIT_EXPORT)
async def alert_report(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """
    Alert statistics — counts by level, top trigger reasons, and daily frequency.
    Results are cached for 5 minutes per user + days combination.
    """
    cache_key = f"report:alerts:{current_user.id}:{days}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    since = datetime.now(timezone.utc) - timedelta(days=days)

    scope_filter = "" if current_user.role in ("admin", "researcher") else \
        "AND s.user_id = :user_id"

    # By level
    level_rows = db.execute(text(f"""
        SELECT a.alert_level, COUNT(*) AS cnt
        FROM alerts a
        JOIN sessions s ON s.id = a.session_id
        WHERE a.timestamp >= :since {scope_filter}
        GROUP BY a.alert_level
        ORDER BY cnt DESC
    """), {"since": since, "user_id": str(current_user.id)}).fetchall()

    # Top trigger reasons (max 10)
    reason_rows = db.execute(text(f"""
        SELECT a.trigger_reason, COUNT(*) AS cnt
        FROM alerts a
        JOIN sessions s ON s.id = a.session_id
        WHERE a.timestamp >= :since {scope_filter}
        GROUP BY a.trigger_reason
        ORDER BY cnt DESC
        LIMIT 10
    """), {"since": since, "user_id": str(current_user.id)}).fetchall()

    # Daily alert counts using TimescaleDB time_bucket
    daily_rows = db.execute(text(f"""
        SELECT
            time_bucket('1 day', a.timestamp) AS day,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE a.alert_level = 'warning')  AS warnings,
            COUNT(*) FILTER (WHERE a.alert_level = 'critical') AS criticals
        FROM alerts a
        JOIN sessions s ON s.id = a.session_id
        WHERE a.timestamp >= :since {scope_filter}
        GROUP BY day
        ORDER BY day ASC
    """), {"since": since, "user_id": str(current_user.id)}).fetchall()

    alert_result = {
        "period_days": days,
        "by_level": {row.alert_level: row.cnt for row in level_rows},
        "top_triggers": [
            {"reason": row.trigger_reason, "count": row.cnt}
            for row in reason_rows
        ],
        "daily": [
            {
                "date":      row.day.strftime("%Y-%m-%d"),
                "total":     row.total,
                "warnings":  row.warnings,
                "criticals": row.criticals,
            }
            for row in daily_rows
        ],
    }

    _set_cached(cache_key, alert_result)
    return alert_result


# ----------------------------------------------
# 5. SYSTEM SUMMARY (admin / researcher only)
# ----------------------------------------------

@router.get(
    "/summary",
    summary="Overall system statistics (admin/researcher only)",
    dependencies=[Depends(require_researcher_or_admin)],
)
@limiter.limit(LIMIT_EXPORT)
async def system_summary(
    request: Request,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """
    High-level system-wide statistics:
    - Total users, sessions, EEG samples
    - Average fatigue across all sessions
    - Alert rate per session
    """
    rows = db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM users)                        AS total_users,
            (SELECT COUNT(*) FROM sessions)                     AS total_sessions,
            (SELECT COUNT(*) FROM sessions
             WHERE session_status = 'completed')                AS completed_sessions,
            (SELECT COALESCE(SUM(sample_count), 0)
             FROM eeg_1min_agg)                                 AS total_eeg_samples,
            (SELECT AVG(avg_fatigue_score)
             FROM sessions WHERE avg_fatigue_score IS NOT NULL) AS global_avg_fatigue,
            (SELECT COUNT(*) FROM alerts)                       AS total_alerts
    """)).one()

    return {
        "users":            {"total": rows.total_users},
        "sessions": {
            "total":        rows.total_sessions,
            "completed":    rows.completed_sessions,
        },
        "eeg": {
            "total_samples": int(rows.total_eeg_samples or 0),
        },
        "fatigue": {
            "global_avg": round(rows.global_avg_fatigue or 0, 2),
        },
        "alerts": {
            "total": rows.total_alerts,
            "per_session": round(
                (rows.total_alerts / rows.completed_sessions)
                if rows.completed_sessions else 0, 2
            ),
        },
    }

