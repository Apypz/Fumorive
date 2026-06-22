"""
Custom Exception Classes for Fumorive
Centralised domain-specific exceptions so route handlers stay clean.
Week 5, Thursday - Enhanced Error Handling
"""

from fastapi import status


# ============================================
# BASE
# ============================================

class FumoriveException(Exception):
    """
    Base class for all Fumorive domain exceptions.

    Attributes:
        message   Human-readable error description.
        status_code  HTTP status code to return.
        error_code   Machine-readable slug (for client-side i18n / logging).
        detail       Optional extra context (not exposed in production).
    """
    message: str = "An unexpected error occurred."
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str | None = None,
        detail: str | None = None,
    ):
        self.message = message or self.__class__.message
        self.detail = detail
        super().__init__(self.message)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"status={self.status_code}, "
            f"error_code={self.error_code!r}, "
            f"message={self.message!r})"
        )


# ============================================
# AUTHENTICATION & AUTHORISATION
# ============================================

class AuthenticationError(FumoriveException):
    """Invalid or missing credentials."""
    message = "Authentication failed."
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "AUTH_FAILED"


class TokenExpiredError(FumoriveException):
    """JWT token has expired."""
    message = "Token has expired. Please log in again."
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "TOKEN_EXPIRED"


class TokenRevokedError(FumoriveException):
    """JWT token has been blacklisted (logout)."""
    message = "Token has been revoked."
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "TOKEN_REVOKED"


class PermissionDeniedError(FumoriveException):
    """Authenticated but not authorised for this resource."""
    message = "You do not have permission to perform this action."
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "PERMISSION_DENIED"


# ============================================
# RESOURCE ERRORS
# ============================================

class NotFoundError(FumoriveException):
    """Requested resource does not exist."""
    message = "Resource not found."
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"


class ConflictError(FumoriveException):
    """Resource already exists (e.g. duplicate email)."""
    message = "A conflict occurred with an existing resource."
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"


class ValidationError(FumoriveException):
    """Business-logic validation failure (distinct from Pydantic schema errors)."""
    message = "Validation error."
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "VALIDATION_ERROR"


# ============================================
# SESSION DOMAIN
# ============================================

class SessionNotFoundError(NotFoundError):
    message = "Session not found."
    error_code = "SESSION_NOT_FOUND"


class SessionNotActiveError(FumoriveException):
    message = "Session is not active."
    status_code = status.HTTP_409_CONFLICT
    error_code = "SESSION_NOT_ACTIVE"


class SessionAccessDeniedError(PermissionDeniedError):
    message = "You are not authorised to access this session."
    error_code = "SESSION_ACCESS_DENIED"


# ============================================
# USER DOMAIN
# ============================================

class UserNotFoundError(NotFoundError):
    message = "User not found."
    error_code = "USER_NOT_FOUND"


class UserInactiveError(FumoriveException):
    message = "User account is inactive."
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "USER_INACTIVE"


class EmailAlreadyExistsError(ConflictError):
    message = "An account with this email address already exists."
    error_code = "EMAIL_EXISTS"


# ============================================
# INFRASTRUCTURE
# ============================================

class DatabaseError(FumoriveException):
    """Unexpected database error."""
    message = "A database error occurred."
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "DB_ERROR"


class CacheUnavailableError(FumoriveException):
    """Redis not reachable — non-fatal, caller should degrade gracefully."""
    message = "Cache service temporarily unavailable."
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "CACHE_UNAVAILABLE"


class ExternalServiceError(FumoriveException):
    """Third-party service (Firebase, etc.) returned an error."""
    message = "An external service is unavailable."
    status_code = status.HTTP_502_BAD_GATEWAY
    error_code = "EXTERNAL_SERVICE_ERROR"


# ============================================
# EEG / DATA DOMAIN
# ============================================

class EEGDataError(FumoriveException):
    """Invalid or unprocessable EEG data."""
    message = "EEG data error."
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "EEG_DATA_ERROR"


class RateLimitError(FumoriveException):
    """Too many requests."""
    message = "Too many requests. Please slow down."
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMITED"
