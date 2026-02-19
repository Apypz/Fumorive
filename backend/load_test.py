"""
Fumorive Backend - Load Testing Script
Tests CRUD operations, alerts, playback, reporting endpoints,
security headers, and rate limiter behaviour under concurrent load.

Requirements:
    pip install requests

Usage:
    python load_test.py [--suite all|crud|reporting|security|ratelimit]

Suites:
    crud        - Original CRUD + alerts + EEG playback (15 users)
    reporting   - Reporting API endpoints (5 users, heavy queries)
    security    - Security headers presence check
    ratelimit   - Verify 429 responses when limit exceeded
    all         - Run every suite (default)
"""

import argparse
import requests
import time
import json
import statistics
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional
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
        if total > 0:
            success_rate = self.success_count / total * 100
            print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Response Times:")
        print(f"      Min: {min(self.response_times):.3f}s")
        print(f"      Max: {max(self.response_times):.3f}s")
        print(f"      Mean: {statistics.mean(self.response_times):.3f}s")
        print(f"      Median: {statistics.median(self.response_times):.3f}s")
        if len(self.response_times) >= 2:
            p95_idx = int(len(self.response_times) * 0.95)
            sorted_times = sorted(self.response_times)
            print(f"      P95: {sorted_times[p95_idx]:.3f}s")
        
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
                "timestamp": datetime.now(timezone.utc).isoformat(),
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


# ======================================================================
# SUITE 2 — REPORTING API
# ======================================================================

def run_reporting_test():
    """Test the /reports/* endpoints under moderate concurrency."""
    print("\n" + "=" * 70)
    print("Fumorive Reporting API Load Test")
    print("=" * 70)

    REPORT_USERS = 5
    REPORT_REQUESTS = 6  # one per endpoint per iteration

    def reporting_worker(worker_id: int) -> Dict[str, LoadTestStats]:
        tester = LoadTester()
        stats = {
            "sessions_summary":  LoadTestStats(),
            "fatigue_trend":     LoadTestStats(),
            "alert_report":      LoadTestStats(),
        }
        if not tester.login():
            return stats

        for _ in range(REPORT_REQUESTS):
            for endpoint, key in [
                ("/reports/sessions?days=30",           "sessions_summary"),
                ("/reports/fatigue-trend?days=7",       "fatigue_trend"),
                ("/reports/alerts?days=30",             "alert_report"),
            ]:
                start = time.time()
                try:
                    r = tester.session.get(f"{BASE_URL}{endpoint}", timeout=TIMEOUT)
                    ok = r.status_code == 200
                    err = None if ok else f"HTTP {r.status_code}: {r.text[:80]}"
                except Exception as e:
                    ok = False
                    err = str(e)
                stats[key].add_result(time.time() - start, ok, err)
                time.sleep(0.2)

        return stats

    agg: Dict[str, LoadTestStats] = {
        "sessions_summary":  LoadTestStats(),
        "fatigue_trend":     LoadTestStats(),
        "alert_report":      LoadTestStats(),
    }

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=REPORT_USERS) as ex:
        for ws in as_completed([ex.submit(reporting_worker, i) for i in range(REPORT_USERS)]):
            for k, s in ws.result().items():
                agg[k].response_times.extend(s.response_times)
                agg[k].success_count += s.success_count
                agg[k].error_count   += s.error_count
                agg[k].errors.extend(s.errors)

    print("\n" + "=" * 70)
    print("REPORTING TEST RESULTS")
    print("=" * 70)
    for name, s in agg.items():
        s.print_summary(name.replace("_", " ").title())
    total_req = sum(len(s.response_times) for s in agg.values())
    elapsed = time.time() - t0
    print(f"\nTotal Duration: {elapsed:.2f}s | Throughput: {total_req / elapsed:.2f} req/s")
    print("=" * 70)


# ======================================================================
# SUITE 3 — SECURITY HEADERS CHECK
# ======================================================================

EXPECTED_SECURITY_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options":        "DENY",
    "referrer-policy":        "strict-origin-when-cross-origin",
}

EXPECTED_CSP_DIRECTIVES = ["default-src", "frame-ancestors"]


