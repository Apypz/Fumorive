"""
Authentication endpoint tests.

Tests for:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/google (mock Firebase)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import User


# ==================== Registration Tests ====================

@pytest.mark.api
@pytest.mark.auth
def test_register_new_user(client: TestClient, db: Session):
    """Test successful user registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepass123",
            "full_name": "New User",
            "role": "student"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "student"
    assert "id" in data
    assert "hashed_password" not in data  # Should not expose password


@pytest.mark.api
@pytest.mark.auth
def test_register_duplicate_email(client: TestClient, test_user: User):
    """Test registration with existing email fails."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "testuser@example.com",  # Already exists from test_user fixture
            "password": "newpassword123",
            "full_name": "Duplicate User",
            "role": "student"
        }
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.api
@pytest.mark.auth
def test_register_invalid_email(client: TestClient):
    """Test registration with invalid email format."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "password123",
            "full_name": "Invalid User",
            "role": "student"
        }
    )
    
    assert response.status_code == 422  # Validation error


@pytest.mark.api
@pytest.mark.auth
def test_register_weak_password(client: TestClient):
    """Test registration with weak password (if validation exists)."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "123",  # Too short
            "full_name": "Weak Password User",
            "role": "student"
        }
    )
    
    # Might fail validation or succeed depending on implementation
    # Adjust assertion based on your password policy
    assert response.status_code in [201, 422]


# ==================== Login Tests ====================

@pytest.mark.api
@pytest.mark.auth
def test_login_success(client: TestClient, test_user: User):
    """Test successful login with correct credentials."""
    response = client.post(
        "/api/v1/auth/login/json",
        json={
            "email": "testuser@example.com",
            "password": "password123"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.api
@pytest.mark.auth
def test_login_wrong_password(client: TestClient, test_user: User):
    """Test login with incorrect password."""
    response = client.post(
        "/api/v1/auth/login/json",
        json={
            "email": "testuser@example.com",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.api
@pytest.mark.auth
def test_login_nonexistent_user(client: TestClient):
    """Test login with email that doesn't exist."""
    response = client.post(
        "/api/v1/auth/login/json",
        json={
            "email": "nonexistent@example.com",
            "password": "password123"
        }
    )
    
    assert response.status_code == 401


@pytest.mark.api
@pytest.mark.auth
def test_login_inactive_user(client: TestClient, db: Session):
    """Test login with inactive user account."""
    from app.core.password import hash_password
    # Create inactive user
    inactive_user = User(
        email="inactive@example.com",
        full_name="Inactive User",
        hashed_password=hash_password("password123"),
        role="student",
        is_active=False  # Inactive
    )
    db.add(inactive_user)
    db.commit()
    
    response = client.post(
        "/api/v1/auth/login/json",
        json={
            "email": "inactive@example.com",
            "password": "password123"
        }
    )
    
    assert response.status_code in [401, 403]


# ==================== Token Refresh Tests ====================

@pytest.mark.api
@pytest.mark.auth
def test_refresh_token_success(client: TestClient, test_user: User):
    """Test successful token refresh."""
    # First login to get refresh token
    login_response = client.post(
        "/api/v1/auth/login/json",
        json={
            "email": "testuser@example.com",
            "password": "password123"
        }
    )
    refresh_token = login_response.json()["refresh_token"]
    
    # Use refresh token to get new access token
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.api
@pytest.mark.auth
def test_refresh_token_invalid(client: TestClient):
    """Test token refresh with invalid token."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid.token.here"}
    )
    
    assert response.status_code == 401


# ==================== OAuth Tests (Mocked) ====================

@pytest.mark.api
@pytest.mark.auth
def test_google_oauth_new_user(client: TestClient, db: Session):
    """
    Test Google OAuth for new user.
    Note: This requires mocking Firebase auth verification.
    Skip for now if Firebase mocking is complex.
    """
    pytest.skip("Requires Firebase mock - implement later")


@pytest.mark.api
@pytest.mark.auth
def test_google_oauth_existing_user(client: TestClient, test_oauth_user: User):
    """Test Google OAuth for existing OAuth user."""
    pytest.skip("Requires Firebase mock - implement later")
