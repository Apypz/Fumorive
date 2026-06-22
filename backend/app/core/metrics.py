"""
In-process Application Metrics
Thread-safe counters and rolling response-time window.

Used by GET /api/v1/health/metrics for lightweight production monitoring
without requiring a full Prometheus/Grafana stack.

Week 7 — Health Monitoring Setup
"""

import threading
import time
from collections import deque
from typing import Dict, Any

# ============================================
# CONFIGURATION
# ============================================

_WINDOW_SIZE      = 1_000   # Keep last N response times in memory
_SLOW_THRESHOLD_MS = 500    # Requests slower than this are flagged


class _AppMetrics:
    """
    Thread-safe in-memory metrics store.
    All writes/reads use a single lock to prevent race conditions.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._started_at: float = time.time()

        # Request counters
        self.total_requests:  int = 0
        self.errors_4xx:      int = 0
        self.errors_5xx:      int = 0
        self.slow_requests:   int = 0   # P95 > _SLOW_THRESHOLD_MS

        # Rolling window of response times (seconds)
        self._response_times: deque = deque(maxlen=_WINDOW_SIZE)

        # Per-path aggregates (top 20 hottest paths)
        self._path_counts: Dict[str, int] = {}
        self._MAX_PATHS = 20

    # ----------------------------------------------------------------
    # WRITE — called per-request from HTTP middleware
    # ----------------------------------------------------------------

    def record(self, duration_s: float, status_code: int, path: str = "") -> None:
        """
        Record a single completed request.

        Args:
            duration_s:  Wall-clock duration in seconds
            status_code: HTTP response status code
            path:        Normalised URL path (already stripped of IDs)
        """
        with self._lock:
            self.total_requests += 1
            self._response_times.append(duration_s)

            if 400 <= status_code < 500:
                self.errors_4xx += 1
            elif status_code >= 500:
                self.errors_5xx += 1

            if duration_s * 1000 > _SLOW_THRESHOLD_MS:
                self.slow_requests += 1

            # Track top paths (cap at _MAX_PATHS to prevent unbounded growth)
            if path and (path in self._path_counts or len(self._path_counts) < self._MAX_PATHS):
                self._path_counts[path] = self._path_counts.get(path, 0) + 1

    # ----------------------------------------------------------------
    # READ — called by /health/metrics endpoint
    # ----------------------------------------------------------------

    def snapshot(self) -> Dict[str, Any]:
        """Return a point-in-time snapshot (safe to serialise as JSON)."""
        with self._lock:
            times = list(self._response_times)
            path_counts = dict(self._path_counts)
            errors_4xx = self.errors_4xx
            errors_5xx = self.errors_5xx
            slow = self.slow_requests
            total = self.total_requests

        uptime = time.time() - self._started_at

        if times:
            sorted_t = sorted(times)
            n = len(sorted_t)
            mean  = sum(sorted_t) / n
            p50   = sorted_t[int(n * 0.50)]
            p95   = sorted_t[min(int(n * 0.95), n - 1)]
            p99   = sorted_t[min(int(n * 0.99), n - 1)]
            rps   = n / max(uptime, 1)  # rolling-window RPS (approximate)
        else:
            mean = p50 = p95 = p99 = rps = 0.0

        # Top 10 paths by hit count
        top_paths = sorted(path_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            "uptime_seconds":   round(uptime, 1),
            "total_requests":   total,
            "error_rate": {
                "4xx": errors_4xx,
                "5xx": errors_5xx,
                "4xx_pct": round(errors_4xx / max(total, 1) * 100, 2),
                "5xx_pct": round(errors_5xx / max(total, 1) * 100, 2),
            },
            "slow_requests": {
                "count":        slow,
                "threshold_ms": _SLOW_THRESHOLD_MS,
                "pct":          round(slow / max(total, 1) * 100, 2),
            },
            "response_time_ms": {
                "mean": round(mean * 1000, 1),
                "p50":  round(p50  * 1000, 1),
                "p95":  round(p95  * 1000, 1),
                "p99":  round(p99  * 1000, 1),
            },
            "throughput": {
                "approx_rps":    round(rps, 2),
                "window_samples": len(times),
            },
            "top_paths": [{"path": p, "hits": c} for p, c in top_paths],
        }


# ============================================
# MODULE-LEVEL SINGLETON
# ============================================

app_metrics = _AppMetrics()