def run_security_headers_test():
    """
    Verify that OWASP security headers are present on API responses.
    Tests both an unauthenticated endpoint (health) and an auth endpoint.
    """
    print("\n" + "=" * 70)
    print("Security Headers Verification")
    print("=" * 70)

    endpoints = [
        f"{BASE_URL}/health/live",
        f"{BASE_URL.replace('/api/v1', '')}/",
        f"{BASE_URL}/auth/login",   # POST — will get 422 but still headers
    ]

    passed = 0
    failed = 0

    for url in endpoints:
        method = "POST" if "login" in url else "GET"
        try:
            r = requests.request(method, url, timeout=10,
                                 json={} if method == "POST" else None)
        except Exception as e:
            print(f"  [ERR] Cannot reach {url}: {e}")
            failed += 1
            continue

        headers = {k.lower(): v for k, v in r.headers.items()}
        print(f"\n  {method} {url}  ->  HTTP {r.status_code}")

        for hdr, expected in EXPECTED_SECURITY_HEADERS.items():
            val = headers.get(hdr)
            if val and expected.lower() in val.lower():
                print(f"    [OK]  {hdr}: {val}")
                passed += 1
            else:
                print(f"    [MISS] {hdr}: expected '{expected}', got '{val}'")
                failed += 1

        csp = headers.get("content-security-policy", "")
        if all(d in csp for d in EXPECTED_CSP_DIRECTIVES):
            print(f"    [OK]  content-security-policy: present")
            passed += 1
        else:
            print(f"    [MISS] content-security-policy: incomplete (got: {csp[:80]})")
            failed += 1

        hsts = headers.get("strict-transport-security", "")
        if "max-age" in hsts:
            print(f"    [OK]  strict-transport-security: {hsts}")
            passed += 1
        else:
            print(f"    [MISS] strict-transport-security: missing or invalid")
            failed += 1

    print(f"\n  Summary: {passed} checks passed, {failed} failed")
    print("=" * 70)


# ======================================================================
# SUITE 4 — RATE LIMITER VERIFICATION
# ======================================================================

def run_rate_limit_test():
    """
    Fire requests rapidly against auth endpoints and verify 429 responses.
    LIMIT_AUTH = 10/minute, so 15 rapid requests should trigger rejection.
    """
    print("\n" + "=" * 70)
    print("Rate Limiter Verification (auth endpoints)")
    print("=" * 70)

    url = f"{BASE_URL}/auth/login"
    payload = {"username": "notexist@test.com", "password": "wrongpass"}

    results = {"2xx_3xx": 0, "401": 0, "429": 0, "other": 0}
    response_times = []

    BURST = 20  # Fire 20 rapid POSTs — should get 429 after the 10th

    print(f"\n  Firing {BURST} rapid requests to POST {url} ...")
    for i in range(BURST):
        t0 = time.time()
        try:
            r = requests.post(url, data=payload, timeout=10)
            elapsed = time.time() - t0
            response_times.append(elapsed)
            if r.status_code == 429:
                results["429"] += 1
            elif r.status_code == 401:
                results["401"] += 1   # expected when under limit
            elif r.status_code < 400:
                results["2xx_3xx"] += 1
            else:
                results["other"] += 1
                print(f"    [{i+1}] HTTP {r.status_code}: {r.text[:60]}")
        except Exception as e:
            results["other"] += 1
            print(f"    [{i+1}] Error: {e}")

    print(f"\n  Results from {BURST} rapid requests:")
    print(f"    401 Unauthorized (expected under limit): {results['401']}")
    print(f"    429 Rate Limited (expected after limit): {results['429']}")
    print(f"    2xx/3xx: {results['2xx_3xx']}")
    print(f"    Other errors: {results['other']}")

    if results["429"] > 0:
        print(f"\n  [OK] Rate limiter is ACTIVE — {results['429']} requests blocked")
    else:
        print(f"\n  [WARN] No 429s received — rate limiter may not be active")
        print(f"         (Check: is backend running with slowapi wired in main.py?)")

    if response_times:
        print(f"\n  Response time (mean): {statistics.mean(response_times):.3f}s")
    print("=" * 70)


# ======================================================================
# SUITE 5 — UAT (User Acceptance Testing) Real Scenarios
# ======================================================================

# Latency pass/fail thresholds
_P95_READ_S  = 0.500   # reads must complete in < 500 ms (P95)
_P95_WRITE_S = 1.000   # writes must complete in < 1 000 ms (P95)


