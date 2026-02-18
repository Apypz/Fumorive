"""
Create loadtest user for load testing
Run this before load_test.py
"""

import requests

BASE_URL = "http://localhost:8000/api/v1"

def create_loadtest_user():
    data = {
        "email": "loadtest@fumorive.com",
        "password": "LoadTest123!",
        "full_name": "Load Test User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=data)
        if response.status_code == 201:
            print("✅ Load test user created successfully")
            print(f"   Email: {data['email']}")
            print(f"   Password: {data['password']}")
            return True
        elif response.status_code == 400 and "already registered" in response.text.lower():
            print("ℹ️  Load test user already exists")
            return True
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    create_loadtest_user()
