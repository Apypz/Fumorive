"""
Database Query Tests - test_db_queries.py

Tests for complex database queries:
- User queries (filter, search)
- Session lifecycle queries
- EEG data aggregation
- Alert queries
- Multi-table joins
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import User, Session as SessionModel, EEGData, FaceDetectionEvent, Alert
from app.core.password import hash_password


# ==================== User Query Tests ====================

@pytest.mark.db
class TestUserQueries:
    """Tests for User-related database queries."""

    def test_query_user_by_email(self, db: Session, test_user: User):
        """Test querying user by email."""
        found = db.query(User).filter(User.email == "testuser@example.com").first()

        assert found is not None
        assert found.id == test_user.id

    def test_query_user_by_email_case_sensitive(self, db: Session, test_user: User):
        """Test that email query is case-sensitive."""
        found = db.query(User).filter(User.email == "TESTUSER@EXAMPLE.COM").first()
        assert found is None  # PostgreSQL is case-sensitive by default

    def test_query_active_users(self, db: Session):
        """Test querying only active users."""
        # Create active and inactive users
        active = User(email="active@q.com", full_name="Active", hashed_password=hash_password("p"), is_active=True)
        inactive = User(email="inactive@q.com", full_name="Inactive", hashed_password=hash_password("p"), is_active=False)
        db.add_all([active, inactive])
        db.commit()

        active_users = db.query(User).filter(User.is_active == True).all()
        inactive_users = db.query(User).filter(User.is_active == False).all()

        active_emails = [u.email for u in active_users]
        assert "active@q.com" in active_emails
        assert "inactive@q.com" not in active_emails

        inactive_emails = [u.email for u in inactive_users]
        assert "inactive@q.com" in inactive_emails

    def test_query_users_by_role(self, db: Session, test_user: User, test_admin_user: User):
        """Test querying users by role."""
        students = db.query(User).filter(User.role == "student").all()
        admins = db.query(User).filter(User.role == "admin").all()

        student_emails = [u.email for u in students]
        admin_emails = [u.email for u in admins]

        assert "testuser@example.com" in student_emails
        assert "admin@example.com" in admin_emails

    def test_query_oauth_users(self, db: Session, test_oauth_user: User):
        """Test querying OAuth users."""
        oauth_users = db.query(User).filter(User.oauth_provider == "google").all()
        oauth_emails = [u.email for u in oauth_users]

        assert "oauthuser@gmail.com" in oauth_emails

    def test_count_users(self, db: Session, test_user: User, test_admin_user: User):
        """Test counting users."""
        count = db.query(func.count(User.id)).scalar()
        assert count >= 2  # At least test_user and test_admin_user


# ==================== Session Query Tests ====================

@pytest.mark.db
class TestSessionQueries:
    """Tests for Session-related database queries."""

    def test_query_sessions_by_user(self, db: Session, test_user: User):
        """Test querying sessions for a specific user."""
        # Create sessions
        for i in range(3):
            session = SessionModel(user_id=test_user.id, session_name=f"Session {i}")
            db.add(session)
        db.commit()

        user_sessions = db.query(SessionModel).filter(SessionModel.user_id == test_user.id).all()
        assert len(user_sessions) == 3

    def test_query_active_sessions(self, db: Session, test_user: User):
        """Test querying only active sessions."""
        active = SessionModel(user_id=test_user.id, session_name="Active", session_status="active")
        completed = SessionModel(user_id=test_user.id, session_name="Completed", session_status="completed")
        db.add_all([active, completed])
        db.commit()

        active_sessions = db.query(SessionModel).filter(
            SessionModel.user_id == test_user.id,
            SessionModel.session_status == "active"
        ).all()

        assert len(active_sessions) == 1
        assert active_sessions[0].session_name == "Active"

    def test_query_sessions_ordered_by_date(self, db: Session, test_user: User):
        """Test querying sessions ordered by start date (newest first)."""
        for i in range(3):
            session = SessionModel(user_id=test_user.id, session_name=f"Session {i}")
            db.add(session)
            db.commit()

        sessions = db.query(SessionModel).filter(
            SessionModel.user_id == test_user.id
        ).order_by(SessionModel.started_at.desc()).all()

        # Newest should be first
        assert sessions[0].session_name == "Session 2"

    def test_count_sessions_per_user(self, db: Session, test_user: User):
        """Test counting sessions per user."""
        for i in range(4):
            db.add(SessionModel(user_id=test_user.id, session_name=f"S{i}"))
        db.commit()

        count = db.query(func.count(SessionModel.id)).filter(
            SessionModel.user_id == test_user.id
        ).scalar()

        assert count == 4

    def test_query_sessions_with_high_fatigue(self, db: Session, test_user: User):
        """Test querying sessions with high average fatigue score."""
        low_fatigue = SessionModel(user_id=test_user.id, session_name="Low", avg_fatigue_score=30.0)
        high_fatigue = SessionModel(user_id=test_user.id, session_name="High", avg_fatigue_score=80.0)
        db.add_all([low_fatigue, high_fatigue])
        db.commit()

        dangerous_sessions = db.query(SessionModel).filter(
            SessionModel.user_id == test_user.id,
            SessionModel.avg_fatigue_score > 70.0
        ).all()

        assert len(dangerous_sessions) == 1
        assert dangerous_sessions[0].session_name == "High"


# ==================== EEG Data Query Tests ====================

@pytest.mark.db
class TestEEGDataQueries:
    """Tests for EEG data queries."""

    def _create_session(self, db: Session, user: User, name: str) -> SessionModel:
        session = SessionModel(user_id=user.id, session_name=name)
        db.add(session)
        db.commit()
        return session

    def test_query_eeg_by_session(self, db: Session, test_user: User):
        """Test querying EEG data for a specific session."""
        session = self._create_session(db, test_user, "EEG Query Test")

        for i in range(5):
            eeg = EEGData(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                eeg_fatigue_score=float(i * 10)
            )
            db.add(eeg)
        db.commit()

        eeg_records = db.query(EEGData).filter(EEGData.session_id == session.id).all()
        assert len(eeg_records) == 5

    def test_query_eeg_average_fatigue(self, db: Session, test_user: User):
        """Test calculating average EEG fatigue score for a session."""
        session = self._create_session(db, test_user, "Avg Fatigue Test")

        scores = [20.0, 40.0, 60.0, 80.0, 100.0]
        for score in scores:
            eeg = EEGData(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                eeg_fatigue_score=score
            )
            db.add(eeg)
        db.commit()

        avg = db.query(func.avg(EEGData.eeg_fatigue_score)).filter(
            EEGData.session_id == session.id
        ).scalar()

        assert avg == 60.0  # (20+40+60+80+100) / 5

    def test_query_eeg_max_fatigue(self, db: Session, test_user: User):
        """Test finding max EEG fatigue score for a session."""
        session = self._create_session(db, test_user, "Max Fatigue Test")

        for score in [30.0, 75.0, 45.0, 90.0, 55.0]:
            eeg = EEGData(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                eeg_fatigue_score=score
            )
            db.add(eeg)
        db.commit()

        max_score = db.query(func.max(EEGData.eeg_fatigue_score)).filter(
            EEGData.session_id == session.id
        ).scalar()

        assert max_score == 90.0

    def test_query_eeg_by_cognitive_state(self, db: Session, test_user: User):
        """Test querying EEG data by cognitive state."""
        session = self._create_session(db, test_user, "Cognitive State Test")

        states = ["alert", "alert", "drowsy", "fatigued", "drowsy"]
        for state in states:
            eeg = EEGData(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                cognitive_state=state,
                eeg_fatigue_score=50.0
            )
            db.add(eeg)
        db.commit()

        drowsy_count = db.query(func.count(EEGData.id)).filter(
            EEGData.session_id == session.id,
            EEGData.cognitive_state == "drowsy"
        ).scalar()

        assert drowsy_count == 2


# ==================== Alert Query Tests ====================

@pytest.mark.db
class TestAlertQueries:
    """Tests for Alert queries."""

    def _create_session(self, db: Session, user: User, name: str) -> SessionModel:
        session = SessionModel(user_id=user.id, session_name=name)
        db.add(session)
        db.commit()
        return session

    def test_query_alerts_by_session(self, db: Session, test_user: User):
        """Test querying alerts for a specific session."""
        session = self._create_session(db, test_user, "Alert Query Test")

        for i in range(4):
            alert = Alert(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                alert_level="warning" if i < 2 else "critical",
                fatigue_score=float(60 + i * 10),
                trigger_reason="test"
            )
            db.add(alert)
        db.commit()

        all_alerts = db.query(Alert).filter(Alert.session_id == session.id).all()
        assert len(all_alerts) == 4

    def test_query_critical_alerts(self, db: Session, test_user: User):
        """Test querying only critical alerts."""
        session = self._create_session(db, test_user, "Critical Alert Test")

        warning = Alert(session_id=session.id, timestamp=datetime.now(timezone.utc),
                        alert_level="warning", fatigue_score=65.0, trigger_reason="test")
        critical = Alert(session_id=session.id, timestamp=datetime.now(timezone.utc),
                         alert_level="critical", fatigue_score=90.0, trigger_reason="test")
        db.add_all([warning, critical])
        db.commit()

        critical_alerts = db.query(Alert).filter(
            Alert.session_id == session.id,
            Alert.alert_level == "critical"
        ).all()

        assert len(critical_alerts) == 1
        assert critical_alerts[0].fatigue_score == 90.0

    def test_query_unacknowledged_alerts(self, db: Session, test_user: User):
        """Test querying unacknowledged alerts."""
        session = self._create_session(db, test_user, "Unack Alert Test")

        acked = Alert(session_id=session.id, timestamp=datetime.now(timezone.utc),
                      alert_level="warning", fatigue_score=65.0,
                      trigger_reason="test", acknowledged=True)
        unacked = Alert(session_id=session.id, timestamp=datetime.now(timezone.utc),
                        alert_level="critical", fatigue_score=85.0,
                        trigger_reason="test", acknowledged=False)
        db.add_all([acked, unacked])
        db.commit()

        unacked_alerts = db.query(Alert).filter(
            Alert.session_id == session.id,
            Alert.acknowledged == False
        ).all()

        assert len(unacked_alerts) == 1
        assert unacked_alerts[0].alert_level == "critical"

    def test_count_alerts_per_session(self, db: Session, test_user: User):
        """Test counting alerts per session."""
        session = self._create_session(db, test_user, "Count Alert Test")

        for i in range(5):
            alert = Alert(
                session_id=session.id,
                timestamp=datetime.now(timezone.utc),
                alert_level="warning",
                fatigue_score=float(60 + i),
                trigger_reason="test"
            )
            db.add(alert)
        db.commit()

        count = db.query(func.count(Alert.id)).filter(
            Alert.session_id == session.id
        ).scalar()

        assert count == 5


# ==================== Multi-Table Join Tests ====================

@pytest.mark.db
class TestJoinQueries:
    """Tests for multi-table join queries."""

    def test_join_sessions_with_user(self, db: Session, test_user: User):
        """Test joining sessions with user data."""
        session = SessionModel(user_id=test_user.id, session_name="Join Test")
        db.add(session)
        db.commit()

        # Query sessions with user info via join
        result = db.query(SessionModel, User).join(
            User, SessionModel.user_id == User.id
        ).filter(SessionModel.user_id == test_user.id).first()

        assert result is not None
        session_obj, user_obj = result
        assert session_obj.session_name == "Join Test"
        assert user_obj.email == "testuser@example.com"

    def test_query_user_session_summary(self, db: Session, test_user: User):
        """Test getting session summary per user."""
        for i in range(3):
            session = SessionModel(
                user_id=test_user.id,
                session_name=f"Summary Session {i}",
                avg_fatigue_score=float(30 + i * 20)
            )
            db.add(session)
        db.commit()

        # Count sessions and avg fatigue per user
        result = db.query(
            func.count(SessionModel.id).label("session_count"),
            func.avg(SessionModel.avg_fatigue_score).label("avg_fatigue")
        ).filter(SessionModel.user_id == test_user.id).first()

        assert result.session_count == 3
        assert result.avg_fatigue == pytest.approx(50.0, rel=0.01)  # (30+50+70)/3
