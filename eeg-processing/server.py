"""
server.py
=========
EEG Streaming Server - Bridge antara Muse 2 dan Backend Fumorive

Purpose:
- Akuisisi real-time EEG dari Muse 2 via LSL
- Proses dan ekstrak fitur kognitif
- Stream data ke Backend via HTTP POST

Usage:
    python server.py [--session-id SESSION_ID] [--backend-url URL]
"""

import time
import argparse
import logging
import requests
from datetime import datetime
from typing import Optional
import numpy as np

from eeg import EEGAcquisition, EEGPreprocessor, EEGFeatureExtractor, CognitiveAnalyzer
from config import (
    SAMPLING_RATE, CHUNK_DURATION, SERVER_HOST, SERVER_PORT,
    LOWCUT_FREQ, HIGHCUT_FREQ, NOTCH_FREQ
)


# ===========================
# LOGGING SETUP
# ===========================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)


# ===========================
# STATE MAPPING (EEG -> Backend)
# ===========================
# Map internal states to backend-compatible states
STATE_MAP = {
    "fatigue": "fatigued",
    "stress": "alert",       # Stress = masih alert tapi tegang
    "focused": "alert",      # Focused = alert
    "relaxed": "alert",      # Relaxed = masih alert tapi santai
    "normal": "alert",       # Normal = alert baseline
    "unknown": "alert"       # Default ke alert
}

# Map untuk drowsiness detection berdasarkan skor
def get_backend_state(state: str, fatigue_score: float) -> str:
    """
    Convert internal state ke format backend.
    
    Backend expects: "alert", "drowsy", "fatigued"
    """
    if fatigue_score >= 70:
        return "fatigued"
    elif fatigue_score >= 40 or state == "fatigue":
        return "drowsy"
    else:
        return STATE_MAP.get(state, "alert")


