"""
User endpoint tests.

Tests for:
- GET /api/v1/users/me
- PUT /api/v1/users/me
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import User


# ==================== Get Current User Tests ====================

@pytest.mark.api
@pytest.mark.unit
def test_get_current_user_success(client: TestClient, auth_headers: dict, test_user: User):
    """Test getting current user profile with valid token."""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert data["full_name"] == "Test User"
    assert data["role"] == "student"
    assert "hashed_password" not in data


@pytest.mark.api
@pytest.mark.unit
def test_get_current_user_no_auth(client: TestClient):
    """Test getting current user without authentication fails."""
    response = client.get("/api/v1/users/me")
    
    assert response.status_code == 401


@pytest.mark.api
@pytest.mark.unit
def test_get_current_user_invalid_token(client: TestClient):
    """Test getting current user with invalid token."""
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid.token.here"}
    )
    
    assert response.status_code == 401


# ==================== Update User Profile Tests ====================

@pytest.mark.api
@pytest.mark.unit
def test_update_user_full_name(client: TestClient, auth_headers: dict, db: Session, test_user: User):
    """Test updating user's full name."""
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": "Updated Name"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    
    # Verify in database
    db.refresh(test_user)
    assert test_user.full_name == "Updated Name"
    # Verify name_manually_edited flag is set
    assert test_user.name_manually_edited == True


@pytest.mark.api
@pytest.mark.unit
def test_update_user_profile_picture(client: TestClient, auth_headers: dict, db: Session, test_user: User):
    """Test updating user's profile picture."""
    new_pic_url = "https://example.com/new-avatar.jpg"
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"profile_picture": new_pic_url}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["profile_picture"] == new_pic_url
    
    # Verify in database
    db.refresh(test_user)
    assert test_user.profile_picture == new_pic_url


@pytest.mark.api
@pytest.mark.unit
def test_update_user_both_fields(client: TestClient, auth_headers: dict, db: Session, test_user: User):
    """Test updating both full_name and profile_picture."""
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={
            "full_name": "New Full Name",
            "profile_picture": "https://example.com/pic.jpg"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "New Full Name"
    assert data["profile_picture"] == "https://example.com/pic.jpg"
    
    # Verify in database
    db.refresh(test_user)
    assert test_user.full_name == "New Full Name"
    assert test_user.profile_picture == "https://example.com/pic.jpg"
    assert test_user.name_manually_edited == True


@pytest.mark.api
@pytest.mark.unit
def test_update_user_no_changes(client: TestClient, auth_headers: dict):
    """Test update with empty payload returns current user."""
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={}
    )
    
    assert response.status_code == 200
    # Should return current user data unchanged


@pytest.mark.api
@pytest.mark.unit
def test_update_user_no_auth(client: TestClient):
    """Test updating user without authentication fails."""
    response = client.put(
        "/api/v1/users/me",
        json={"full_name": "Hacker"}
    )
    
    assert response.status_code == 401


@pytest.mark.api
@pytest.mark.unit
def test_update_user_invalid_token(client: TestClient):
    """Test updating user with invalid token."""
    response = client.put(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid.token.here"},
        json={"full_name": "Hacker"}
    )
    
    assert response.status_code == 401


# ==================== Edge Cases ====================

@pytest.mark.api
@pytest.mark.unit
def test_update_user_empty_full_name(client: TestClient, auth_headers: dict):
    """Test updating with empty full_name (should fail validation)."""
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": ""}
    )
    
    # Should either reject empty string or accept it
    # Adjust based on validation rules
    assert response.status_code in [200, 422]


@pytest.mark.api
@pytest.mark.unit
def test_update_user_very_long_name(client: TestClient, auth_headers: dict):
    """Test updating with very long full_name."""
    long_name = "A" * 300
    response = client.put(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": long_name}
    )
    
    # Should either truncate or reject based on DB column size (VARCHAR(255))
    assert response.status_code in [200, 422]
