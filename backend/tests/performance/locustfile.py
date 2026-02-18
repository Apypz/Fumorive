"""
Fumorive Backend - Locust Load Testing
Main locustfile covering all API endpoints

Usage:
    # Web UI mode (recommended for first run):
    locust -f tests/performance/locustfile.py --host=http://localhost:8000

    # Headless mode (for CI/automated testing):
    locust -f tests/performance/locustfile.py --host=http://localhost:8000 \
        --headless -u 20 -r 5 --run-time 60s \
        --html tests/performance/report.html

    # Quick smoke test (5 users, 30 seconds):
    locust -f tests/performance/locustfile.py --host=http://localhost:8000 \
        --headless -u 5 -r 2 --run-time 30s

Scenarios:
    - AuthUser: Register + Login flow (10% weight)
    - RegularUser: Authenticated user browsing sessions/profile (60% weight)
    - DataIngestionUser: Simulates EEG/alert data creation (30% weight)

Test Accounts (create these before running):
    Email: loadtest@fumorive.com
    Password: LoadTest123!
"""

import random
import uuid
from datetime import datetime, timezone

from locust import HttpUser, task, between, events
from locust.exception import StopUser


# ==================== Configuration ====================

BASE_URL = "/api/v1"

# Pre-created test account (must exist in DB before running)
TEST_EMAIL = "loadtest@fumorive.com"
TEST_PASSWORD = "LoadTest123!"

# Admin account for admin-only endpoints
ADMIN_EMAIL = "admin@fumorive.com"
ADMIN_PASSWORD = "Admin123!"


# ==================== Helper Mixins ====================

class AuthMixin:
    """Mixin to handle authentication for Locust users."""

    def login(self, email: str = TEST_EMAIL, password: str = TEST_PASSWORD) -> bool:
        """Login and store token in session headers."""
        with self.client.post(
            f"{BASE_URL}/auth/login/json",
            json={"email": email, "password": password},
            name="/auth/login/json",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                token = response.json().get("access_token")
                self.client.headers.update({"Authorization": f"Bearer {token}"})
                self._token = token
                return True
            else:
                response.failure(f"Login failed: {response.status_code} - {response.text}")
                return False

    def register_random_user(self) -> dict | None:
        """Register a new random user and return credentials."""
        uid = uuid.uuid4().hex[:8]
        email = f"loadtest_{uid}@example.com"
        password = "TestPass123!"

        with self.client.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": email,
                "password": password,
                "full_name": f"Load Test User {uid}",
                "role": "student"
            },
            name="/auth/register",
            catch_response=True
        ) as response:
            if response.status_code == 201:
                return {"email": email, "password": password}
            else:
                response.failure(f"Register failed: {response.status_code}")
                return None


# ==================== User Scenarios ====================

