"""
Pytest configuration and shared fixtures for Fumorive Backend tests.

This file contains:
- Database fixtures (test DB setup/teardown)
- Client fixtures (TestClient instances)
- Auth fixtures (test users, JWT tokens)
- Mock data fixtures
"""

import sys
from pathlib import Path

# Add backend root to Python path so we can import 'app' module
backend_root = Path(__file__).parent.parent
sys.path.insert(0, str(backend_root))

import asyncio
from typing import Generator, AsyncGenerator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

from tests.test_app import create_test_app
from app.db.database import Base, get_db
from app.db.models import User
from app.core.password import hash_password  # Correct import

# ==================== Test Database Configuration ====================

# PostgreSQL test database URL
# Uses separate test database to avoid polluting production data
TEST_DATABASE_URL = "postgresql://postgres:12345@localhost:5432/fumorive_test"

# Create test engine with NullPool - no connection reuse between tests
# This prevents connection pool exhaustion and state leakage
test_engine = create_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,  # Each test gets a fresh connection, no pooling
    echo=False,  # Set to True to debug SQL queries
)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# ==================== Database Fixtures ====================

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Create all tables once at the start of test session.
    Drop all tables at the end of test session.
    Scope: session (runs once for entire test suite)
    """
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    yield
    # Drop all tables after all tests complete
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test function.
    Uses NullPool so each test gets its own connection.
    Deletes all data after test completes to ensure isolation.
    """
    # Create tables if they don't exist yet
    Base.metadata.create_all(bind=test_engine)
    
    db_session = TestSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        # Clean up all data between tests (truncate all tables)
        with test_engine.connect() as conn:
            # Disable FK checks temporarily for clean truncation
            conn.execute(
                __import__('sqlalchemy').text(
                    "TRUNCATE TABLE alerts, face_detection_events, game_events, "
                    "eeg_data, sessions, users RESTART IDENTITY CASCADE"
                )
            )
            conn.commit()


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a TestClient with overridden database dependency.
    """
    app = create_test_app()  # Create test app instance
    
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==================== User Fixtures ====================

@pytest.fixture
def test_user(db: Session) -> User:
    """Create a test user in the database."""
    user = User(
        email="testuser@example.com",
        full_name="Test User",
        hashed_password=hash_password("password123"),
        role="student",
        is_active=True,
        oauth_provider=None,
        google_id=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_admin_user(db: Session) -> User:
    """Create a test admin user in the database."""
    admin = User(
        email="admin@example.com",
        full_name="Admin User",
        hashed_password=hash_password("adminpass123"),
        role="admin",
        is_active=True,
        oauth_provider=None,
        google_id=None,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def test_oauth_user(db: Session) -> User:
    """Create a test OAuth user (Google login)."""
    oauth_user = User(
        email="oauthuser@gmail.com",
        full_name="OAuth User",
        hashed_password=None,  # OAuth users don't have passwords
        role="student",
        is_active=True,
        oauth_provider="google",
        google_id="google_test_id_123",
        profile_picture="https://example.com/avatar.jpg",
    )
    db.add(oauth_user)
    db.commit()
    db.refresh(oauth_user)
    return oauth_user


# ==================== Auth Token Fixtures ====================

@pytest.fixture
def auth_headers(client: TestClient, test_user: User) -> dict:
    """
    Get authentication headers with valid JWT token for test_user.
    """
    response = client.post(
        "/api/v1/auth/login/json",
        json={"email": "testuser@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client: TestClient, test_admin_user: User) -> dict:
    """
    Get authentication headers with valid JWT token for admin user.
    """
    response = client.post(
        "/api/v1/auth/login/json",
        json={"email": "admin@example.com", "password": "adminpass123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ==================== Mock Data Fixtures ====================

@pytest.fixture
def mock_eeg_data() -> dict:
    """Generate mock EEG data packet."""
    return {
        "timestamp": 1234567890.123,
        "channels": {
            "TP9": 0.5,
            "AF7": 0.3,
            "AF8": -0.2,
            "TP10": 0.1
        },
        "sample_rate": 256
    }


@pytest.fixture
def mock_face_data() -> dict:
    """Generate mock face detection data."""
    return {
        "timestamp": 1234567890.123,
        "ear_left": 0.28,
        "ear_right": 0.30,
        "mar": 0.15,
        "head_pose": {
            "pitch": 5.2,
            "yaw": -2.1,
            "roll": 0.8
        },
        "is_drowsy": False
    }


# ==================== Event Loop Fixture (for async tests) ====================

@pytest.fixture(scope="session")
def event_loop():
    """
    Create an event loop for async tests.
    Scope is session to reuse across all tests.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
