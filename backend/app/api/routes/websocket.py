"""
WebSocket Routes
Real-time data streaming endpoints for EEG, face detection, and game events
Week 2, Tuesday - WebSocket for EEG Streaming
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import json

from app.db.database import get_db
from app.db.models import Session as DBSession, EEGData, FaceDetectionEvent, GameEvent, Alert
from app.api.websocket_manager import manager
from app.schemas.eeg import EEGDataPoint, FaceDetectionData, GameEventData, AlertData

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/session/{session_id}")
async def websocket_session(
    websocket: WebSocket,
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time session data streaming
    
    Receives and broadcasts:
    - EEG data points
    - Face detection events
    - Game events
    - Fatigue alerts
    
    Connection URL: ws://localhost:8000/api/v1/ws/session/{session_id}
    """
    # Verify session exists
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        await websocket.close(code=1008, reason="Session not found")
        return
    
    # Accept connection
    await ws_manager.connect(websocket, session_id)
    
    try:
        # Send welcome message
        await ws_manager.send_json({
            "type": "connection",
            "message": f"Connected to session {session_id}",
            "session_id": str(session_id),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Listen for incoming messages
        while True:
            # Receive data from client
            data = await websocket.receive_json()
            
            # Process based on message type
            message_type = data.get("type")
            
            if message_type == "eeg_data":
                # Handle EEG data
                await handle_eeg_data(data, session_id, db)
                
            elif message_type == "face_detection":
                # Handle face detection data
                await handle_face_detection(data, session_id, db)
                
            elif message_type == "game_event":
                # Handle game event
                await handle_game_event(data, session_id, db)
                
            elif message_type == "alert":
                # Handle fatigue alert
                await handle_alert(data, session_id, db)
                
            elif message_type == "ping":
                # Heartbeat ping
                await ws_manager.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
            
            # Broadcast to all clients in this session
            await ws_manager.broadcast_to_session(data, session_id)
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, session_id)
        print(f"Client disconnected from session {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, session_id)


@router.websocket("/monitor")
async def websocket_monitor(websocket: WebSocket):
    """
    WebSocket endpoint for monitoring all sessions
    
    Receives broadcasts from all active sessions
    Useful for admin/monitoring dashboard
    
    Connection URL: ws://localhost:8000/api/v1/ws/monitor
    """
    await ws_manager.connect(websocket)
    
    try:
        # Send welcome message
        await ws_manager.send_json({
            "type": "connection",
            "message": "Connected to monitoring feed",
            "timestamp": datetime.utcnow().isoformat(),
            "total_connections": ws_manager.get_total_connections()
        }, websocket)
        
        # Keep connection alive and listen for commands
        while True:
            data = await websocket.receive_json()
            
            # Handle monitoring commands
            if data.get("type") == "ping":
                await ws_manager.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat(),
                    "total_connections": ws_manager.get_total_connections()
                }, websocket)
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        print("Monitor client disconnected")
    except Exception as e:
        print(f"Monitor WebSocket error: {e}")
        ws_manager.disconnect(websocket)


@router.websocket("/ping")
async def websocket_ping(websocket: WebSocket):
    """
    Dedicated WebSocket endpoint for latency measurement
    
    Client sends: {"type": "ping", "client_timestamp": <ISO timestamp>}
    Server responds: {
        "type": "pong", 
        "client_timestamp": <echoed>,
        "server_timestamp": <ISO timestamp>
    }
    
    Client can calculate round-trip time:
    RTT = current_time - client_timestamp
    
    Connection URL: ws://localhost:8000/api/v1/ws/ping
    
    **Week 3, Tuesday - Latency Measurement**
    """
    await websocket.accept()
    
    try:
        # Send ready message
        await websocket.send_json({
            "type": "ready",
            "message": "Ping service ready",
            "server_timestamp": datetime.utcnow().isoformat()
        })
        
        ping_count = 0
        
        # Listen for ping messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                ping_count += 1
                
                # Echo back immediately with server timestamp
                response = {
                    "type": "pong",
                    "ping_number": ping_count,
                    "client_timestamp": data.get("client_timestamp"),
                    "server_timestamp": datetime.utcnow().isoformat()
                }
                
                await websocket.send_json(response)
                
            elif data.get("type") == "get_stats":
                # Return statistics
                await websocket.send_json({
                    "type": "stats",
                    "total_pings": ping_count,
                    "server_timestamp": datetime.utcnow().isoformat()
                })
            
    except WebSocketDisconnect:
        print(f"Ping client disconnected after {ping_count} pings")
    except Exception as e:
        print(f"Ping WebSocket error: {e}")
    finally:
        await websocket.close()