class AuthUser(HttpUser):
    """
    Simulates authentication flow: register → login → get profile.
    Weight: 10% of traffic (new users signing up)
    """
    weight = 1
    wait_time = between(1, 3)

    def on_start(self):
        """Called when a simulated user starts."""
        self._token = None

    @task(3)
    def register_and_login(self):
        """Register a new user then immediately login."""
        uid = uuid.uuid4().hex[:8]
        email = f"lt_{uid}@example.com"
        password = "TestPass123!"

        # Register
        with self.client.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": email,
                "password": password,
                "full_name": f"LT User {uid}",
                "role": "student"
            },
            name="/auth/register",
            catch_response=True
        ) as resp:
            if resp.status_code not in [201, 400]:  # 400 = already exists (ok)
                resp.failure(f"Unexpected status: {resp.status_code}")
                return

        # Login with new credentials
        with self.client.post(
            f"{BASE_URL}/auth/login/json",
            json={"email": email, "password": password},
            name="/auth/login/json",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                # Get profile with new token
                self.client.get(
                    f"{BASE_URL}/users/me",
                    headers={"Authorization": f"Bearer {token}"},
                    name="/users/me"
                )
            else:
                resp.failure(f"Login failed: {resp.status_code}")

    @task(1)
    def login_wrong_password(self):
        """Test failed login (validates error handling performance)."""
        with self.client.post(
            f"{BASE_URL}/auth/login/json",
            json={"email": "nonexistent@example.com", "password": "wrongpass"},
            name="/auth/login/json [invalid]",
            catch_response=True
        ) as resp:
            if resp.status_code == 401:
                resp.success()  # Expected failure
            else:
                resp.failure(f"Expected 401, got {resp.status_code}")


class RegularUser(HttpUser):
    """
    Simulates a regular authenticated user browsing the app.
    Weight: 60% of traffic (main user flow)
    """
    weight = 6
    wait_time = between(1, 4)

    def on_start(self):
        """Login before starting tasks."""
        self._token = None
        self._session_ids = []

        # Login
        with self.client.post(
            f"{BASE_URL}/auth/login/json",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            name="/auth/login/json",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                self.client.headers.update({"Authorization": f"Bearer {token}"})
                self._token = token
            else:
                resp.failure(f"Login failed: {resp.status_code}")
                raise StopUser()

    # ---- Profile Tasks ----

    @task(5)
    def get_profile(self):
        """GET /users/me - Most common action."""
        with self.client.get(
            f"{BASE_URL}/users/me",
            name="/users/me",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 500:
                # Redis might be down - mark as success to not skew results
                resp.success()
            else:
                resp.failure(f"Unexpected: {resp.status_code}")

    @task(1)
    def update_profile(self):
        """PUT /users/me - Update profile picture."""
        self.client.put(
            f"{BASE_URL}/users/me",
            json={"profile_picture": f"https://example.com/avatar_{random.randint(1,100)}.jpg"},
            name="/users/me [PUT]"
        )

    # ---- Session Tasks ----

    @task(4)
    def list_sessions(self):
        """GET /sessions - Browse session history."""
        self.client.get(
            f"{BASE_URL}/sessions?page=1&page_size=10",
            name="/sessions [list]"
        )

    @task(2)
    def create_session(self):
        """POST /sessions - Start a new driving session."""
        with self.client.post(
            f"{BASE_URL}/sessions",
            json={
                "session_name": f"Drive {random.randint(1000, 9999)}",
                "device_type": random.choice(["Muse 2", "OpenBCI"]),
                "settings": {"fatigue_threshold": random.randint(60, 80)}
            },
            name="/sessions [create]",
            catch_response=True
        ) as resp:
            if resp.status_code == 201:
                session_id = resp.json().get("id")
                if session_id:
                    self._session_ids.append(session_id)
            elif resp.status_code == 422:
                resp.failure(f"Validation error: {resp.text}")

    @task(2)
    def get_session_detail(self):
        """GET /sessions/{id} - View session details."""
        if not self._session_ids:
            return
        session_id = random.choice(self._session_ids)
        self.client.get(
            f"{BASE_URL}/sessions/{session_id}",
            name="/sessions/{id}"
        )

    @task(1)
    def get_session_eeg(self):
        """GET /sessions/{id}/eeg - View EEG playback data."""
        if not self._session_ids:
            return
        session_id = random.choice(self._session_ids)
        self.client.get(
            f"{BASE_URL}/sessions/{session_id}/eeg?page=1&page_size=100",
            name="/sessions/{id}/eeg"
        )

    @task(1)
    def get_session_alerts(self):
        """GET /alerts - View session alerts."""
        if not self._session_ids:
            return
        session_id = random.choice(self._session_ids)
        self.client.get(
            f"{BASE_URL}/alerts?session_id={session_id}",
            name="/alerts [list]"
        )

    @task(1)
    def complete_session(self):
        """PATCH /sessions/{id} - Complete a session."""
        if not self._session_ids:
            return
        session_id = self._session_ids.pop()  # Remove from list
        self.client.patch(
            f"{BASE_URL}/sessions/{session_id}",
            json={
                "session_status": "completed",
                "duration_seconds": random.randint(600, 3600),
                "avg_fatigue_score": round(random.uniform(20, 80), 2)
            },
            name="/sessions/{id} [complete]"
        )


class DataIngestionUser(HttpUser):
    """
    Simulates real-time data ingestion (EEG + face + alerts).
    Weight: 30% of traffic (active driving sessions)
    """
    weight = 3
    wait_time = between(0.1, 0.5)  # Fast - simulates real-time data

    def on_start(self):
        """Login and create a session to ingest data into."""
        self._session_id = None

        # Login
        with self.client.post(
            f"{BASE_URL}/auth/login/json",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            name="/auth/login/json",
            catch_response=True
        ) as resp:
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                self.client.headers.update({"Authorization": f"Bearer {token}"})
            else:
                resp.failure(f"Login failed: {resp.status_code}")
                raise StopUser()

        # Create a session
        with self.client.post(
            f"{BASE_URL}/sessions",
            json={
                "session_name": f"Ingestion Test {uuid.uuid4().hex[:6]}",
                "device_type": "Muse 2"
            },
            name="/sessions [create]",
            catch_response=True
        ) as resp:
            if resp.status_code == 201:
                self._session_id = resp.json().get("id")
            else:
                raise StopUser()

    @task(5)
    def ingest_eeg_stream(self):
        """POST /eeg/stream - Simulate EEG data from Python LSL middleware."""
        if not self._session_id:
            return

        self.client.post(
            f"{BASE_URL}/eeg/stream",
            json={
                "session_id": self._session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sample_rate": 256,
                "channels": {
                    "TP9": round(random.uniform(-1, 1), 4),
                    "AF7": round(random.uniform(-1, 1), 4),
                    "AF8": round(random.uniform(-1, 1), 4),
                    "TP10": round(random.uniform(-1, 1), 4)
                },
                "processed": {
                    "theta_power": round(random.uniform(0, 1), 4),
                    "alpha_power": round(random.uniform(0, 1), 4),
                    "theta_alpha_ratio": round(random.uniform(0.5, 2.0), 4),
                    "fatigue_score": round(random.uniform(0, 100), 2),
                    "cognitive_state": random.choice(["alert", "drowsy", "fatigued"])
                },
                "save_to_db": True
            },
            name="/eeg/stream [POST]"
        )

    @task(3)
    def ingest_face_event(self):
        """POST /face - Log face detection event."""
        if not self._session_id:
            return

        self.client.post(
            f"{BASE_URL}/face/events",
            json={
                "session_id": self._session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "eye_aspect_ratio": round(random.uniform(0.1, 0.4), 4),
                "mouth_aspect_ratio": round(random.uniform(0.05, 0.3), 4),
                "eyes_closed": random.random() < 0.1,
                "yawning": random.random() < 0.05,
                "blink_count": random.randint(0, 20),
                "blink_rate": round(random.uniform(10, 25), 2),
                "head_yaw": round(random.uniform(-15, 15), 2),
                "head_pitch": round(random.uniform(-10, 10), 2),
                "head_roll": round(random.uniform(-5, 5), 2),
                "face_fatigue_score": round(random.uniform(0, 100), 2)
            },
            name="/face/events [POST]"
        )

    @task(1)
    def create_alert(self):
        """POST /alerts/ - Create fatigue alert."""
        if not self._session_id:
            return

        self.client.post(
            f"{BASE_URL}/alerts/",
            json={
                "session_id": self._session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alert_level": random.choice(["warning", "critical"]),
                "fatigue_score": round(random.uniform(65, 95), 2),
                "eeg_contribution": 0.6,
                "face_contribution": 0.4,
                "trigger_reason": random.choice([
                    "high_theta_alpha",
                    "eyes_closed",
                    "yawning",
                    "head_nodding"
                ])
            },
            name="/alerts/ [POST]"
        )

    def on_stop(self):
        """Complete session when user stops."""
        if self._session_id:
            self.client.patch(
                f"{BASE_URL}/sessions/{self._session_id}",
                json={"session_status": "completed"},
                name="/sessions/{id} [complete]"
            )
