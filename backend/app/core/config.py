"""
Application Configuration
Environment variables and settings for Fumorive Backend
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Fumorive Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development, staging, production
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False  # Always False in production (Railway manages restarts)

    # Database - PostgreSQL + TimescaleDB
    DATABASE_URL: str = "postgresql://postgres:12345@127.0.0.1:5432/fumorive"
    DATABASE_URL_ASYNC: str = "postgresql+asyncpg://postgres:12345@127.0.0.1:5432/fumorive"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"  # CHANGE IN PRODUCTION!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Firebase Admin SDK (for OAuth)
    # Railway: set FIREBASE_SERVICE_ACCOUNT_JSON as JSON string env var
    # Local dev: use FIREBASE_SERVICE_ACCOUNT_PATH to point to the JSON file
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""  # JSON string (Railway/cloud)
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "fumorive-db-firebase-adminsdk-fbsvc-0353bb0508.json"
    FIREBASE_PROJECT_ID: str = ""

    # CORS — add your Vercel production URLs here
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://fumorive.vercel.app",                             # Vercel production
        "https://fumorive-git-main-apypzs-projects.vercel.app",   # Vercel main branch
    ]

    # TimescaleDB Settings
    TIMESCALE_CHUNK_INTERVAL: str = "1 day"

    # EEG Internal API Key (server-to-server auth, no JWT needed)
    EEG_INTERNAL_KEY: str = "fumorive-eeg-internal-dev-key"

    # Email (Resend API — https://resend.com)
    RESEND_API_KEY: str = ""     # Set in Railway: RESEND_API_KEY=re_xxxxxxxxxxxx
    EMAIL_FROM_NAME: str = "Fumorive"

    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # seconds

    # Logging
    LOG_LEVEL: str = "INFO"

    # Rate Limiting
    LIMIT_AUTH: str = "10/minute"
    LIMIT_READ: str = "120/minute"
    LIMIT_WRITE: str = "30/minute"
    LIMIT_STREAM: str = "300/minute"
    LIMIT_EXPORT: str = "10/minute"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields dari .env
    )


# Create settings instance
settings = Settings()