# ===========================
# EEG SERVER CLASS
# ===========================
class EEGStreamingServer:
    """
    Server untuk streaming EEG data ke Fumorive Backend.
    """
    
    def __init__(
        self,
        session_id: str,
        backend_url: str = "http://localhost:8000",
        save_to_db: bool = False
    ):
        """
        Initialize EEG Streaming Server.
        
        Parameters
        ----------
        session_id : str
            UUID session dari backend
        backend_url : str
            URL backend Fumorive
        save_to_db : bool
            Apakah menyimpan ke database (untuk recording)
        """
        self.session_id = session_id
        self.backend_url = backend_url
        self.save_to_db = save_to_db
        self.endpoint = f"{backend_url}/api/v1/eeg/stream"
        
        # Statistics
        self.samples_sent = 0
        self.errors = 0
        self.start_time = None
        
        # EEG Components (will be initialized on start)
        self.eeg: Optional[EEGAcquisition] = None
        self.preprocessor: Optional[EEGPreprocessor] = None
        self.extractor: Optional[EEGFeatureExtractor] = None
        self.analyzer: Optional[CognitiveAnalyzer] = None
        
        logger.info(f"EEG Server initialized")
        logger.info(f"  Session: {session_id}")
        logger.info(f"  Backend: {backend_url}")
    
    def _initialize_components(self):
        """Initialize EEG processing components."""
        logger.info("Initializing EEG components...")
        
        # Acquisition
        self.eeg = EEGAcquisition()
        self.eeg.connect()
        
        # Preprocessing
        self.preprocessor = EEGPreprocessor(
            sampling_rate=self.eeg.sampling_rate,
            lowcut=LOWCUT_FREQ,
            highcut=HIGHCUT_FREQ,
            notch_freq=NOTCH_FREQ,
            driving_mode=True
        )
        
        # Feature extraction
        self.extractor = EEGFeatureExtractor(
            sampling_rate=self.eeg.sampling_rate
        )
        
        # Cognitive analyzer
        self.analyzer = CognitiveAnalyzer()
        
        logger.info("EEG components initialized successfully")
    
    def _calibrate(self, duration: float = 10.0):
        """
        Run calibration phase.
        
        Parameters
        ----------
        duration : float
            Calibration duration in seconds
        """
        logger.info("=" * 50)
        logger.info(" CALIBRATION PHASE")
        logger.info("=" * 50)
        logger.info("Instruksi: Duduk tegak, mata terbuka, rileks tapi alert")
        logger.info(f"Durasi: {duration} detik")
        
        self.analyzer.start_calibration()
        
        num_samples = int(duration / CHUNK_DURATION)
        for i in range(num_samples):
            logger.info(f"  Calibrating... {(i+1)*CHUNK_DURATION:.0f}/{duration:.0f}s")
            
            raw_data, _ = self.eeg.pull_chunk(duration=CHUNK_DURATION)
            if raw_data.size > 0:
                clean_data, quality = self.preprocessor.process(raw_data)
                if clean_data.size > 0 and quality > 0.3:
                    features = self.extractor.extract(clean_data)
                    self.analyzer.add_calibration_sample(features)
        
        if self.analyzer.calibrated:
            logger.info("Calibration complete!")
            logger.info(f"  Baseline θ/α: {self.analyzer.baseline['theta_alpha']:.3f}")
            logger.info(f"  Baseline β/α: {self.analyzer.baseline['beta_alpha']:.3f}")
        else:
            logger.warning("Calibration incomplete, using default thresholds")
    
    def _process_chunk(self) -> Optional[dict]:
        """
        Process one chunk of EEG data.
        
        Returns
        -------
        dict or None
            Processed data ready for backend, or None if invalid
        """
        # 1. Acquire
        raw_data, timestamps = self.eeg.pull_chunk(duration=CHUNK_DURATION)
        if raw_data.size == 0:
            return None
        
        # 2. Preprocess
        clean_data, quality = self.preprocessor.process(raw_data)
        if clean_data.size == 0 or quality < 0.2:
            return None
        
        # 3. Extract features
        features = self.extractor.extract(clean_data)
        if not features:
            return None
        
        # 4. Analyze cognitive state
        result = self.analyzer.analyze(features, signal_quality=quality)
        
        # 5. Calculate fatigue score (0-100 scale for backend)
        theta_alpha = result['metrics'].get('theta_alpha', 1.0)
        fatigue_score = min(100, max(0, (theta_alpha - 1.0) * 50 + 30))
        
        # Adjust based on detected state
        if result['state'] == 'fatigue':
            fatigue_score = max(fatigue_score, 50 + result['confidence'] * 45)
        
        # 6. Get backend-compatible state
        backend_state = get_backend_state(result['state'], fatigue_score)
        
        # 7. Get channel values (average of last chunk)
        channel_values = {
            "TP9": float(np.mean(raw_data[:, 0])) if raw_data.shape[1] > 0 else 0,
            "AF7": float(np.mean(raw_data[:, 1])) if raw_data.shape[1] > 1 else 0,
            "AF8": float(np.mean(raw_data[:, 2])) if raw_data.shape[1] > 2 else 0,
            "TP10": float(np.mean(raw_data[:, 3])) if raw_data.shape[1] > 3 else 0
        }
        
        # 8. Build payload
        payload = {
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat() + "Z",
            "sample_rate": int(self.eeg.sampling_rate),
            "channels": channel_values,
            "processed": {
                "theta_power": float(np.mean(features.get('theta', [0]))),
                "alpha_power": float(np.mean(features.get('alpha', [0]))),
                "beta_power": float(np.mean(features.get('beta', [0]))),
                "gamma_power": float(np.mean(features.get('gamma', [0]))),
                "theta_alpha_ratio": float(result['metrics'].get('theta_alpha', 1.0)),
                "beta_alpha_ratio": float(result['metrics'].get('beta_alpha', 1.0)),
                "fatigue_score": round(fatigue_score, 2),
                "cognitive_state": backend_state,
                "signal_quality": float(quality),
                # Internal state (untuk debugging)
                "_internal_state": result['state'],
                "_confidence": result['confidence']
            },
            "save_to_db": self.save_to_db
        }
        
        return payload
    
    def _send_to_backend(self, payload: dict) -> bool:
        """
        Send data to backend via HTTP POST.
        
        Returns True if successful.
        """
        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                timeout=1.0
            )
            
            if response.status_code == 200:
                self.samples_sent += 1
                return True
            else:
                self.errors += 1
                logger.warning(f"Backend error: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            self.errors += 1
            if self.errors == 1:
                logger.error("Cannot connect to backend. Is it running?")
            return False
        except Exception as e:
            self.errors += 1
            logger.error(f"Send error: {e}")
            return False
    
    def start(self, calibrate: bool = True):
        """
        Start EEG streaming server.
        
        Parameters
        ----------
        calibrate : bool
            Run calibration phase before streaming
        """
        logger.info("=" * 60)
        logger.info(" FUMORIVE EEG STREAMING SERVER")
        logger.info("=" * 60)
        
        try:
            # Initialize
            self._initialize_components()
            
            # Calibrate
            if calibrate:
                self._calibrate()
            
            # Start streaming
            logger.info("")
            logger.info("=" * 60)
            logger.info(" STREAMING TO BACKEND")
            logger.info("=" * 60)
            logger.info(f"Endpoint: {self.endpoint}")
            logger.info("Press Ctrl+C to stop")
            logger.info("")
            
            self.start_time = time.time()
            last_log = time.time()
            
            while True:
                # Process chunk
                payload = self._process_chunk()
                
                if payload:
                    # Send to backend
                    success = self._send_to_backend(payload)
                    
                    # Log progress every 5 seconds
                    now = time.time()
                    if now - last_log >= 5.0:
                        elapsed = now - self.start_time
                        state = payload['processed']['cognitive_state']
                        fatigue = payload['processed']['fatigue_score']
                        internal = payload['processed']['_internal_state']
                        
                        logger.info(
                            f"[{elapsed:.0f}s] State: {state} ({internal}) | "
                            f"Fatigue: {fatigue:.0f}% | "
                            f"Sent: {self.samples_sent} | Errors: {self.errors}"
                        )
                        last_log = now
                
                # Control rate
                time.sleep(0.5)
        
        except KeyboardInterrupt:
            logger.info("")
            logger.info("Stopping EEG server...")
        
        finally:
            if self.eeg:
                self.eeg.close()
            
            # Print summary
            elapsed = time.time() - self.start_time if self.start_time else 0
            logger.info("")
            logger.info("=" * 60)
            logger.info(" SESSION SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Duration: {elapsed:.1f} seconds")
            logger.info(f"Samples sent: {self.samples_sent}")
            logger.info(f"Errors: {self.errors}")
            logger.info("Server stopped cleanly")


# ===========================
# MAIN ENTRY POINT
# ===========================
def main():
    parser = argparse.ArgumentParser(
        description="Fumorive EEG Streaming Server"
    )
    parser.add_argument(
        "--session-id",
        type=str,
        required=True,
        help="Session UUID from backend (required)"
    )
    parser.add_argument(
        "--backend-url",
        type=str,
        default="http://localhost:8000",
        help="Backend URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--save-db",
        action="store_true",
        help="Save data to database"
    )
    parser.add_argument(
        "--no-calibrate",
        action="store_true",
        help="Skip calibration phase"
    )
    
    args = parser.parse_args()
    
    server = EEGStreamingServer(
        session_id=args.session_id,
        backend_url=args.backend_url,
        save_to_db=args.save_db
    )
    
    server.start(calibrate=not args.no_calibrate)


if __name__ == "__main__":
    main()
