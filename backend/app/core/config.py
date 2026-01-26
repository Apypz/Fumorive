"""
Application Configuration
Environment variables and settings for ERGODRIVE Backend
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "ERGODRIVE Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development, staging, production
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
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
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",  # React common port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # TimescaleDB Settings
    TIMESCALE_CHUNK_INTERVAL: str = "1 day"  # Chunk interval for hypertables
    
    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # seconds
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields dari .env
    )


# Create settings instance
settings = Settings()
