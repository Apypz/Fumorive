"""
Database Models for Fumorive
SQLAlchemy ORM models based on ERD diagram
Week 2, Day 1 - Database Schema Design
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


# ============================================
# USER MODEL
# ============================================

class User(Base):
    """User account model"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="student")  # student, researcher, admin
    is_active = Column(Boolean, default=True)
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # 'google', 'github', etc.
    google_id = Column(String(255), nullable=True, unique=True, index=True)  # Google UID
    profile_picture = Column(String(500), nullable=True)  # Avatar URL from OAuth
    name_manually_edited = Column(Boolean, default=False)  # Track if user manually changed their name
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


# ============================================
# SESSION MODEL
# ============================================

class Session(Base):
    """Driving session model"""
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    session_name = Column(String(255), nullable=False)
    device_type = Column(String(100))  # Muse 2, OpenBCI, etc.
    session_status = Column(String(50), default="active")  # active, completed, failed
    calibration_data = Column(JSONB)  # Baseline calibration parameters
    settings = Column(JSONB)  # Game settings, thresholds, etc.
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    avg_fatigue_score = Column(Float, nullable=True)
    max_fatigue_score = Column(Float, nullable=True)
    alert_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    eeg_data = relationship("EEGData", back_populates="session", cascade="all, delete-orphan")
    face_events = relationship("FaceDetectionEvent", back_populates="session", cascade="all, delete-orphan")
    game_events = relationship("GameEvent", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Session(id={self.id}, name={self.session_name}, status={self.session_status})>"


# ============================================
# EEG DATA MODEL (TimescaleDB Hypertable)
# ============================================

class EEGData(Base):
    """
    EEG time-series data model
    Will be converted to TimescaleDB hypertable after creation
    """
    __tablename__ = "eeg_data"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, index=True)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    
    # Raw EEG channels (JSON array)
    raw_channels = Column(JSONB)  # {"AF7": 0.5, "AF8": 0.3, "TP9": 0.2, "TP10": 0.4}
    
    # Band powers (Hz)
    delta_power = Column(Float)  # 1-4 Hz
    theta_power = Column(Float)  # 4-8 Hz
    alpha_power = Column(Float)  # 8-13 Hz
    beta_power = Column(Float)  # 13-30 Hz
    gamma_power = Column(Float)  # 30-50 Hz
    
    # Derived metrics
    theta_alpha_ratio = Column(Float)  # Drowsiness indicator
    beta_alpha_ratio = Column(Float)  # Engagement index
    
    # Quality metrics
    signal_quality = Column(Float)  # 0-1 scale
    
    # Classification
    cognitive_state = Column(String(50))  # alert, drowsy, fatigued
    eeg_fatigue_score = Column(Float)  # 0-100
    
    # Relationship
    session = relationship("Session", back_populates="eeg_data")
    
    def __repr__(self):
        return f"<EEGData(session_id={self.session_id}, timestamp={self.timestamp})>"


# ============================================
# FACE DETECTION EVENTS MODEL (TimescaleDB Hypertable)
# ============================================

class FaceDetectionEvent(Base):
    """Face detection events from MediaPipe Face Mesh"""
    __tablename__ = "face_detection_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, index=True)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    
    # Eye metrics
    eye_aspect_ratio = Column(Float)  # EAR value
    mouth_aspect_ratio = Column(Float)  # MAR value
    eyes_closed = Column(Boolean, default=False)
    yawning = Column(Boolean, default=False)
    
    # Blink metrics
    blink_count = Column(Integer, default=0)  # Cumulative
    blink_rate = Column(Float)  # Blinks per minute
    
    # Head pose
    head_yaw = Column(Float)  # Rotation Y
    head_pitch = Column(Float)  # Rotation X
    head_roll = Column(Float)  # Rotation Z
    
    # Face-based fatigue
    face_fatigue_score = Column(Float)  # 0-100
    
    # Relationship
    session = relationship("Session", back_populates="face_events")
    
    def __repr__(self):
        return f"<FaceDetectionEvent(session_id={self.session_id}, timestamp={self.timestamp})>"


# ============================================
# GAME EVENTS MODEL (TimescaleDB Hypertable)
# ============================================

class GameEvent(Base):
    """Game events from Babylon.js driving simulator"""
    __tablename__ = "game_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, index=True)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(100))  # lane_deviation, collision, brake, obstacle, etc.
    event_data = Column(JSONB)  # Event-specific additional data
    
    # Vehicle metrics
    speed = Column(Float)  # km/h
    lane_deviation = Column(Float)  # Distance from center (meters)
    
    # Environment
    weather = Column(String(50))  # clear, rain, fog
    time_of_day = Column(String(50))  # day, night, sunset
    
    # Relationship
    session = relationship("Session", back_populates="game_events")
    
    def __repr__(self):
        return f"<GameEvent(session_id={self.session_id}, type={self.event_type})>"


# ============================================
# ALERTS MODEL (TimescaleDB Hypertable)
# ============================================

class Alert(Base):
    """Fatigue alerts triggered during session"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, index=True)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    
    # Alert details
    alert_level = Column(String(50))  # warning, critical
    fatigue_score = Column(Float)  # Combined fatigue score (0-100)
    
    # Contribution weights
    eeg_contribution = Column(Float, default=0.6)  # 60%
    face_contribution = Column(Float, default=0.4)  # 40%
    
    # Trigger reason
    trigger_reason = Column(String(255))  # high_theta_alpha, eyes_closed, yawning
    
    # User interaction
    acknowledged = Column(Boolean, default=False)
    
    # Relationship
    session = relationship("Session", back_populates="alerts")
    
    def __repr__(self):
        return f"<Alert(session_id={self.session_id}, level={self.alert_level})>"
