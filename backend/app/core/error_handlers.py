"""
Global Exception Handlers & Structured Logging Utilities
Registers FastAPI exception handlers for all Fumorive domain exceptions.
Week 5, Thursday - Enhanced Error Handling
"""

import logging
import traceback
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import FumoriveException

logger = logging.getLogger("fumorive.errors")


# ============================================
# STANDARD ERROR RESPONSE SHAPE
# ============================================

def _error_response(
    status_code: int,
    error_code: str,
    message: str,
    request_id: str | None = None,
    detail: Any = None,
) -> JSONResponse:
    """
    Build a consistent JSON error envelope:

    {
        "error": {
            "code":       "SESSION_NOT_FOUND",
            "message":    "Session not found.",
            "detail":     null,          # only in non-production
            "request_id": "abc12345"
        }
    }
    """
    body: dict[str, Any] = {
        "error": {
            "code": error_code,
            "message": message,
            "request_id": request_id,
        }
    }
    if detail is not None:
        body["error"]["detail"] = detail

    return JSONResponse(status_code=status_code, content=body)


def _get_request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


# ============================================
# HANDLERS
# ============================================

async def fumorive_exception_handler(
    request: Request, exc: FumoriveException
) -> JSONResponse:
    """Handle all Fumorive domain exceptions."""
    request_id = _get_request_id(request)
    logger.warning(
        "Domain exception",
        extra={
            "request_id": request_id,
            "error_code": exc.error_code,
            "message": exc.message,
            "path": str(request.url.path),
            "method": request.method,
        },
    )
    return _error_response(
        status_code=exc.status_code,
        error_code=exc.error_code,
        message=exc.message,
        request_id=request_id,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Convert FastAPI/Starlette HTTPException to the standard envelope."""
    request_id = _get_request_id(request)

    # Map status code → error_code slug
    _code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    error_code = _code_map.get(exc.status_code, f"HTTP_{exc.status_code}")

    logger.warning(
        "HTTP exception",
        extra={
            "request_id": request_id,
            "status_code": exc.status_code,
            "detail": str(exc.detail),
            "path": str(request.url.path),
            "method": request.method,
        },
    )
    return _error_response(
        status_code=exc.status_code,
        error_code=error_code,
        message=str(exc.detail),
        request_id=request_id,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Convert Pydantic v2 validation errors to a flat, readable error list.

    Returns HTTP 422 with:
    {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed.",
            "detail": [{"field": "body.email", "msg": "value is not a valid email address"}]
        }
    }
    """
    request_id = _get_request_id(request)

    errors = [
        {
            "field": ".".join(str(loc) for loc in err["loc"]),
            "msg": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]

    logger.info(
        "Validation error",
        extra={
            "request_id": request_id,
            "errors": errors,
            "path": str(request.url.path),
            "method": request.method,
        },
    )
    return _error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message="Request validation failed.",
        request_id=request_id,
        detail=errors,
    )


async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Catch unhandled SQLAlchemy errors and return 503 without leaking internals."""
    request_id = _get_request_id(request)
    logger.error(
        "Unhandled database error",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "exc": str(exc),
        },
        exc_info=True,
    )
    return _error_response(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        error_code="DB_ERROR",
        message="A database error occurred. Please try again later.",
        request_id=request_id,
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Catch-all for any exception not handled above.
    Logs full traceback; returns generic 500 to the client.
    """
    request_id = _get_request_id(request)
    logger.critical(
        "Unhandled exception",
        extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method,
            "exc_type": type(exc).__name__,
            "traceback": traceback.format_exc(),
        },
    )
    return _error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred.",
        request_id=request_id,
    )


# ============================================
# REGISTRATION HELPER
# ============================================

def register_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers on the FastAPI app.
    Call once in main.py after app creation.
    """
    app.add_exception_handler(FumoriveException, fumorive_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