def _p95(times: List[float]) -> float:
    if not times:
        return 0.0
    s = sorted(times)
    return s[min(int(len(s) * 0.95), len(s) - 1)]


def _assert_latency(name: str, times: List[float], threshold: float) -> bool:
    """Print latency assertion result.  Returns True if within threshold."""
    p = _p95(times)
    ok = p <= threshold
    symbol = "[OK]  " if ok else "[SLOW]"
    print(f"    {symbol} {name}: P95={p*1000:.0f}ms  threshold={threshold*1000:.0f}ms  samples={len(times)}")
    return ok


class _UATSessionLifecycle:
    """
    Scenario A — Full session lifecycle:
      login  ->  create session  ->  EEG batch ingest  ->
      create alert  ->  close session  ->  session report
    """

    def __init__(self, worker_id: int) -> None:
        self.worker_id = worker_id
        self.tester    = LoadTester()
        self.timings: Dict[str, List[float]] = {
            "create_session": [],
            "eeg_batch":      [],
            "create_alert":   [],
            "close_session":  [],
            "session_report": [],
        }

    def run(self) -> Dict[str, List[float]]:
        if not self.tester.login():
            return self.timings

        # 1. Create session
        t0 = time.time()
        resp = self.tester.session.post(
            f"{BASE_URL}/sessions",
            json={
                "session_name": f"UAT-A-user{self.worker_id}-{random.randint(100,999)}",
                "device_type":  "Muse 2",
                "session_type": "general",
            },
            timeout=TIMEOUT,
        )
        self.timings["create_session"].append(time.time() - t0)
        if resp.status_code != 201:
            return self.timings
        session_id = resp.json()["id"]

        # 2. EEG batch ingest (5 data points)
        now = datetime.now(timezone.utc)
        data_points = [
            {
                "timestamp":        (now - timedelta(seconds=i)).isoformat() + "Z",
                "raw_channels":     {"TP9": 0.12, "AF7": 0.34, "AF8": 0.45, "TP10": 0.23},
                "delta_power":      round(random.uniform(0.1, 0.5), 4),
                "theta_power":      round(random.uniform(0.2, 0.6), 4),
                "alpha_power":      round(random.uniform(0.3, 0.7), 4),
                "beta_power":       round(random.uniform(0.1, 0.4), 4),
                "gamma_power":      round(random.uniform(0.05, 0.2), 4),
                "theta_alpha_ratio":round(random.uniform(0.5, 1.5), 4),
                "signal_quality":   round(random.uniform(0.7, 1.0), 3),
                "eeg_fatigue_score":round(random.uniform(30, 70), 2),
            }
            for i in range(5)
        ]
        t0 = time.time()
        self.tester.session.post(
            f"{BASE_URL}/eeg/batch?session_id={session_id}",
            json=data_points,
            timeout=TIMEOUT,
        )
        self.timings["eeg_batch"].append(time.time() - t0)

        # 3. Create alert
        t0 = time.time()
        self.tester.session.post(
            f"{BASE_URL}/alerts",
            json={
                "session_id":     session_id,
                "timestamp":      datetime.now(timezone.utc).isoformat(),
                "alert_level":    "warning",
                "fatigue_score":  72.5,
                "eeg_contribution": 0.6,
                "trigger_reason": "high_theta_alpha",
            },
            timeout=TIMEOUT,
        )
        self.timings["create_alert"].append(time.time() - t0)

        # 4. Close session (complete)
        t0 = time.time()
        self.tester.session.patch(
            f"{BASE_URL}/sessions/{session_id}",
            json={"session_status": "completed"},
            timeout=TIMEOUT,
        )
        self.timings["close_session"].append(time.time() - t0)

        # 5. Session statistics report
        t0 = time.time()
        self.tester.session.get(
            f"{BASE_URL}/reports/sessions?days=1",
            timeout=TIMEOUT,
        )
        self.timings["session_report"].append(time.time() - t0)

        return self.timings


