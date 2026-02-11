"""
EEG and Face Detection Schemas
Pydantic models for real-time EEG and face detection data
Week 3, Monday - Enhanced for HTTP endpoint
Week 4 - Added playback response schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Union, List, Any, Literal
from datetime import datetime
from uuid import UUID


class EEGDataPoint(BaseModel):
    """Schema for single EEG data point"""
    timestamp: datetime
    raw_channels: Dict[str, float] = Field(..., description="Raw EEG channel data")
    delta_power: Optional[float] = Field(None, ge=0, description="Delta band power (1-4 Hz)")
    theta_power: Optional[float] = Field(None, ge=0, description="Theta band power (4-8 Hz)")
    alpha_power: Optional[float] = Field(None, ge=0, description="Alpha band power (8-13 Hz)")
    beta_power: Optional[float] = Field(None, ge=0, description="Beta band power (13-30 Hz)")
    gamma_power: Optional[float] = Field(None, ge=0, description="Gamma band power (30-50 Hz)")
    theta_alpha_ratio: Optional[float] = Field(None, ge=0, description="Drowsiness indicator")
    beta_alpha_ratio: Optional[float] = Field(None, ge=0, description="Engagement index")
    signal_quality: Optional[float] = Field(None, ge=0, le=1, description="Signal quality (0-1)")
    cognitive_state: Optional[str] = Field(None, pattern="^(alert|drowsy|fatigued)$")
    eeg_fatigue_score: Optional[float] = Field(None, ge=0, le=100, description="EEG fatigue score (0-100)")


class EEGStreamData(BaseModel):
    """
    Schema for receiving EEG data from Python LSL middleware via HTTP
    
    This is the format that Python LSL will POST to /api/v1/eeg/stream
    """
    session_id: UUID = Field(..., description="Active driving session UUID")
    timestamp: str = Field(..., description="ISO format timestamp")
    sample_rate: int = Field(256, description="Sampling rate in Hz")
    channels: Dict[str, float] = Field(
        ..., 
        description="EEG channel values (TP9, AF7, AF8, TP10)"
    )
    processed: Dict[str, Union[float, str]] = Field(
        default_factory=dict,
        description="Processed metrics (theta_power, alpha_power, cognitive_state, etc.)"
    )
    save_to_db: bool = Field(
        default=False,
        description="Whether to save this data point to database"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "session_id": "123e4567-e89b-12d3-a456-426614174000",
                    "timestamp": "2026-01-19T12:00:00.123Z",
                    "sample_rate": 256,
                    "channels": {
                        "TP9": 0.123,
                        "AF7": 0.456,
                        "AF8": 0.789,
                        "TP10": 0.234
                    },
                    "processed": {
                        "theta_power": 0.45,
                        "alpha_power": 0.67,
                        "theta_alpha_ratio": 0.67,
                        "fatigue_score": 0.32
                    },
                    "save_to_db": False
                }
            ]
        }
    }


class EEGBatchData(BaseModel):
    """Schema for WebSocket streaming (legacy, still used by WebSocket)"""
    session_id: UUID
    data_points: list[EEGDataPoint]
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "session_id": "123e4567-e89b-12d3-a456-426614174000",
                    "data_points": [
                        {
                            "timestamp": "2026-01-15T10:30:00Z",
                            "raw_channels": {
                                "AF7": 0.5,
                                "AF8": 0.3,
                                "TP9": 0.2,
                                "TP10": 0.4
                            },
                            "signal_quality": 0.95
                        }
                    ]
                }
            ]
        }
    }


class FaceDetectionData(BaseModel):
    """Schema for face detection data from MediaPipe"""
    timestamp: datetime
    eye_aspect_ratio: Optional[float] = Field(None, ge=0, le=1, description="Eye Aspect Ratio (EAR)")
    mouth_aspect_ratio: Optional[float] = Field(None, ge=0, description="Mouth Aspect Ratio (MAR)")
    eyes_closed: bool = False
    yawning: bool = False
    blink_count: int = Field(default=0, ge=0)
    blink_rate: Optional[float] = Field(None, ge=0, description="Blinks per minute")
    head_yaw: Optional[float] = Field(None, description="Head rotation Y")
    head_pitch: Optional[float] = Field(None, description="Head rotation X")
    head_roll: Optional[float] = Field(None, description="Head rotation Z")
    face_fatigue_score: Optional[float] = Field(None, ge=0, le=100, description="Face-based fatigue (0-100)")


class AlertData(BaseModel):
    """Schema for fatigue alert"""
    session_id: UUID
    timestamp: datetime
    alert_level: str = Field(..., pattern="^(warning|critical)$")
    fatigue_score: float = Field(..., ge=0, le=100)
    eeg_contribution: float = Field(default=0.6, ge=0, le=1)
    face_contribution: float = Field(default=0.4, ge=0, le=1)
    trigger_reason: str


class AlertResponse(BaseModel):
    """Schema for alert API response with ID"""
    id: int
    session_id: UUID
    timestamp: datetime
    alert_level: str
    fatigue_score: float
    eeg_contribution: float
    face_contribution: float
    trigger_reason: str
    acknowledged: bool
    
    model_config = {"from_attributes": True}


class AlertUpdate(BaseModel):
    """Schema for updating alert (acknowledge/dismiss)"""
    acknowledged: Optional[bool] = None
    trigger_reason: Optional[str] = None


class AlertList(BaseModel):
    """Schema for paginated alert list"""
    total: int
    limit: int
    offset: int
    alerts: list[AlertResponse]


class GameEventData(BaseModel):
    """Schema for game event data"""
    session_id: UUID
    timestamp: datetime
    event_type: str = Field(..., description="Event type (e.g., lane_deviation, collision, brake)")
    event_data: Optional[Dict] = Field(default_factory=dict)
    speed: Optional[float] = Field(None, ge=0, description="Vehicle speed (km/h)")
    lane_deviation: Optional[float] = Field(None, description="Distance from center (meters)")
    weather: Optional[str] = Field(None, pattern="^(clear|rain|fog)$")
    time_of_day: Optional[str] = Field(None, pattern="^(day|night|sunset)$")


# ============================================
# SESSION PLAYBACK RESPONSE SCHEMAS
# ============================================

class EEGDataResponse(BaseModel):
    """EEG data record for playback"""
    id: int
    session_id: UUID
    timestamp: datetime
    raw_channels: Optional[Dict[str, float]] = None
    delta_power: Optional[float] = None
    theta_power: Optional[float] = None
    alpha_power: Optional[float] = None
    beta_power: Optional[float] = None
    gamma_power: Optional[float] = None
    theta_alpha_ratio: Optional[float] = None
    beta_alpha_ratio: Optional[float] = None
    signal_quality: Optional[float] = None
    cognitive_state: Optional[str] = None
    eeg_fatigue_score: Optional[float] = None

    model_config = {"from_attributes": True}


class FaceEventResponse(BaseModel):
    """Face detection event for playback"""
    id: int
    session_id: UUID
    timestamp: datetime
    eye_aspect_ratio: Optional[float] = None
    mouth_aspect_ratio: Optional[float] = None
    eyes_closed: bool = False
    yawning: bool = False
    blink_count: int = 0
    blink_rate: Optional[float] = None
    head_yaw: Optional[float] = None
    head_pitch: Optional[float] = None
    head_roll: Optional[float] = None
    face_fatigue_score: Optional[float] = None

    model_config = {"from_attributes": True}


class GameEventResponse(BaseModel):
    """Game event for playback"""
    id: int
    session_id: UUID
    timestamp: datetime
    event_type: Optional[str] = None
    event_data: Optional[Dict] = None
    speed: Optional[float] = None
    lane_deviation: Optional[float] = None
    weather: Optional[str] = None
    time_of_day: Optional[str] = None

    model_config = {"from_attributes": True}


class TimelineEvent(BaseModel):
    """Unified timeline event combining all data types"""
    type: str  # "eeg", "face", "game", "alert"
    timestamp: datetime
    data: Dict[str, Any]


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper"""
    total: int
    page: int
    page_size: int
    has_next: bool


class PaginatedEEGResponse(PaginatedResponse):
    """Paginated EEG data"""
    data: List[EEGDataResponse]


class PaginatedFaceResponse(PaginatedResponse):
    """Paginated face events"""
    data: List[FaceEventResponse]


class PaginatedGameResponse(PaginatedResponse):
    """Paginated game events"""
    data: List[GameEventResponse]


class TimelineResponse(PaginatedResponse):
    """Paginated timeline"""
    events: List[TimelineEvent]

