"""
Database Constraints Tests - test_db_constraints.py

Tests for database-level constraints:
- Unique constraints (email, google_id)
- Foreign key constraints
- NOT NULL constraints
- Cascade deletes
- Relationship integrity
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.models import User, Session as SessionModel, EEGData, FaceDetectionEvent, Alert
from app.core.password import hash_password


# ==================== Unique Constraint Tests ====================

@pytest.mark.db
class TestUniqueConstraints:
    """Tests for unique constraints in the database."""

    def test_email_unique_constraint(self, db: Session):
        """Test that duplicate emails are rejected."""
        user1 = User(
            email="unique@example.com",
            full_name="User One",
            hashed_password=hash_password("pass123")
        )
        db.add(user1)
        db.commit()

        user2 = User(
            email="unique@example.com",  # Same email!
            full_name="User Two",
            hashed_password=hash_password("pass456")
        )
        db.add(user2)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_google_id_unique_constraint(self, db: Session):
        """Test that duplicate google_id values are rejected."""
        user1 = User(
            email="google1@example.com",
            full_name="Google User 1",
            oauth_provider="google",
            google_id="same_google_uid_123"
        )
        db.add(user1)
        db.commit()

        user2 = User(
            email="google2@example.com",
            full_name="Google User 2",
            oauth_provider="google",
            google_id="same_google_uid_123"  # Same google_id!
        )
        db.add(user2)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_different_emails_allowed(self, db: Session):
        """Test that different emails are allowed."""
        user1 = User(email="user1@example.com", full_name="User 1", hashed_password=hash_password("pass"))
        user2 = User(email="user2@example.com", full_name="User 2", hashed_password=hash_password("pass"))
        db.add_all([user1, user2])
        db.commit()

        assert user1.id != user2.id


# ==================== NOT NULL Constraint Tests ====================

@pytest.mark.db
class TestNotNullConstraints:
    """Tests for NOT NULL constraints."""

    def test_user_email_required(self, db: Session):
        """Test that user email cannot be NULL."""
        user = User(
            email=None,  # NULL email!
            full_name="No Email User",
            hashed_password=hash_password("pass123")
        )
        db.add(user)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_user_full_name_required(self, db: Session):
        """Test that user full_name cannot be NULL."""
        user = User(
            email="noname@example.com",
            full_name=None,  # NULL name!
            hashed_password=hash_password("pass123")
        )
        db.add(user)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_session_user_id_required(self, db: Session):
        """Test that session user_id cannot be NULL."""
        session = SessionModel(
            user_id=None,  # NULL user_id!
            session_name="Orphan Session"
        )
        db.add(session)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_session_name_required(self, db: Session, test_user: User):
        """Test that session_name cannot be NULL."""
        session = SessionModel(
            user_id=test_user.id,
            session_name=None  # NULL name!
        )
        db.add(session)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()


# ==================== Foreign Key Constraint Tests ====================

@pytest.mark.db
class TestForeignKeyConstraints:
    """Tests for foreign key constraints."""

    def test_session_requires_valid_user(self, db: Session):
        """Test that session requires a valid user_id."""
        fake_user_id = uuid.uuid4()
        session = SessionModel(
            user_id=fake_user_id,  # Non-existent user!
            session_name="Orphan Session"
        )
        db.add(session)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_eeg_data_requires_valid_session(self, db: Session, test_user: User):
        """Test that EEG data requires a valid session_id."""
        fake_session_id = uuid.uuid4()
        eeg = EEGData(
            session_id=fake_session_id,  # Non-existent session!
            timestamp=datetime.now(timezone.utc),
            eeg_fatigue_score=50.0
        )
        db.add(eeg)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()

    def test_alert_requires_valid_session(self, db: Session):
        """Test that alert requires a valid session_id."""
        fake_session_id = uuid.uuid4()
        alert = Alert(
            session_id=fake_session_id,  # Non-existent session!
            timestamp=datetime.now(timezone.utc),
            alert_level="warning",
            fatigue_score=70.0,
            trigger_reason="test"
        )
        db.add(alert)

        with pytest.raises(IntegrityError):
            db.commit()

        db.rollback()


# ==================== Cascade Delete Tests ====================

@pytest.mark.db
class TestCascadeDeletes:
    """Tests for cascade delete behavior."""

    def test_delete_user_cascades_to_sessions(self, db: Session):
        """Test that deleting a user deletes all their sessions."""
        user = User(
            email="cascade_user@example.com",
            full_name="Cascade User",
            hashed_password=hash_password("pass123")
        )
        db.add(user)
        db.commit()

        # Create sessions for this user
        for i in range(3):
            session = SessionModel(
                user_id=user.id,
                session_name=f"Session {i}"
            )
            db.add(session)
        db.commit()

        # Verify sessions exist
        session_count = db.query(SessionModel).filter(SessionModel.user_id == user.id).count()
        assert session_count == 3

        # Delete user
        db.delete(user)
        db.commit()

        # Sessions should be deleted too (cascade)
        session_count_after = db.query(SessionModel).filter(SessionModel.user_id == user.id).count()
        assert session_count_after == 0

    def test_delete_session_cascades_to_eeg_data(self, db: Session, test_user: User):
        """Test that deleting a session deletes all its EEG data."""
        session = SessionModel(user_id=test_user.id, session_name="EEG Cascade Test")
        db.add(session)
        db.commit()

        # Add EEG data
        for i in range(5):
            eeg = EEGData(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                eeg_fatigue_score=float(i * 10)
            )
            db.add(eeg)
        db.commit()

        session_id = session.id

        # Delete session
        db.delete(session)
        db.commit()

        # EEG data should be deleted too
        eeg_count = db.query(EEGData).filter(EEGData.session_id == session_id).count()
        assert eeg_count == 0

    def test_delete_session_cascades_to_alerts(self, db: Session, test_user: User):
        """Test that deleting a session deletes all its alerts."""
        session = SessionModel(user_id=test_user.id, session_name="Alert Cascade Test")
        db.add(session)
        db.commit()

        # Add alerts
        for i in range(3):
            alert = Alert(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                alert_level="warning",
                fatigue_score=float(60 + i * 5),
                trigger_reason="test"
            )
            db.add(alert)
        db.commit()

        session_id = session.id

        # Delete session
        db.delete(session)
        db.commit()

        # Alerts should be deleted too
        alert_count = db.query(Alert).filter(Alert.session_id == session_id).count()
        assert alert_count == 0

    def test_delete_user_cascades_to_all_related_data(self, db: Session):
        """Test full cascade: User → Sessions → EEG/Alerts."""
        user = User(
            email="full_cascade@example.com",
            full_name="Full Cascade User",
            hashed_password=hash_password("pass123")
        )
        db.add(user)
        db.commit()

        session = SessionModel(user_id=user.id, session_name="Full Cascade Session")
        db.add(session)
        db.commit()

        eeg = EEGData(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            eeg_fatigue_score=50.0
        )
        alert = Alert(
            session_id=session.id,
            timestamp=datetime.now(timezone.utc),
            alert_level="warning",
            fatigue_score=65.0,
            trigger_reason="test"
        )
        db.add_all([eeg, alert])
        db.commit()

        user_id = user.id
        session_id = session.id

        # Delete user - should cascade all the way down
        db.delete(user)
        db.commit()

        assert db.query(SessionModel).filter(SessionModel.user_id == user_id).count() == 0
        assert db.query(EEGData).filter(EEGData.session_id == session_id).count() == 0
        assert db.query(Alert).filter(Alert.session_id == session_id).count() == 0
