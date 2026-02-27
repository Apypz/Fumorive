"""
analysis.py
===========
Cognitive state analysis for Driver Monitoring System.

EEG Markers untuk Driving:
- FATIGUE:  High Theta, Low Alpha → θ/α > 1.5
- STRESS:   Very High Beta, Very Low Alpha → β/α > 2.0 + α power sangat rendah
- FOCUSED:  Moderate-High Beta, Low Alpha → β/α 1.2-1.8, stabil
- RELAXED:  High Alpha, Low Beta → α/β > 1.3
- NORMAL:   Balanced ratios → semua ratio mendekati 1.0
"""

import time
import numpy as np
from typing import Dict, Any, Optional
from collections import deque, Counter


class CognitiveAnalyzer:
    """
    Cognitive state analyzer optimized for driver monitoring.
    
    Key improvements:
    - Proper distinction between FOCUSED vs STRESS
    - NORMAL state as the default balanced state
    - RELAXED state added (distinct from focused)
    - Multi-metric scoring instead of sequential if-else
    """

    # =========================
    # THRESHOLDS (Relative to baseline)
    # =========================
    # These are RELATIVE thresholds after baseline normalization
    THRESHOLDS = {
        "fatigue": {
            "theta_alpha_min": 1.4,      # θ/α harus di atas ini
            "alpha_power_max": 0.8       # α power harus rendah
        },
        "stress": {
            "beta_alpha_min": 1.8,       # β/α harus tinggi banget
            "theta_alpha_max": 1.2,      # θ/α harus rendah (tidak ngantuk)
            "variability_min": 0.15      # high frequency variability
        },
        "focused": {
            "beta_alpha_min": 1.2,       # β/α moderate-high
            "beta_alpha_max": 1.8,       # tapi tidak setinggi stress
            "theta_alpha_max": 1.3,      # tidak ngantuk
            "stability_min": 0.7         # signal harus stabil
        },
        "relaxed": {
            "alpha_beta_min": 1.3,       # α/β tinggi
            "theta_alpha_max": 1.2       # tidak ngantuk
        }
    }

    # =========================
    # HYSTERESIS CONFIG
    # =========================
    # Each state has ENTRY (higher, harder to enter) and EXIT (lower, easier to exit)
    # thresholds. The system must exceed ENTRY to switch into a state, but can
    # only leave when it falls below EXIT — preventing rapid flickering.
    HYSTERESIS = {
        "fatigue":  {"entry": 0.60, "exit": 0.40, "hold_sec": 4.0},
        "stress":   {"entry": 0.70, "exit": 0.45, "hold_sec": 3.0},
        "focused":  {"entry": 0.55, "exit": 0.30, "hold_sec": 2.0},
        "relaxed":  {"entry": 0.50, "exit": 0.30, "hold_sec": 2.0},
        "normal":   {"entry": 0.00, "exit": 0.00, "hold_sec": 1.0},  # always enterable
    }

    def __init__(self, history_size: int = 5):
        """
        Initialize cognitive analyzer.
        
        Parameters
        ----------
        history_size : int
            Number of samples for temporal smoothing
        """
        self.history_size = history_size
        
        # Baseline (established during calibration)
        self.baseline: Dict[str, float] = {
            "theta_alpha": 1.0,
            "beta_alpha": 1.0,
            "alpha_beta": 1.0,
            "alpha_power": 1.0,
            "beta_power": 1.0,
            "theta_power": 1.0
        }
        self.calibrated = False
        
        # Calibration buffer
        self._calibration_samples: list = []
        self._calibration_active = False
        
        # History for temporal smoothing
        self._ratio_history: Dict[str, deque] = {
            "theta_alpha": deque(maxlen=history_size),
            "beta_alpha": deque(maxlen=history_size),
            "alpha_beta": deque(maxlen=history_size)
        }
        self._state_history: deque = deque(maxlen=history_size)
        
        # Stability tracking
        self._variability_history: deque = deque(maxlen=10)

        # ---- Hysteresis state ----
        # Current confirmed state (what we report to the outside world)
        self._current_state: str = "normal"
        # Timestamp when current state was last confirmed/entered
        self._state_entered_at: float = time.time()
        # Candidate state being evaluated (must persist before promotion)
        self._candidate_state: str = "normal"
        # How many consecutive analysis cycles the candidate has been seen
        self._candidate_streak: int = 0
        # Minimum consecutive cycles before a candidate state is promoted
        self._CANDIDATE_MIN_STREAK: int = 2

    # =========================
    # CALIBRATION
    # =========================
    def start_calibration(self) -> None:
        """Start calibration phase."""
        self._calibration_samples = []
        self._calibration_active = True
        print("[CALIBRATION] Started - collecting baseline samples...")

    def add_calibration_sample(self, features: Dict[str, np.ndarray]) -> bool:
        """
        Add a sample during calibration.
        
        Returns True when calibration is complete (5+ samples).
        """
        if not self._calibration_active:
            return False
            
        if not features:
            return False
        
        sample = {
            "theta_alpha": float(np.mean(features.get("theta_alpha", [1.0]))),
            "beta_alpha": float(np.mean(features.get("beta_alpha", [1.0]))),
            "alpha_beta": float(np.mean(features.get("alpha_beta", [1.0]))),
            "alpha_power": float(np.mean(features.get("alpha", [1.0]))),
            "beta_power": float(np.mean(features.get("beta", [1.0]))),
            "theta_power": float(np.mean(features.get("theta", [1.0])))
        }
        
        self._calibration_samples.append(sample)
        
        # Need at least 5 samples for stable baseline
        if len(self._calibration_samples) >= 5:
            self._finalize_calibration()
            return True
        
        return False

    def _finalize_calibration(self) -> None:
        """Compute baseline from calibration samples."""
        if not self._calibration_samples:
            return
        
        # Use median for robustness
        for key in self.baseline.keys():
            values = [s.get(key, 1.0) for s in self._calibration_samples]
            self.baseline[key] = float(np.median(values))
            # Prevent zero baseline
            if self.baseline[key] < 0.01:
                self.baseline[key] = 1.0
        
        self.calibrated = True
        self._calibration_active = False
        print("[CALIBRATION] Complete!")

    # =========================
    # ANALYSIS HELPERS
    # =========================
    def _normalize_by_baseline(self, features: Dict[str, np.ndarray]) -> Dict[str, float]:
        """Normalize features by baseline."""
        normalized = {}
        
        for key in ["theta_alpha", "beta_alpha", "alpha_beta"]:
            raw_value = float(np.mean(features.get(key, [1.0])))
            baseline = self.baseline.get(key, 1.0)
            normalized[key] = raw_value / baseline if baseline > 0 else raw_value
        
        # Also get absolute power values
        for band in ["alpha", "beta", "theta"]:
            normalized[f"{band}_power"] = float(np.mean(features.get(band, [0.0])))
        
        return normalized

    def _apply_temporal_smoothing(self, metrics: Dict[str, float]) -> Dict[str, float]:
        """Apply moving median to smooth out noise."""
        smoothed = {}
        
        for key in ["theta_alpha", "beta_alpha", "alpha_beta"]:
            self._ratio_history[key].append(metrics[key])
            smoothed[key] = float(np.median(self._ratio_history[key]))
        
        # Copy power values without smoothing
        for key in ["alpha_power", "beta_power", "theta_power"]:
            smoothed[key] = metrics.get(key, 0.0)
        
        return smoothed

    def _compute_variability(self, metrics: Dict[str, float]) -> float:
        """Compute signal variability (indicator of stress)."""
        beta_alpha = metrics.get("beta_alpha", 1.0)
        self._variability_history.append(beta_alpha)
        
        if len(self._variability_history) < 3:
            return 0.0
        
        return float(np.std(self._variability_history))

    def _compute_stability(self) -> float:
        """Compute signal stability (1.0 = very stable, 0.0 = unstable)."""
        if len(self._state_history) < 3:
            return 0.5
        
        # Count state changes
        changes = sum(1 for i in range(1, len(self._state_history)) 
                     if self._state_history[i] != self._state_history[i-1])
        
        max_changes = len(self._state_history) - 1
        stability = 1.0 - (changes / max_changes) if max_changes > 0 else 1.0
        
        return stability

    def _compute_state_scores(
        self, 
        metrics: Dict[str, float],
        variability: float,
        stability: float
    ) -> Dict[str, float]:
        """
        Compute probability scores for each state.
        
        Returns dict with scores 0.0-1.0 for each state.
        """
        theta_alpha = metrics["theta_alpha"]
        beta_alpha = metrics["beta_alpha"]
        alpha_beta = metrics["alpha_beta"]
        
        scores = {}
        
        # ----- FATIGUE -----
        # High theta relative to alpha = drowsy
        fatigue_score = 0.0
        if theta_alpha > self.THRESHOLDS["fatigue"]["theta_alpha_min"]:
            # Score increases as theta_alpha increases beyond threshold
            excess = theta_alpha - self.THRESHOLDS["fatigue"]["theta_alpha_min"]
            fatigue_score = min(0.5 + excess * 0.5, 1.0)
        scores["fatigue"] = fatigue_score
        
        # ----- STRESS -----
        # Very high beta + high variability = stress
        stress_score = 0.0
        stress_thresh = self.THRESHOLDS["stress"]
        if beta_alpha > stress_thresh["beta_alpha_min"]:
            # Base score from high beta
            excess = beta_alpha - stress_thresh["beta_alpha_min"]
            stress_score = min(0.4 + excess * 0.3, 0.8)
            # Boost if high variability (erratic = stress)
            if variability > stress_thresh["variability_min"]:
                stress_score = min(stress_score + 0.2, 1.0)
        scores["stress"] = stress_score
        
        # ----- FOCUSED -----
        # Moderate-high beta, stable signal, not drowsy
        focused_score = 0.0
        focus_thresh = self.THRESHOLDS["focused"]
        if (focus_thresh["beta_alpha_min"] <= beta_alpha <= focus_thresh["beta_alpha_max"]
            and theta_alpha < focus_thresh["theta_alpha_max"]):
            # Base score from beta in right range
            focused_score = 0.5
            # Boost if stable
            if stability > focus_thresh["stability_min"]:
                focused_score += 0.3
            # Boost if low variability (calm focus)
            if variability < 0.1:
                focused_score += 0.2
        scores["focused"] = min(focused_score, 1.0)
        
        # ----- RELAXED -----
        # High alpha relative to beta = relaxed but alert
        relaxed_score = 0.0
        relax_thresh = self.THRESHOLDS["relaxed"]
        if (alpha_beta > relax_thresh["alpha_beta_min"] 
            and theta_alpha < relax_thresh["theta_alpha_max"]):
            excess = alpha_beta - relax_thresh["alpha_beta_min"]
            relaxed_score = min(0.5 + excess * 0.3, 1.0)
        scores["relaxed"] = relaxed_score
        
        # ----- NORMAL -----
        # Balanced state - all ratios close to 1.0
        # Normal score is high when OTHER scores are low
        normal_score = 1.0 - max(fatigue_score, stress_score * 0.8, 
                                  focused_score * 0.6, relaxed_score * 0.6)
        
        # Also check if ratios are balanced (close to 1.0)
        balance_score = 1.0
        for ratio in [theta_alpha, beta_alpha, alpha_beta]:
            deviation = abs(ratio - 1.0)
            balance_score -= deviation * 0.2
        
        normal_score = max(0.0, min(normal_score, balance_score))
        scores["normal"] = normal_score
        
        return scores

    def _select_state(self, scores: Dict[str, float]) -> tuple:
        """
        Select final state using full hysteresis.

        Algorithm:
        1. Priority override — fatigue/stress can override immediately if
           their score exceeds a high safety threshold.
        2. Hold timer — the current state is "locked" for at least
           HYSTERESIS[state]['hold_sec'] seconds before any transition.
        3. Exit threshold — the current state is only abandoned when its
           score drops below EXIT threshold.
        4. Entry threshold — a candidate state must exceed its ENTRY
           threshold AND persist for _CANDIDATE_MIN_STREAK cycles before
           becoming the new current state.

        Returns (state_name, confidence)
        """
        now = time.time()
        held_secs = now - self._state_entered_at
        hyst = self.HYSTERESIS

        # Record raw best for majority-vote history
        raw_best = max(scores, key=scores.get)
        self._state_history.append(raw_best)

        # ── 1. SAFETY PRIORITY OVERRIDE ─────────────────────────────────
        # Critical states (fatigue/stress) can break the hold timer via a
        # very high score — safety takes precedence over stability.
        if scores["fatigue"] >= 0.80 and self._current_state != "fatigue":
            self._promote("fatigue", now)
            return self._current_state, scores["fatigue"]

        if scores["stress"] >= 0.85 and self._current_state != "stress":
            self._promote("stress", now)
            return self._current_state, scores["stress"]

        # ── 2. HOLD TIMER ────────────────────────────────────────────────
        # Don't allow any transition until the minimum hold time has passed.
        min_hold = hyst[self._current_state]["hold_sec"]
        if held_secs < min_hold:
            return self._current_state, scores.get(self._current_state, 0.5)

        # ── 3. EXIT CHECK ─────────────────────────────────────────────────
        # Is the current state's score still above its EXIT threshold?
        exit_thresh = hyst[self._current_state]["exit"]
        current_score = scores.get(self._current_state, 0.0)
        if current_score >= exit_thresh:
            # Still comfortable in current state — stay.
            self._candidate_state = self._current_state
            self._candidate_streak = 0
            return self._current_state, current_score

        # ── 4. CANDIDATE PROMOTION ────────────────────────────────────────
        # Find the best candidate (excluding the state we're leaving).
        # Priority order for safety: fatigue > stress > others.
        priority = ["fatigue", "stress", "focused", "relaxed", "normal"]
        candidate = "normal"
        candidate_score = 0.0
        for state in priority:
            if state == self._current_state:
                continue
            if scores[state] >= hyst[state]["entry"]:
                candidate = state
                candidate_score = scores[state]
                break

        if candidate == self._candidate_state:
            self._candidate_streak += 1
        else:
            # New candidate — reset streak
            self._candidate_state = candidate
            self._candidate_streak = 1

        # Promote once the candidate has been consistent enough
        if self._candidate_streak >= self._CANDIDATE_MIN_STREAK:
            self._promote(candidate, now)
            return self._current_state, candidate_score

        # Not yet promoted — stay in current state
        return self._current_state, current_score

    def _promote(self, new_state: str, now: float) -> None:
        """Transition to a new state and reset hysteresis timers."""
        self._current_state = new_state
        self._state_entered_at = now
        self._candidate_state = new_state
        self._candidate_streak = 0

    # =========================
    # MAIN ANALYSIS
    # =========================
    def analyze(
        self,
        features: Dict[str, np.ndarray],
        signal_quality: float = 1.0
    ) -> Dict[str, Any]:
        """
        Analyze cognitive state from EEG features.
        
        Parameters
        ----------
        features : dict
            Extracted EEG features from FeatureExtractor
        signal_quality : float
            Signal quality score (0-1) from preprocessor
            
        Returns
        -------
        dict
            Analysis result with state, confidence, metrics
        """
        # Handle empty/bad data
        if not features or signal_quality < 0.2:
            return {
                "state": "unknown",
                "confidence": 0.0,
                "metrics": {"theta_alpha": 0, "beta_alpha": 0, "alpha_beta": 0},
                "scores": {},
                "quality": signal_quality
            }
        
        # Step 1: Normalize by baseline
        metrics = self._normalize_by_baseline(features)
        
        # Step 2: Apply temporal smoothing
        metrics = self._apply_temporal_smoothing(metrics)
        
        # Step 3: Compute variability and stability
        variability = self._compute_variability(metrics)
        stability = self._compute_stability()
        
        # Step 4: Compute state scores
        scores = self._compute_state_scores(metrics, variability, stability)
        
        # Step 5: Select final state
        state, confidence = self._select_state(scores)
        
        # Adjust confidence by signal quality
        confidence = confidence * signal_quality
        
        return {
            "state": state,
            "confidence": round(confidence, 2),
            "metrics": {
                "theta_alpha": round(metrics["theta_alpha"], 3),
                "beta_alpha": round(metrics["beta_alpha"], 3),
                "alpha_beta": round(metrics["alpha_beta"], 3)
            },
            "scores": {k: round(v, 2) for k, v in scores.items()},
            "quality": round(signal_quality, 2),
            "debug": {
                "variability": round(variability, 3),
                "stability": round(stability, 2),
                "calibrated": self.calibrated
            }
        }