# ============================================
# DATA HANDLERS
# ============================================

async def handle_eeg_data(data: dict, session_id: UUID, db: Session):
    """
    Handle incoming EEG data and store in database
    
    Args:
        data: EEG data payload
        session_id: Session ID
        db: Database session
    """
    try:
        # Extract EEG data points
        data_points = data.get("data_points", [])
        
        # Store in database (batch insert for performance)
        eeg_records = []
        for point in data_points:
            eeg_record = EEGData(
                session_id=session_id,
                timestamp=datetime.fromisoformat(point.get("timestamp").replace("Z", "+00:00")),
                raw_channels=point.get("raw_channels"),
                delta_power=point.get("delta_power"),
                theta_power=point.get("theta_power"),
                alpha_power=point.get("alpha_power"),
                beta_power=point.get("beta_power"),
                gamma_power=point.get("gamma_power"),
                theta_alpha_ratio=point.get("theta_alpha_ratio"),
                beta_alpha_ratio=point.get("beta_alpha_ratio"),
                signal_quality=point.get("signal_quality"),
                cognitive_state=point.get("cognitive_state"),
                eeg_fatigue_score=point.get("eeg_fatigue_score")
            )
            eeg_records.append(eeg_record)
        
        # Batch insert
        if eeg_records:
            db.bulk_save_objects(eeg_records)
            db.commit()
            
    except Exception as e:
        print(f"Error handling EEG data: {e}")
        db.rollback()


async def handle_face_detection(data: dict, session_id: UUID, db: Session):
    """
    Handle incoming face detection data and store in database
    
    Args:
        data: Face detection payload
        session_id: Session ID
        db: Database session
    """
    try:
        face_event = FaceDetectionEvent(
            session_id=session_id,
            timestamp=datetime.fromisoformat(data.get("timestamp").replace("Z", "+00:00")),
            eye_aspect_ratio=data.get("eye_aspect_ratio"),
            mouth_aspect_ratio=data.get("mouth_aspect_ratio"),
            eyes_closed=data.get("eyes_closed", False),
            yawning=data.get("yawning", False),
            blink_count=data.get("blink_count", 0),
            blink_rate=data.get("blink_rate"),
            head_yaw=data.get("head_yaw"),
            head_pitch=data.get("head_pitch"),
            head_roll=data.get("head_roll"),
            face_fatigue_score=data.get("face_fatigue_score")
        )
        
        db.add(face_event)
        db.commit()
        
    except Exception as e:
        print(f"Error handling face detection: {e}")
        db.rollback()


async def handle_game_event(data: dict, session_id: UUID, db: Session):
    """
    Handle incoming game event and store in database
    
    Args:
        data: Game event payload
        session_id: Session ID
        db: Database session
    """
    try:
        game_event = GameEvent(
            session_id=session_id,
            timestamp=datetime.fromisoformat(data.get("timestamp").replace("Z", "+00:00")),
            event_type=data.get("event_type"),
            event_data=data.get("event_data", {}),
            speed=data.get("speed"),
            lane_deviation=data.get("lane_deviation"),
            weather=data.get("weather"),
            time_of_day=data.get("time_of_day")
        )
        
        db.add(game_event)
        db.commit()
        
    except Exception as e:
        print(f"Error handling game event: {e}")
        db.rollback()


async def handle_alert(data: dict, session_id: UUID, db: Session):
    """
    Handle incoming fatigue alert and store in database
    
    Args:
        data: Alert payload
        session_id: Session ID
        db: Database session
    """
    try:
        alert = Alert(
            session_id=session_id,
            timestamp=datetime.fromisoformat(data.get("timestamp").replace("Z", "+00:00")),
            alert_level=data.get("alert_level"),
            fatigue_score=data.get("fatigue_score"),
            eeg_contribution=data.get("eeg_contribution", 0.6),
            face_contribution=data.get("face_contribution", 0.4),
            trigger_reason=data.get("trigger_reason"),
            acknowledged=False
        )
        
        db.add(alert)
        
        # Update session alert count
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if session:
            session.alert_count += 1
        
        db.commit()
        
    except Exception as e:
        print(f"Error handling alert: {e}")
        db.rollback()
