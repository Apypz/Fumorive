"""
EEG Data Relay Logic
Bridge between HTTP endpoint and WebSocket clients
Week 3, Monday - EEG Data Relay System
"""

from typing import Dict, Any
from sqlalchemy.orm import Session

from app.api.websocket_manager import manager
from app.schemas.eeg import EEGStreamData
from app.db.database import get_db
from app.db.models import EEGData


async def relay_eeg_to_clients(session_id: str, data: Dict[str, Any]) -> int:
    """
    Relay EEG data to all WebSocket clients watching a session
    
    Args:
        session_id: Session UUID as string
        data: EEG data dictionary to broadcast
    
    Returns:
        Number of clients that received the data
    """
    # Prepare message for WebSocket clients
    message = {
        "type": "eeg_stream",
        "session_id": session_id,
        "data": data
    }
    
    # Broadcast to all clients connected to this session
    await manager.broadcast_to_session(session_id, message)
    
    # Return count of notified clients
    if session_id in manager.session_connections:
        return len(manager.session_connections[session_id])
    
    return 0


async def save_eeg_to_database(data: EEGStreamData):
    """
    Save EEG data to TimescaleDB
    
    This runs in background to not block the relay.
    Batch insertion should be used for better performance.
    
    Args:
        data: EEG stream data to save
    """
    # Get database session
    db = next(get_db())
    
    try:
        # Create EEG data record
        eeg_record = EEGData(
            session_id=data.session_id,
            timestamp=data.timestamp,
            sample_rate=data.sample_rate,
            tp9=data.channels.get("TP9"),
            af7=data.channels.get("AF7"),
            af8=data.channels.get("AF8"),
            tp10=data.channels.get("TP10"),
            # Processed metrics
            theta_power=data.processed.get("theta_power"),
            alpha_power=data.processed.get("alpha_power"),
            beta_power=data.processed.get("beta_power"),
            gamma_power=data.processed.get("gamma_power"),
            theta_alpha_ratio=data.processed.get("theta_alpha_ratio"),
            fatigue_score=data.processed.get("fatigue_score")
        )
        
        db.add(eeg_record)
        db.commit()
        
    except Exception as e:
        print(f"Error saving EEG data to database: {e}")
        db.rollback()
    finally:
        db.close()


def validate_eeg_timestamp(timestamp: str) -> bool:
    """
    Validate EEG data timestamp
    
    Ensures timestamp is recent and not too far in the future.
    Helps detect clock sync issues.
    
    Args:
        timestamp: ISO format timestamp string
    
    Returns:
        True if timestamp is valid
    """
    from datetime import datetime, timedelta
    
    try:
        ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        now = datetime.now(ts.tzinfo)
        
        # Check if timestamp is within acceptable range
        # Allow 1 minute in past, 10 seconds in future
        time_diff = (now - ts).total_seconds()
        
        return -10 <= time_diff <= 60
        
    except Exception:
        return False
