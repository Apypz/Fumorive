"""
Fumorive - Locust Load Testing Configuration & Scenarios

This file documents all available load test scenarios and how to run them.

=============================================================================
QUICK START
=============================================================================

1. Make sure backend is running:
   cd backend && python main.py

2. Create test user (one-time setup):
   python tests/performance/setup_load_test_user.py

3. Run load test with Web UI:
   locust -f tests/performance/locustfile.py --host=http://localhost:8000

4. Open browser: http://localhost:8089
   - Set number of users (e.g., 20)
   - Set spawn rate (e.g., 5 users/second)
   - Click "Start Swarming"

=============================================================================
HEADLESS MODE (No Browser UI)
=============================================================================

# Quick smoke test - 5 users, 30 seconds
locust -f tests/performance/locustfile.py --host=http://localhost:8000 \
    --headless -u 5 -r 2 --run-time 30s

# Standard load test - 20 users, 60 seconds, save HTML report
locust -f tests/performance/locustfile.py --host=http://localhost:8000 \
    --headless -u 20 -r 5 --run-time 60s \
    --html tests/performance/report.html \
    --csv tests/performance/results

# Stress test - 50 users, 2 minutes
locust -f tests/performance/locustfile.py --host=http://localhost:8000 \
    --headless -u 50 -r 10 --run-time 120s \
    --html tests/performance/stress_report.html

=============================================================================
USER SCENARIOS
=============================================================================

AuthUser (weight=1, ~10% traffic):
  - Register new users
  - Login / failed login
  - Simulates new user onboarding

RegularUser (weight=6, ~60% traffic):
  - GET /users/me (profile)
  - GET/POST /sessions (session management)
  - GET /sessions/{id}/eeg (playback)
  - GET /sessions/{id}/alerts
  Wait time: 1-4 seconds (realistic browsing)

DataIngestionUser (weight=3, ~30% traffic):
  - POST /sessions/{id}/eeg (EEG stream at ~2-10Hz)
  - POST /sessions/{id}/face (face events)
  - POST /alerts (fatigue alerts)
  Wait time: 0.1-0.5 seconds (real-time data)

=============================================================================
PERFORMANCE TARGETS (Week 5 Baseline)
=============================================================================

| Endpoint              | Target p95 | Target p99 |
|-----------------------|------------|------------|
| POST /auth/login/json | < 500ms    | < 1000ms   |
| GET /users/me         | < 200ms    | < 500ms    |
| GET /sessions         | < 300ms    | < 700ms    |
| POST /sessions        | < 400ms    | < 800ms    |
| POST /sessions/eeg    | < 200ms    | < 500ms    |
| POST /alerts          | < 200ms    | < 500ms    |

Error Rate Target: < 1% for all endpoints

=============================================================================
INTERPRETING RESULTS
=============================================================================

Key metrics to watch in Locust UI:
- RPS (Requests Per Second): Higher = better throughput
- p50/p95/p99 response times: Lower = better latency
- Failure rate: Should be < 1%

Common issues:
- High p99 but low p50: Occasional slow requests (DB query, GC pause)
- High failure rate: Server overloaded or bug in endpoint
- Increasing response times: Memory leak or connection pool exhaustion
"""
