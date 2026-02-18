"""
Test WebSocket Alert Broadcasting
Creates an alert via the API and verifies it gets broadcast via WebSocket
"""

import requests
import json
from datetime import datetime
import uuid

BASE_URL = "http://localhost:8000/api/v1"

# Login
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    data={"username": "loadtest@fumorive.com", "password": "LoadTest123!"}
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a session
    session_response = requests.post(
        f"{BASE_URL}/sessions",
        json={
            "session_name": f"Alert Test {datetime.now().strftime('%H:%M:%S')}",
            "device_type": "Muse 2",
            "session_type": "general"
        },
        headers=headers
    )
    
    if session_response.status_code == 201:
        session_id = session_response.json()["id"]
        print(f"✅ Session created: {session_id}")
        print(f"\n1. Connect frontend WebSocket to: ws://localhost:8000/api/v1/ws/session/{session_id}")
        print(f"2. Creating alert via HTTP...")
        
        # Create alert
        alert_response = requests.post(
            f"{BASE_URL}/alerts",
            json={
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "alert_level": "critical",
                "fatigue_score": 85.5,
                "eeg_contribution": 0.8,
                "trigger_reason": "High theta/alpha ratio detected"
            },
            headers=headers
        )
        
        if alert_response.status_code == 201:
            alert = alert_response.json()
            print(f"\n✅ Alert created successfully!")
            print(json.dumps(alert, indent=2))
            print(f"\n3. Check WebSocket client for alert notification!")
            print(f"   Expected message type: 'alert'")
        else:
            print(f"❌ Alert creation failed: {alert_response.status_code}")
            print(alert_response.text)
    else:
        print(f"❌ Session creation failed: {session_response.status_code}")
else:
    print(f"❌ Login failed: {login_response.status_code}")
