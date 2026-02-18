"""
Setup script - creates the load test user in the database.
Run this ONCE before running Locust load tests.

Usage:
    cd backend
    python tests/performance/setup_load_test_user.py
"""

import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import requests

BASE_URL = "http://localhost:8000/api/v1"

TEST_USER = {
    "email": "loadtest@fumorive.com",
    "password": "LoadTest123!",
    "full_name": "Load Test User",
    "role": "student"
}


def setup():
    print("Setting up load test user...")

    # Try to register
    resp = requests.post(f"{BASE_URL}/auth/register", json=TEST_USER)

    if resp.status_code == 201:
        print(f"✅ Created user: {TEST_USER['email']}")
    elif resp.status_code == 400:
        print(f"ℹ️  User already exists: {TEST_USER['email']}")
    else:
        print(f"❌ Failed to create user: {resp.status_code} - {resp.text}")
        return False

    # Verify login works
    resp = requests.post(
        f"{BASE_URL}/auth/login/json",
        json={"email": TEST_USER["email"], "password": TEST_USER["password"]}
    )

    if resp.status_code == 200:
        print(f"✅ Login verified successfully")
        print(f"\n🚀 Ready to run load tests!")
        print(f"   locust -f tests/performance/locustfile.py --host=http://localhost:8000")
        return True
    else:
        print(f"❌ Login failed: {resp.status_code}")
        return False


if __name__ == "__main__":
    try:
        requests.get("http://localhost:8000/health", timeout=3)
    except Exception:
        print("❌ Backend is not running. Start it first: python main.py")
        sys.exit(1)

    success = setup()
    sys.exit(0 if success else 1)
