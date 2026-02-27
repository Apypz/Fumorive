"""
Session Schemas
Pydantic models for driving session data validation
Week 2, Tuesday - API Routes
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class SessionBase(BaseModel):
    """Base session schema"""
    session_name: str = Field(..., min_length=1, max_length=255)
    device_type: Optional[str] = Field(None, max_length=100, description="EEG device type (e.g., Muse 2)")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Game settings and thresholds")


class SessionCreate(SessionBase):
    """Schema for creating a new session"""
    calibration_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Baseline calibration data")


class SessionUpdate(BaseModel):
    """Schema for updating session"""
    session_name: Optional[str] = Field(None, min_length=1, max_length=255)
    session_status: Optional[str] = Field(None, pattern="^(active|completed|failed)$")
    calibration_data: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    avg_fatigue_score: Optional[float] = Field(None, ge=0, le=100)
    max_fatigue_score: Optional[float] = Field(None, ge=0, le=100)
    alert_count: Optional[int] = Field(None, ge=0)


class SessionResponse(BaseModel):
    """Schema for session response"""
    id: UUID
    user_id: UUID
    session_name: str
    device_type: Optional[str] = None
    session_status: str
    calibration_data: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    avg_fatigue_score: Optional[float] = None
    max_fatigue_score: Optional[float] = None
    alert_count: int
    
    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    """Schema for paginated session list"""
    total: int
    sessions: list[SessionResponse]
    page: int = 1
    page_size: int = 20
