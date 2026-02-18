"""
Database Model Tests - test_db_models.py

Tests for SQLAlchemy ORM models:
- User model CRUD
- Session model CRUD
- EEGData model
- FaceDetectionEvent model
- GameEvent model
- Alert model
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.db.models import User, Session as SessionModel, EEGData, FaceDetectionEvent, GameEvent, Alert
from app.core.password import hash_password


# ==================== User Model Tests ====================

@pytest.mark.db
class TestUserModel:
    """Tests for User model CRUD operations."""

    def test_create_user(self, db: Session):
        """Test creating a new user."""
        user = User(
            email="modeltest@example.com",
            full_name="Model Test User",
            hashed_password=hash_password("password123"),
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.id is not None
        assert isinstance(user.id, uuid.UUID)
        assert user.email == "modeltest@example.com"
        assert user.full_name == "Model Test User"
        assert user.role == "student"
        assert user.is_active is True
        assert user.name_manually_edited is False
        assert user.created_at is not None

    def test_user_defaults(self, db: Session):
        """Test User model default values."""
        user = User(
            email="defaults@example.com",
            full_name="Default User",
            hashed_password=hash_password("pass123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.role == "student"
        assert user.is_active is True
        assert user.name_manually_edited is False
        assert user.oauth_provider is None
        assert user.google_id is None
        assert user.profile_picture is None

    def test_user_oauth_fields(self, db: Session):
        """Test User model OAuth-specific fields."""
        user = User(
            email="oauth@example.com",
            full_name="OAuth User",
            hashed_password=None,  # OAuth users may not have password
            oauth_provider="google",
            google_id="google_uid_12345",
            profile_picture="https://example.com/avatar.jpg"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.oauth_provider == "google"
        assert user.google_id == "google_uid_12345"
        assert user.profile_picture == "https://example.com/avatar.jpg"
        assert user.hashed_password is None

    def test_user_update(self, db: Session, test_user: User):
        """Test updating user fields."""
        test_user.full_name = "Updated Name"
        test_user.name_manually_edited = True
        db.commit()
        db.refresh(test_user)

        assert test_user.full_name == "Updated Name"
        assert test_user.name_manually_edited is True

    def test_user_deactivate(self, db: Session, test_user: User):
        """Test deactivating a user."""
        test_user.is_active = False
        db.commit()
        db.refresh(test_user)

        assert test_user.is_active is False

    def test_user_repr(self, db: Session, test_user: User):
        """Test User __repr__ method."""
        repr_str = repr(test_user)
        assert "User" in repr_str
        assert "testuser@example.com" in repr_str


# ==================== Session Model Tests ====================

@pytest.mark.db
class TestSessionModel:
    """Tests for Session model CRUD operations."""

    def test_create_session(self, db: Session, test_user: User):
        """Test creating a new session."""
        session = SessionModel(
            user_id=test_user.id,
            session_name="Test Drive Session",
            device_type="Muse 2",
            session_status="active"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.id is not None
        assert isinstance(session.id, uuid.UUID)
        assert session.user_id == test_user.id
        assert session.session_name == "Test Drive Session"
        assert session.device_type == "Muse 2"
        assert session.session_status == "active"
        assert session.started_at is not None
        assert session.alert_count == 0

    def test_session_defaults(self, db: Session, test_user: User):
        """Test Session model default values."""
        session = SessionModel(
            user_id=test_user.id,
            session_name="Default Session"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.session_status == "active"
        assert session.alert_count == 0
        assert session.ended_at is None
        assert session.duration_seconds is None
        assert session.avg_fatigue_score is None

    def test_session_with_json_fields(self, db: Session, test_user: User):
        """Test Session with JSONB fields (calibration_data, settings)."""
        calibration = {"baseline_alpha": 0.5, "baseline_theta": 0.3}
        settings = {"fatigue_threshold": 70, "alert_enabled": True}

        session = SessionModel(
            user_id=test_user.id,
            session_name="Calibrated Session",
            calibration_data=calibration,
            settings=settings
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.calibration_data == calibration
        assert session.settings == settings

    def test_session_complete(self, db: Session, test_user: User):
        """Test completing a session (updating status and stats)."""
        session = SessionModel(
            user_id=test_user.id,
            session_name="Completed Session"
        )
        db.add(session)
        db.commit()

        # Complete the session
        session.session_status = "completed"
        session.ended_at = datetime.now(timezone.utc)
        session.duration_seconds = 3600
        session.avg_fatigue_score = 45.5
        session.max_fatigue_score = 78.2
        session.alert_count = 3
        db.commit()
        db.refresh(session)

        assert session.session_status == "completed"
        assert session.duration_seconds == 3600
        assert session.avg_fatigue_score == 45.5
        assert session.alert_count == 3

    def test_session_user_relationship(self, db: Session, test_user: User):
        """Test Session → User relationship."""
        session = SessionModel(
            user_id=test_user.id,
            session_name="Relationship Test"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        assert session.user is not None
        assert session.user.id == test_user.id
        assert session.user.email == test_user.email

    def test_user_sessions_relationship(self, db: Session, test_user: User):
        """Test User → Sessions (one-to-many) relationship."""
        for i in range(3):
            session = SessionModel(
                user_id=test_user.id,
                session_name=f"Session {i}"
            )
            db.add(session)
        db.commit()
        db.refresh(test_user)

        assert len(test_user.sessions) == 3


# ==================== EEGData Model Tests ====================

@pytest.mark.db
class TestEEGDataModel:
    """Tests for EEGData model."""

    def test_create_eeg_data(self, db: Session, test_user: User):
        """Test creating EEG data record."""
        session = SessionModel(user_id=test_user.id, session_name="EEG Test")
        db.add(session)
        db.commit()

        eeg = EEGData(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            raw_channels={"AF7": 0.5, "AF8": 0.3, "TP9": 0.2, "TP10": 0.4},
            delta_power=0.8,
            theta_power=0.5,
            alpha_power=0.6,
            beta_power=0.3,
            gamma_power=0.1,
            theta_alpha_ratio=0.83,
            beta_alpha_ratio=0.5,
            signal_quality=0.95,
            cognitive_state="alert",
            eeg_fatigue_score=25.0
        )
        db.add(eeg)
        db.commit()
        db.refresh(eeg)

        assert eeg.id is not None
        assert eeg.session_id == session.id
        assert eeg.delta_power == 0.8
        assert eeg.cognitive_state == "alert"
        assert eeg.eeg_fatigue_score == 25.0
        assert eeg.raw_channels["AF7"] == 0.5

    def test_eeg_session_relationship(self, db: Session, test_user: User):
        """Test EEGData → Session relationship."""
        session = SessionModel(user_id=test_user.id, session_name="EEG Rel Test")
        db.add(session)
        db.commit()

        eeg = EEGData(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            eeg_fatigue_score=30.0
        )
        db.add(eeg)
        db.commit()
        db.refresh(eeg)

        assert eeg.session is not None
        assert eeg.session.id == session.id


# ==================== FaceDetectionEvent Model Tests ====================

@pytest.mark.db
class TestFaceDetectionEventModel:
    """Tests for FaceDetectionEvent model."""

    def test_create_face_event(self, db: Session, test_user: User):
        """Test creating a face detection event."""
        session = SessionModel(user_id=test_user.id, session_name="Face Test")
        db.add(session)
        db.commit()

        event = FaceDetectionEvent(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            eye_aspect_ratio=0.25,
            mouth_aspect_ratio=0.15,
            eyes_closed=False,
            yawning=False,
            blink_count=5,
            blink_rate=15.0,
            head_yaw=2.5,
            head_pitch=-1.0,
            head_roll=0.5,
            face_fatigue_score=20.0
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.id is not None
        assert event.session_id == session.id
        assert event.eye_aspect_ratio == 0.25
        assert event.eyes_closed is False
        assert event.face_fatigue_score == 20.0

    def test_face_event_drowsy_state(self, db: Session, test_user: User):
        """Test face event with drowsy indicators."""
        session = SessionModel(user_id=test_user.id, session_name="Drowsy Test")
        db.add(session)
        db.commit()

        event = FaceDetectionEvent(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            eye_aspect_ratio=0.15,  # Low EAR = eyes closing
            eyes_closed=True,
            yawning=True,
            face_fatigue_score=80.0
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.eyes_closed is True
        assert event.yawning is True
        assert event.face_fatigue_score == 80.0


# ==================== GameEvent Model Tests ====================

@pytest.mark.db
class TestGameEventModel:
    """Tests for GameEvent model."""

    def test_create_game_event(self, db: Session, test_user: User):
        """Test creating a game event."""
        session = SessionModel(user_id=test_user.id, session_name="Game Test")
        db.add(session)
        db.commit()

        event = GameEvent(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            event_type="lane_deviation",
            event_data={"deviation_meters": 1.5, "direction": "right"},
            speed=80.0,
            lane_deviation=1.5,
            weather="clear",
            time_of_day="day"
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.id is not None
        assert event.event_type == "lane_deviation"
        assert event.speed == 80.0
        assert event.event_data["deviation_meters"] == 1.5


# ==================== Alert Model Tests ====================

@pytest.mark.db
class TestAlertModel:
    """Tests for Alert model."""

    def test_create_alert(self, db: Session, test_user: User):
        """Test creating a fatigue alert."""
        session = SessionModel(user_id=test_user.id, session_name="Alert Test")
        db.add(session)
        db.commit()

        alert = Alert(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            alert_level="warning",
            fatigue_score=65.0,
            eeg_contribution=0.6,
            face_contribution=0.4,
            trigger_reason="high_theta_alpha",
            acknowledged=False
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        assert alert.id is not None
        assert alert.alert_level == "warning"
        assert alert.fatigue_score == 65.0
        assert alert.trigger_reason == "high_theta_alpha"
        assert alert.acknowledged is False

    def test_alert_acknowledge(self, db: Session, test_user: User):
        """Test acknowledging an alert."""
        session = SessionModel(user_id=test_user.id, session_name="Ack Alert Test")
        db.add(session)
        db.commit()

        alert = Alert(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            alert_level="critical",
            fatigue_score=85.0,
            trigger_reason="eyes_closed"
        )
        db.add(alert)
        db.commit()

        # Acknowledge the alert
        alert.acknowledged = True
        db.commit()
        db.refresh(alert)

        assert alert.acknowledged is True

    def test_alert_defaults(self, db: Session, test_user: User):
        """Test Alert model default values."""
        session = SessionModel(user_id=test_user.id, session_name="Default Alert Test")
        db.add(session)
        db.commit()

        alert = Alert(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            alert_level="warning",
            fatigue_score=60.0,
            trigger_reason="yawning"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        assert alert.eeg_contribution == 0.6
        assert alert.face_contribution == 0.4
        assert alert.acknowledged is False
