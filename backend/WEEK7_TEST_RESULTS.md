# Week 7 — Backend Progress Report
**Date:** February 19, 2026  
**Backend:** FastAPI + TimescaleDB + Redis  
**Scope:** UAT, TimescaleDB Optimization, API Docs Audit, Health Monitoring

---

## Executive Summary

| Task | Status | Catatan |
|------|--------|---------|
| UAT Load Test (real scenarios) | ✅ PASS | 9/9 latency assertions passed |
| TimescaleDB Query Optimization | ✅ Done | Compression policy + Redis caching di reporting |
| API Documentation Audit | ✅ Done | 11 tags lengkap di Swagger (sebelumnya 6) |
| Health Monitoring Setup | ✅ Done | `/health/metrics` endpoint baru + psutil system info |

---

## Task 1 — UAT Load Test (Real Scenarios)

**Command:** `python load_test.py --suite uat`  
**File:** `load_test.py` (suite baru ditambah)

### Deskripsi Skenario

| Skenario | User | Alur |
|----------|------|------|
| **A — Full Session Lifecycle** | 5 concurrent | `login → create session → EEG batch ingest → create alert → close session → session report` |
| **B — Dashboard Monitoring** | 5 concurrent | `login → (list sessions + list alerts + fatigue trend + session stats) × 3 iterasi` |

### Hasil Latency Assertions

| Operation | P95 Actual | Threshold | Status |
|-----------|-----------|-----------|--------|
| create_session | 97ms | 1 000ms | **[OK]** |
| eeg_batch (5 data points) | 23ms | 1 000ms | **[OK]** |
| create_alert | 285ms | 1 000ms | **[OK]** |
| close_session | 95ms | 1 000ms | **[OK]** |
| session_report (GET /reports/sessions) | 40ms | 500ms | **[OK]** |
| list_sessions | 257ms | 500ms | **[OK]** |
| list_alerts | 79ms | 500ms | **[OK]** |
| fatigue_trend | 34ms | 500ms | **[OK]** |
| session_stats | 54ms | 500ms | **[OK]** |

**Hasil: 9/9 operasi dalam threshold → UAT PASSED**

### Catatan

- Write ops threshold: **1 000ms P95** (create, update, delete)
- Read ops threshold: **500ms P95** (list, report, trend)
- Semua operasi jauh di bawah threshold, termasuk EEG batch ingest (23ms)
- `datetime.utcnow()` deprecation warnings diperbaiki (`→ datetime.now(timezone.utc)`)

---

## Task 2 — TimescaleDB Query Optimization

### 2a. Compression Policy — Migration 004

**File:** `migrations/004_compression_policy.sql`

| Tabel | Compress After | Segment By | Order By |
|-------|---------------|------------|----------|
| `eeg_data` | 7 hari | `session_id` | `timestamp DESC` |
| `face_detection_events` | 7 hari | `session_id` | `timestamp DESC` |
| `game_events` | 7 hari | `session_id` | `timestamp DESC` |
| `alerts` | 30 hari | `session_id` | `timestamp DESC` |

**Estimasi penghematan storage:** 5–10× (TimescaleDB columnar compression)  
**Cara apply:**
```bash
psql -U postgres -d fumorive -f migrations/004_compression_policy.sql
```

### 2b. Redis Caching di Reporting Endpoints

**File:** `app/api/routes/reporting.py`

| Endpoint | Cache Key | TTL |
|----------|-----------|-----|
| `GET /reports/sessions` | `report:sessions:{user_id}:{days}` | 5 menit |
| `GET /reports/fatigue-trend` | `report:fatigue:{user_id}:{days}:{bucket}` | 5 menit |
| `GET /reports/alerts` | `report:alerts:{user_id}:{days}` | 5 menit |

- Pertama kali: query ke TimescaleDB → cache ke Redis
- Request berikutnya (dalam 5 menit): langsung dari Redis, tanpa DB query
- Cache gracefully di-skip jika Redis tidak available (fallback ke DB)

---

## Task 3 — API Documentation Audit

**File:** `main.py`

### Swagger Tags — Sebelum vs Sesudah

| Tag | Sebelum | Sesudah |
|-----|---------|---------|
| Authentication | ✅ | ✅ |
| Users | ✅ | ✅ |
| Sessions | ✅ | ✅ |
| WebSocket | ✅ | ✅ |
| Reports | ✅ | ✅ |
| Health | ✅ (deskripsi pendek) | ✅ (deskripsi lengkap) |
| EEG Data | ❌ missing | ✅ ditambah |
| Alerts | ❌ missing | ✅ ditambah |
| Face Detection | ❌ missing | ✅ ditambah |
| Export | ❌ missing | ✅ ditambah |
| Playback | ❌ missing | ✅ ditambah |

**Swagger UI:** `http://localhost:8000/api/docs`  
**ReDoc:** `http://localhost:8000/api/redoc`

