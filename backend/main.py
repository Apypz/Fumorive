"""
FastAPI Backend Application
Main application entry point with all routes and middleware
"""

import time
import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.redis import init_redis, close_redis, redis_health_check
from app.core.firebase import init_firebase
from app.core.cache import get_cache_stats
from app.api.routes.auth import router as auth_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.websocket import router as websocket_router
from app.api.routes.eeg import router as eeg_router
from app.api.routes.face import router as face_router
from app.api.routes.users import router as users_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app instance with enhanced metadata
app = FastAPI(
    title="Fumorive API",
    version="1.0.0",
    description="""
## Fumorive - Driving Simulator with EEG & Face Recognition

Real-time fatigue detection system using:
- **EEG signals** (Muse 2 headband)
- **Face recognition** (MediaPipe)
- **Driving simulation** (Babylon.js)

### Features
- 🔐 JWT Authentication with Redis token blacklist
- 📊 Real-time EEG data streaming via WebSocket
- 😴 Multimodal fatigue detection
- 📈 TimescaleDB for time-series data storage
- 🎮 Interactive driving simulator

### Documentation
- **API Docs**: [Swagger UI](/api/docs)
- **Alternative**: [ReDoc](/api/redoc)
    """,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    contact={
        "name": "Fumorive Team",
        "email": "[EMAIL_ADDRESS]",
    },
    license_info={
        "name": "MIT License",
    },
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication endpoints (register, login, logout, refresh)"
        },
        {
            "name": "Users",
            "description": "User profile management"
        },
        {
            "name": "Sessions",
            "description": "Driving session management (CRUD operations)"
        },
        {
            "name": "WebSocket",
            "description": "Real-time data streaming endpoints"
        },
        {
            "name": "Health",
            "description": "System health and monitoring"
        }
    ]
)

# ============================================
# MIDDLEWARE CONFIGURATION
# ============================================
# Note: FastAPI processes middleware in REVERSE order of registration
# So we add CORS LAST to ensure it's processed FIRST

# 1. GZip Compression Middleware (processed third)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# 3. Request Logging & Timing Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware to log all requests with unique ID and timing
    """
    request_id = str(uuid.uuid4())[:8]  # Short ID for readability
    start_time = time.time()
    
    # Add request ID to state for access in endpoints
    request.state.request_id = request_id
    
    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log request details
    logger.info(
        f"[{request_id}] {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Time: {process_time:.3f}s"
    )
    
    # Add custom headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.3f}"
    
    return response


# 3. CORS Middleware (added LAST = processed FIRST!)
# This must come after all @app.middleware decorators
# Note: Cannot use ["*"] with allow_credentials=True
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)


# Include API routers
API_V1_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_V1_PREFIX)
app.include_router(users_router, prefix=API_V1_PREFIX)
app.include_router(sessions_router, prefix=API_V1_PREFIX)
app.include_router(websocket_router, prefix=API_V1_PREFIX)
app.include_router(eeg_router, prefix=API_V1_PREFIX)
app.include_router(face_router, prefix=API_V1_PREFIX)

# ============================================
# HEALTH CHECK ENDPOINTS
# ============================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API status"""
    return {
        "name": "Fumorive Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    redis_health = redis_health_check()
    cache_stats = get_cache_stats()
    
    return {
        "status": "healthy",
        "service": "fumorive-backend",
        "redis": redis_health,
        "cache": cache_stats
    }


@app.get("/api/v1/info", tags=["Health"])
async def api_info():
    """API information endpoint"""
    return {
        "name": "Fumorive API",
        "version": "1.0.0",
        "endpoints": {
            "auth": f"{API_V1_PREFIX}/auth",
            "sessions": f"{API_V1_PREFIX}/sessions",
            "websocket": f"{API_V1_PREFIX}/ws"
        },
        "documentation": {
            "swagger": "/api/docs",
            "redoc": "/api/redoc"
        }
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    """Execute on application startup"""
    print("=" * 60)
    print("🚀 Fumorive Backend API Starting...")
    print(f"📝 Environment: {settings.ENVIRONMENT}")
    print(f"🌐 CORS Origins: {settings.CORS_ORIGINS}")
    
    # Initialize Redis
    print("\n🔧 Initializing Redis...")
    init_redis()
    
    # Initialize Firebase (OAuth)
    print("\n🔥 Initializing Firebase...")
    init_firebase()
    
    print(f"\n📚 Documentation: /api/docs")
    print(f"🔌 WebSocket: /api/v1/ws/session/{{session_id}}")
    print("=" * 60)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown"""
    print("=" * 60)
    print("🛑 Fumorive Backend API Shutting Down...")
    
    # Close Redis connection
    print("\n🔧 Closing Redis connection...")
    close_redis()
    
    print("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )