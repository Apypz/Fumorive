"""
Fumorive Backend - Load Testing Script
Tests CRUD operations, alerts, and playback endpoints with concurrent users

Requirements:
    pip install requests

Usage:
    python load_test.py
"""

import requests
import time
import json
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import random
import string

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
NUM_USERS = 15  # Concurrent users
NUM_REQUESTS_PER_USER = 10
TIMEOUT = 30

# Test credentials (create these users first or use existing)
TEST_EMAIL = "loadtest@fumorive.com"
TEST_PASSWORD = "LoadTest123!"


class LoadTestStats:
    """Track performance statistics"""
    
    def __init__(self):
        self.response_times: List[float] = []
        self.success_count = 0
        self.error_count = 0
        self.errors: List[str] = []
    
    def add_result(self, duration: float, success: bool, error: str = None):
        self.response_times.append(duration)
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
            if error:
                self.errors.append(error)
    
    def print_summary(self, test_name: str):
        total = len(self.response_times)
        if total == 0:
            print(f"\n[FAIL] {test_name}: No requests completed")
            return
        
        print(f"\n[{test_name} Results]")
        print(f"   Total Requests: {total}")
        print(f"   [OK] Success: {self.success_count}")
        print(f"   [ERR] Errors: {self.error_count}")
        print(f"   Response Times:")
        print(f"      Min: {min(self.response_times):.3f}s")
        print(f"      Max: {max(self.response_times):.3f}s")
        print(f"      Mean: {statistics.mean(self.response_times):.3f}s")
        print(f"      Median: {statistics.median(self.response_times):.3f}s")
        
        if self.errors:
            print(f"   [WARN] Error samples: {self.errors[:3]}")


class LoadTester:
    """Main load testing class"""
    
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.session_ids = []
    
    def login(self) -> bool:
        """Login and get JWT token"""
        try:
            # OAuth2PasswordRequestForm expects form data with 'username' field
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                data={"username": TEST_EMAIL, "password": TEST_PASSWORD},  # form data, not JSON
                timeout=TIMEOUT
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"[OK] Logged in as {TEST_EMAIL}")
                return True
            else:
                print(f"[ERR] Login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"[ERR] Login error: {e}")
            return False
    
    def create_session(self) -> Tuple[bool, float, str]:
        """Test: Create session"""
        start = time.time()
        try:
            data = {
                "session_name": f"Load Test {random.randint(1000, 9999)}",
                "device_type": "Muse 2",
                "session_type": "general"
            }
            response = self.session.post(
                f"{BASE_URL}/sessions",
                json=data,
                timeout=TIMEOUT
            )
            duration = time.time() - start
            
            if response.status_code == 201:
                session_id = response.json().get("id")
                return True, duration, session_id
            else:
                return False, duration, f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)
    
    def get_sessions(self) -> Tuple[bool, float, str]:
        """Test: List sessions"""
        start = time.time()
        try:
            response = self.session.get(
                f"{BASE_URL}/sessions?page=1&page_size=20",
                timeout=TIMEOUT
            )
            duration = time.time() - start
            return response.status_code == 200, duration, None if response.status_code == 200 else f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)
    
    def update_session(self, session_id: str) -> Tuple[bool, float, str]:
        """Test: Update session"""
        start = time.time()
        try:
            data = {"session_name": f"Updated {random.randint(1000, 9999)}"}
            response = self.session.patch(
                f"{BASE_URL}/sessions/{session_id}",
                json=data,
                timeout=TIMEOUT
            )
            duration = time.time() - start
            return response.status_code == 200, duration, None if response.status_code == 200 else f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)
    
    def create_alert(self, session_id: str) -> Tuple[bool, float, str]:
        """Test: Create alert"""
        start = time.time()
        try:
            data = {
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "alert_level": random.choice(["warning", "critical"]),
                "fatigue_score": random.uniform(60, 95),
                "eeg_contribution": 0.7,
                "trigger_reason": "High theta/alpha ratio"
            }
            response = self.session.post(
                f"{BASE_URL}/alerts",
                json=data,
                timeout=TIMEOUT
            )
            duration = time.time() - start
            return response.status_code == 201, duration, None if response.status_code == 201 else f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)
    
    def get_alerts(self) -> Tuple[bool, float, str]:
        """Test: List alerts"""
        start = time.time()
        try:
            response = self.session.get(
                f"{BASE_URL}/alerts?limit=20&offset=0",
                timeout=TIMEOUT
            )
            duration = time.time() - start
            return response.status_code == 200, duration, None if response.status_code == 200 else f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)
    
    def get_session_eeg(self, session_id: str) -> Tuple[bool, float, str]:
        """Test: Playback EEG data"""
        start = time.time()
        try:
            response = self.session.get(
                f"{BASE_URL}/sessions/{session_id}/eeg?page=1&page_size=100",
                timeout=TIMEOUT
            )
            duration = time.time() - start
            return response.status_code == 200, duration, None if response.status_code == 200 else f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)
    
    def delete_session(self, session_id: str) -> Tuple[bool, float, str]:
        """Test: Delete session"""
        start = time.time()
        try:
            response = self.session.delete(
                f"{BASE_URL}/sessions/{session_id}",
                timeout=TIMEOUT
            )
            duration = time.time() - start
            return response.status_code == 204, duration, None if response.status_code == 204 else f"HTTP {response.status_code}"
        except Exception as e:
            return False, time.time() - start, str(e)