---

## Task 4 — Health Monitoring Setup

### 4a. Endpoint Baru: `GET /api/v1/health/metrics`

**File:** `app/core/metrics.py` (baru), `app/api/routes/health.py`

In-process metrics dari rolling window **1 000 request terakhir** (tanpa Prometheus/external dependency):

```json
{
  "uptime_seconds": 186.8,
  "total_requests": 118,
  "error_rate": {
    "4xx": 1,   "5xx": 0,
    "4xx_pct": 0.85,   "5xx_pct": 0.0
  },
  "slow_requests": {
    "count": 9,   "threshold_ms": 500,   "pct": 7.63
  },
  "response_time_ms": {
    "mean": 119.0,   "p50": 27.4,   "p95": 1022.9,   "p99": 1224.8
  },
  "throughput": {
    "approx_rps": 0.63,   "window_samples": 118
  },
  "top_paths": [
    {"path": "/api/v1/sessions",         "hits": 20},
    {"path": "/api/v1/alerts",           "hits": 20},
    {"path": "/api/v1/reports/sessions", "hits": 20},
    ...
  ]
}
```

**Fitur:**
- `total_requests` — all requests sejak process start
- `error_rate` — 4xx/5xx counts + persentase
- `slow_requests` — requests >500ms (threshold configurable di `metrics.py`)
- `response_time_ms` — mean, P50, P95, P99
- `throughput` — approximate RPS + window size
- `top_paths` — 10 endpoint terpopuler, UUID di-normalize ke `{id}`

### 4b. Endpoint yang Sudah Ada: `GET /api/v1/health`

Sekarang menampilkan real system metrics via **psutil**:

```json
{
  "status": "healthy",
  "system": {
    "memory_used_pct": 87.4,
    "disk_used_pct": 81.1,
    "cpu_count": 12
  }
}
```

Sebelumnya: `{"note": "install psutil for system metrics"}`  
Sekarang: real data (memory, disk, CPU count)  
`psutil==5.9.8` ditambahkan ke `requirements.txt`

### 4c. Request Logging Enhancement

**File:** `main.py`

- Log level otomatis naik ke **WARNING** jika request >500ms
- Field `"slow": true/false` ditambahkan ke setiap log line
- Path di-normalize (UUID dan numeric ID diganti `{id}`) untuk grouping metrics

---

## Health Endpoints Summary

| Endpoint | Fungsi | Cocok untuk |
|----------|--------|-------------|
| `GET /api/v1/health/live` | Is process alive? | K8s livenessProbe |
| `GET /api/v1/health/ready` | DB + Redis reachable? | K8s readinessProbe |
| `GET /api/v1/health` | Full status: DB, Redis, cache, system | Dashboard manusia |
| `GET /api/v1/health/metrics` | Per-request performance metrics | Monitoring produksi |

---

## Files Modified / Created

| File | Perubahan |
|------|-----------|
| `load_test.py` | Suite `uat` baru (Scenario A + B + latency assertions), fixed `datetime.utcnow()` → `datetime.now(timezone.utc)` |
| `app/core/metrics.py` | **BARU** — `_AppMetrics` class, thread-safe rolling window, `app_metrics` singleton |
| `app/api/routes/health.py` | Import `app_metrics`, tambah endpoint `GET /health/metrics` |
| `app/api/routes/reporting.py` | Tambah Redis caching layer di 3 endpoints (session stats, fatigue trend, alerts) |
| `main.py` | Import `re` + `app_metrics`, wiring metrics ke middleware, 5 openapi_tags baru, slow-request WARNING |
| `migrations/004_compression_policy.sql` | **BARU** — TimescaleDB compression policy untuk 4 hypertables |
| `requirements.txt` | Tambah `psutil==5.9.8` |

---

## Blocked Items (Menunggu Tim Lain)

| Item | Waiting for |
|------|-------------|
| EEG device integration testing end-to-end | EEG Engineer + Muse 2 hardware |
| Frontend ↔ Backend integration final E2E | Frontend Developer |
| Fix issues dari UAT (jika ada dari tim lain) | UAT masing-masing role |
| Production deployment (server, domain, SSL) | Akses server produksi |

---

## Conclusion

Week 7 backend tasks yang bisa dikerjakan secara independen — **semua selesai**:

- ✅ UAT 9/9 latency assertions PASSED — backend siap production load
- ✅ TimescaleDB storage optimization siap di-apply ke production
- ✅ Swagger/OpenAPI documentation lengkap (11 tags)
- ✅ Health monitoring production-grade: liveness, readiness, metrics, system info

**Pending sebelum production deployment:**
1. Apply `migrations/004_compression_policy.sql` ke production database
2. Set `LIMIT_AUTH=10/minute` (atau hapus dari `.env` agar pakai default)
3. Integrasikan dengan tim lain setelah masing-masing role selesai
