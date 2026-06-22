"""
Rate Limiting Configuration
Uses slowapi (Starlette-compatible wrapper around limits library).
Stores counters in Redis when available; falls back to in-memory.
Week 6, Tuesday - Rate Limiting
"""

import logging
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.config import settings

logger = logging.getLogger("fumorive.ratelimit")


# ============================================
# LIMITER INSTANCE
# Keyed by remote IP.  Storage backend is resolved at startup:
#   - Redis present  → persistent counters (survives restarts, multi-worker)
#   - Redis absent   → in-memory (single-worker only)
# ============================================

def _get_redis_storage_uri() -> str:
    """Return Redis URI for slowapi storage, or memory:// as fallback."""
    try:
        from app.core.redis import get_redis
        r = get_redis()
        if r:
            from app.core.config import settings
            return settings.REDIS_URL
    except Exception:
        pass
    return "memory://"


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],   # Global default — applied to every route
    storage_uri=_get_redis_storage_uri(),
    headers_enabled=False,           # Disabled: requires response: Response param in every endpoint
)


# ============================================
# PRESET LIMIT STRINGS
# Values read from Settings (loaded from .env).
#
# Production defaults (safe):
#   LIMIT_AUTH   = 10/minute   (brute-force protection)
#   LIMIT_READ   = 120/minute
#   LIMIT_WRITE  = 30/minute
#   LIMIT_STREAM = 300/minute
#   LIMIT_EXPORT = 10/minute
#
# Override in .env for load testing (all users share one IP):
#   LIMIT_AUTH=60/minute
# ============================================

LIMIT_AUTH   = settings.LIMIT_AUTH
LIMIT_READ   = settings.LIMIT_READ
LIMIT_WRITE  = settings.LIMIT_WRITE
LIMIT_STREAM = settings.LIMIT_STREAM
LIMIT_EXPORT = settings.LIMIT_EXPORT


# ============================================
# CUSTOM 429 HANDLER
# ============================================

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a standard Fumorive error envelope on rate limit hit."""
    request_id = getattr(request.state, "request_id", None)
    logger.warning(
        "Rate limit exceeded",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "limit": str(exc.limit),
            "client": request.client.host if request.client else None,
        },
    )
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMITED",
                "message": f"Too many requests. Limit: {exc.limit}. Please slow down.",
                "request_id": request_id,
            }
        },
        headers={
            "Retry-After": "60",
            "X-RateLimit-Limit": str(exc.limit),
        },
    )
