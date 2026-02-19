"""
Health Check & Readiness Endpoints
Production-grade health checks for load balancers and monitoring.
Week 5, Friday - Health Checks & Monitoring

Endpoints:
  GET /health        — overall summary (for humans / dashboards)
  GET /health/live   — liveness: is the process alive? (K8s livenessProbe)
  GET /health/ready  — readiness: can the process serve traffic? (K8s readinessProbe)
"""

import logging
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.db.database import get_db
from app.core.redis import get_redis, redis_health_check
from app.core.cache import get_cache_stats
from app.core.metrics import app_metrics

logger = logging.getLogger("fumorive.health")

router = APIRouter(prefix="/health", tags=["Health"])

# Record process start time for uptime calculation
_PROCESS_START = time.time()


# ============================================
# HELPERS
# ============================================

def _check_database() -> dict:
    """Run a lightweight DB ping and return status dict."""
    try:
        db_gen = get_db()
        db = next(db_gen)
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok"}
    except Exception as e:
        logger.error("DB health check failed", extra={"error": str(e)})
        return {"status": "error", "detail": str(e)}


def _check_redis() -> dict:
    """Ping Redis and return status dict."""
    r = get_redis()
    if r is None:
        return {"status": "unavailable", "detail": "client not initialized"}
    try:
        r.ping()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


def _get_system_info() -> dict:
    """Return lightweight system metrics (no heavy psutil dependency)."""
    try:
        import psutil  # optional — only used if installed
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        return {
            "memory_used_pct": round(mem.percent, 1),
            "disk_used_pct":   round(disk.percent, 1),
            "cpu_count":       psutil.cpu_count(),
        }
    except ImportError:
        return {"note": "install psutil for system metrics"}


# ============================================
# ENDPOINTS
# ============================================

@router.get(
    "/live",
    summary="Liveness probe",
    description="Returns 200 as long as the Python process is alive. "
                "Use as K8s livenessProbe.",
)
async def liveness():
    """
    Liveness — is the process running?

    Only fails if the process itself is broken (OOM, deadlock etc.).
    Never checks external dependencies here.
    """
    return {
        "status": "alive",
        "uptime_seconds": round(time.time() - _PROCESS_START, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/ready",
    summary="Readiness probe",
    description="Returns 200 only when the service can serve traffic "
                "(DB reachable). Use as K8s readinessProbe.",
)
async def readiness(response: Response):
    """
    Readiness — can we accept traffic?

    Checks:
    - Database connectivity (required — returns 503 if down)
    - Redis connectivity (optional — degraded 200 if down)
    """
    db_status    = _check_database()
    redis_status = _check_redis()

    db_ok   = db_status["status"] == "ok"
    redis_ok = redis_status["status"] == "ok"

    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall = "not_ready"
    elif not redis_ok:
        overall = "degraded"  # Still ready, just without cache
    else:
        overall = "ready"

    return {
        "status": overall,
        "checks": {
            "database": db_status,
            "redis":    redis_status,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/metrics",
    summary="Application performance metrics",
    description="In-process metrics: request counts, error rates, response-time "
                "percentiles from a rolling window of the last 1 000 requests. "
                "Lightweight alternative to Prometheus for quick health checks.",
)
async def app_level_metrics():
    """
    Return in-process performance counters and response-time percentiles.

    Metrics are computed from a rolling window of up to 1 000 recent requests
    held in memory — no external dependencies required.

    Fields:
    - `total_requests`       — all requests served since process start
    - `error_rate`           — 4xx / 5xx counts and percentages
    - `slow_requests`        — requests that exceeded 500 ms
    - `response_time_ms`     — mean, P50, P95, P99 latencies
    - `throughput`           — approximate requests-per-second
    - `top_paths`            — top 10 most-hit endpoints
    """
    return app_metrics.snapshot()


@router.get(
    "",
    summary="Full health summary",
    description="Detailed health report including cache stats, system info, "
                "and service versions. Intended for dashboards and humans.",
)
async def health_summary(response: Response):
    """
    Full health — everything in one call.

    Returns 200 if DB is reachable (Redis degraded is tolerated).
    Returns 503 if DB is down.
    """
    db_status    = _check_database()
    redis_status = _check_redis()
    cache_stats  = get_cache_stats()
    system_info  = _get_system_info()

    db_ok = db_status["status"] == "ok"

    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        overall = "unhealthy"
    elif redis_status["status"] != "ok":
        overall = "degraded"
    else:
        overall = "healthy"

    return {
        "status":          overall,
        "service":         "fumorive-backend",
        "version":         "1.0.0",
        "environment":     os.getenv("ENVIRONMENT", "development"),
        "uptime_seconds":  round(time.time() - _PROCESS_START, 1),
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": db_status,
            "redis":    redis_status,
        },
        "cache":  cache_stats,
        "system": system_info,
    }
