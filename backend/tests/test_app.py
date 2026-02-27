"""
Test application factory - minimal FastAPI app for testing without full initialization
"""
from fastapi import FastAPI
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.eeg import router as eeg_router
from app.api.routes.face import router as face_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.playback import router as playback_router
from app.api.routes.export import router as export_router


def create_test_app() -> FastAPI:
    """
    Create a minimal FastAPI application for testing.
    Skips Redis, Firebase initialization that happens in main.py
    """
    app = FastAPI(title="Fumorive Test API")
    
    # Include routers (routers already have their own prefixes like /auth, /users, etc.)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(sessions_router, prefix="/api/v1")
    app.include_router(eeg_router, prefix="/api/v1")
    app.include_router(face_router, prefix="/api/v1")
    app.include_router(alerts_router, prefix="/api/v1")
    app.include_router(playback_router, prefix="/api/v1")
    app.include_router(export_router, prefix="/api/v1")
    
    return app