def worker_task(worker_id: int, num_requests: int) -> Dict[str, LoadTestStats]:
    """Worker function for each concurrent user"""
    tester = LoadTester()
    
    stats = {
        "create_session": LoadTestStats(),
        "get_sessions": LoadTestStats(),
        "update_session": LoadTestStats(),
        "create_alert": LoadTestStats(),
        "get_alerts": LoadTestStats(),
        "get_eeg": LoadTestStats(),
        "delete_session": LoadTestStats(),
    }
    
    # Login
    if not tester.login():
        return stats
    
    # Run test requests
    for i in range(num_requests):
        # Create session
        success, duration, error = tester.create_session()
        stats["create_session"].add_result(duration, success, error)
        
        if success:
            session_id = error  # Session ID returned on success
            
            # Get sessions list
            success, duration, error = tester.get_sessions()
            stats["get_sessions"].add_result(duration, success, error)
            
            # Update session
            success, duration, error = tester.update_session(session_id)
            stats["update_session"].add_result(duration, success, error)
            
            # Create alert
            success, duration, error = tester.create_alert(session_id)
            stats["create_alert"].add_result(duration, success, error)
            
            # Get alerts
            success, duration, error = tester.get_alerts()
            stats["get_alerts"].add_result(duration, success, error)
            
            # Get EEG playback (empty but tests endpoint)
            success, duration, error = tester.get_session_eeg(session_id)
            stats["get_eeg"].add_result(duration, success, error)
            
            # Delete session
            success, duration, error = tester.delete_session(session_id)
            stats["delete_session"].add_result(duration, success, error)
        
        time.sleep(0.1)  # Small delay between requests
    
    return stats


def run_load_test():
    """Main load test execution"""
    print("=" * 70)
    print("Fumorive Backend Load Testing")
    print("=" * 70)
    print(f"\nConfiguration:")
    print(f"   Base URL: {BASE_URL}")
    print(f"   Concurrent Users: {NUM_USERS}")
    print(f"   Requests per User: {NUM_REQUESTS_PER_USER}")
    print(f"   Total Requests: {NUM_USERS * NUM_REQUESTS_PER_USER}")
    
    # Aggregate stats
    aggregate_stats = {
        "create_session": LoadTestStats(),
        "get_sessions": LoadTestStats(),
        "update_session": LoadTestStats(),
        "create_alert": LoadTestStats(),
        "get_alerts": LoadTestStats(),
        "get_eeg": LoadTestStats(),
        "delete_session": LoadTestStats(),
    }
    
    start_time = time.time()
    
    # Run concurrent workers
    print(f"\nRunning load test...")
    with ThreadPoolExecutor(max_workers=NUM_USERS) as executor:
        futures = [
            executor.submit(worker_task, i, NUM_REQUESTS_PER_USER)
            for i in range(NUM_USERS)
        ]
        
        for future in as_completed(futures):
            worker_stats = future.result()
            for key, stats in worker_stats.items():
                aggregate_stats[key].response_times.extend(stats.response_times)
                aggregate_stats[key].success_count += stats.success_count
                aggregate_stats[key].error_count += stats.error_count
                aggregate_stats[key].errors.extend(stats.errors)
    
    total_duration = time.time() - start_time
    
    # Print results
    print("\n" + "=" * 70)
    print("LOAD TEST RESULTS")
    print("=" * 70)
    
    for test_name, stats in aggregate_stats.items():
        stats.print_summary(test_name.replace("_", " ").title())
    
    total_requests = sum(len(stats.response_times) for stats in aggregate_stats.values())
    print(f"\nTotal Duration: {total_duration:.2f}s")
    print(f"Throughput: {total_requests / total_duration:.2f} req/s")
    print("\n" + "=" * 70)


if __name__ == "__main__":
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health", timeout=5)
        if response.status_code != 200:
            print("[ERR] Backend is not healthy. Please start the backend first.")
            exit(1)
    except:
        print("[ERR] Cannot connect to backend. Please start the backend first.")
        print("   Run: python main.py")
        exit(1)
    
    run_load_test()