class _UATDashboardMonitor:
    """
    Scenario B — Dashboard monitoring user:
      login  ->  (list sessions + list alerts + fatigue trend + session stats) × N
    """

    def __init__(self, worker_id: int, iterations: int = 3) -> None:
        self.worker_id  = worker_id
        self.iterations = iterations
        self.tester     = LoadTester()
        self.timings: Dict[str, List[float]] = {
            "list_sessions":  [],
            "list_alerts":    [],
            "fatigue_trend":  [],
            "session_stats":  [],
        }

    def run(self) -> Dict[str, List[float]]:
        if not self.tester.login():
            return self.timings

        for _ in range(self.iterations):
            for endpoint, key in [
                (f"{BASE_URL}/sessions?page=1&page_size=10",     "list_sessions"),
                (f"{BASE_URL}/alerts?limit=20&offset=0",         "list_alerts"),
                (f"{BASE_URL}/reports/fatigue-trend?days=7",      "fatigue_trend"),
                (f"{BASE_URL}/reports/sessions?days=30",          "session_stats"),
            ]:
                t0 = time.time()
                try:
                    self.tester.session.get(endpoint, timeout=TIMEOUT)
                except Exception:
                    pass
                self.timings[key].append(time.time() - t0)
            time.sleep(0.1)

        return self.timings


def run_uat_test():
    """
    UAT: Realistic multi-user scenarios with P95 latency assertions.

    Scenario A (5 users): Full session lifecycle
    Scenario B (5 users): Dashboard monitoring (read-heavy)
    """
    print("\n" + "=" * 70)
    print("UAT - User Acceptance Testing (Real Scenarios)")
    print("=" * 70)

    USERS_A = 5
    USERS_B = 5

    merged: Dict[str, List[float]] = {}

    def _merge(timings: Dict[str, List[float]]) -> None:
        for k, v in timings.items():
            merged.setdefault(k, []).extend(v)

    # --- Scenario A ---
    print(f"\n  Scenario A: Full session lifecycle ({USERS_A} concurrent users)")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=USERS_A) as ex:
        for fut in as_completed(
            [ex.submit(_UATSessionLifecycle(i).run) for i in range(USERS_A)]
        ):
            _merge(fut.result())
    print(f"  Completed in {time.time() - t0:.2f}s")

    # --- Scenario B ---
    print(f"\n  Scenario B: Dashboard monitoring ({USERS_B} concurrent users, 3 iterations each)")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=USERS_B) as ex:
        for fut in as_completed(
            [ex.submit(_UATDashboardMonitor(i).run) for i in range(USERS_B)]
        ):
            _merge(fut.result())
    print(f"  Completed in {time.time() - t0:.2f}s")

    # --- Latency assertions ---
    _WRITE_OPS = {"create_session", "eeg_batch", "create_alert", "close_session"}
    print("\n  Latency Assertions (P95 thresholds):")
    passed = failed = 0
    for name, times in sorted(merged.items()):
        if not times:
            continue
        threshold = _P95_WRITE_S if name in _WRITE_OPS else _P95_READ_S
        if _assert_latency(name, times, threshold):
            passed += 1
        else:
            failed += 1

    print(f"\n  Result: {passed} ops within threshold, {failed} ops exceeded threshold")
    if failed == 0:
        print("  [PASS] All latency assertions PASSED")
    else:
        print("  [WARN] Some operations exceeded thresholds - review before deploying to production")
    print("=" * 70)


# ======================================================================
# ENTRY POINT
# ======================================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fumorive load test runner")
    parser.add_argument(
        "--suite",
        choices=["all", "crud", "reporting", "security", "ratelimit", "uat"],
        default="all",
        help="Which test suite to run (default: all)",
    )
    args = parser.parse_args()

    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health", timeout=5)
        if response.status_code not in (200, 404):
            # /health was moved to /api/v1/health — try the new path
            response = requests.get(f"{BASE_URL}/health/live", timeout=5)
            if response.status_code != 200:
                print("[ERR] Backend is not healthy. Please start the backend first.")
                sys.exit(1)
    except Exception:
        print("[ERR] Cannot connect to backend. Please start the backend first.")
        print("   Run: python main.py")
        sys.exit(1)

    suite = args.suite

    if suite in ("all", "crud"):
        run_load_test()

    if suite in ("all", "reporting"):
        run_reporting_test()

    if suite in ("all", "security"):
        run_security_headers_test()

    if suite in ("all", "ratelimit"):
        run_rate_limit_test()

    if suite in ("all", "uat"):
        run_uat_test()

    print("\n[DONE] All requested test suites completed.")
