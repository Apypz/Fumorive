# Week 3 Wednesday - Face Detection API Walkthrough

**Date**: 21 Januari 2026  
**Task**: Implement API endpoints for logging face detection events and aggregate statistics

---

## ✅ What Was Implemented

### 🎯 Goal
Create backend API for MediaPipe Face Mesh integration - frontend will send face detection data for logging and analysis.

---

## 📦 Files Created/Modified

### New Files (2)

#### 1. [app/api/routes/face.py](file:///c:/Users/User/Fumorive/backend/app/api/routes/face.py)
**Face Detection API Endpoints**

**5 Endpoints Created**:

1️⃣ **POST /api/v1/face/events** - Log single face event
```python
# Request example
{
  "session_id": "uuid",
  "timestamp": "2026-01-21T14:00:00Z",
  "eye_aspect_ratio": 0.3,
  "blink_rate": 15,
  "face_fatigue_score": 25
}
# → 201 Created
```

2️⃣ **POST /api/v1/face/events/batch** - Batch insertion (30 FPS)
```python
# For high-frequency MediaPipe data
{
  "session_id": "uuid",
  "events": [ /* array of events */ ]
}
# → Faster performance with bulk insert
```

3️⃣ **GET /api/v1/face/events** - Event history (paginated)
```python
GET /api/v1/face/events?session_id=uuid&skip=0&limit=20
# → Returns 20 most recent events
```

4️⃣ **GET /api/v1/face/stats/{session_id}** - Aggregate statistics
```json
{
  "total_events": 1500,
  "avg_blink_rate": 12.3,
  "eyes_closed_percentage": 15.1,
  "yawn_count": 8,
  "avg_fatigue_score": 42.5,
  "head_movement": { "avg_yaw": 0.05, ... }
}
```

5️⃣ **GET /api/v1/face/realtime/{session_id}** - Latest event
```python
# Get most recent face detection for dashboard
```

---

#### 2. [tests/mock_face_sender.py](file:///c:/Users/User/Fumorive/backend/tests/mock_face_sender.py)
**Testing Tool**

Simulates MediaPipe Face Mesh sending data at 30 FPS:
- Generates realistic EAR, MAR values
- Simulates alert/drowsy/fatigued states
- Sends continuous stream
- Shows statistics

---

### Modified Files (1)

#### [main.py](file:///c:/Users/User/Fumorive/backend/main.py#L21-L138)
Added face router integration:
```python
from app.api.routes.face import router as face_router
app.include_router(face_router, prefix=API_V1_PREFIX)
```

---

## 🔄 Data Flow

### Frontend (MediaPipe) → Backend:

```
MediaPipe Face Mesh (30 FPS)
  ↓
POST /api/v1/face/events
  ↓
FastAPI validates & stores
  ↓
TimescaleDB (time-series)
```

### Backend → Frontend (Stats):

```
GET /api/v1/face/stats/{session_id}
  ↓
SQL aggregation query
  ↓
{
  avg_blink_rate,
  eyes_closed_percentage,
  yawn_count,
  fatigue_scores
}
```

---

## 📊 Database Integration

**Model Used**: [FaceDetectionEvent](file:///c:/Users/User/Fumorive/backend/app/db/models.py#122-153) (already exists ✅)

**Features**:
- ✅ TimescaleDB hypertable (time-series optimized)
- ✅ Batch insertion for performance
- ✅ Indexed by session_id and timestamp
- ✅ Aggregation queries (AVG, COUNT, etc.)

**Fields Tracked**:
- Eye Aspect Ratio (EAR)
- Mouth Aspect Ratio (MAR)
- Eyes closed, yawning (booleans)
- Blink count & rate
- Head pose (yaw, pitch, roll)
- Face fatigue score (0-100)

---

## 🧪 Testing

### Using Mock Sender:

**Setup**:
```bash
cd backend/tests
python mock_face_sender.py
```

**What it does**:
1. Sends face events at 30 FPS
2. Simulates different fatigue states
3. Shows real-time progress
4. Displays statistics at end

**Expected Output**:
```
✅ Sent 30 events | EAR: 0.28 | Fatigue: 25.5% | Elapsed: 1.0s
✅ Sent 60 events | EAR: 0.15 | Fatigue: 65.2% | Elapsed: 2.0s
...
📊 Face Detection Statistics:
   Total events: 900
   Avg blink rate: 15.3 bpm
   Eyes closed: 12.5%
   Yawn count: 4
```

---

## 🌐 Frontend Integration

### For MediaPipe Team:

**Step 1**: Detect face with MediaPipe
```javascript
// MediaPipe Face Mesh runs at ~30 FPS
```

**Step 2**: Send to backend
```javascript
import { apiClient } from '@/api/client';

const sendFaceDetection = async (data) => {
  await apiClient.post('/api/v1/face/events', {
    session_id: currentSessionId,
    timestamp: new Date().toISOString(),
    eye_aspect_ratio: calculateEAR(),
    blink_rate: calculateBlinkRate(),
    face_fatigue_score: calculateFatigue()
  });
};
```

**Step 3**: Get statistics
```javascript
const stats = await apiClient.get(`/api/v1/face/stats/${sessionId}`);
console.log('Fatigue:', stats.avg_fatigue_score);
```

---

## 📋 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/face/events` | Log single event |
| POST | `/api/v1/face/events/batch` | Batch logging (faster) |
| GET | `/api/v1/face/events` | Get history (paginated) |
| GET | `/api/v1/face/stats/{id}` | Aggregate statistics |
| GET | `/api/v1/face/realtime/{id}` | Latest detection |

---

## ✅ Success Criteria

- [x] Can log face detection events
- [x] Batch insertion works (30 FPS capable)
- [x] Statistics API returns aggregated data
- [x] Pagination works for history
- [x] Integrated with existing session model
- [x] Ready for frontend MediaPipe integration
- [x] Mock testing tool created
- [x] Swagger documentation auto-generated

---

## 📝 Next Steps

**For Frontend Team**:
1. Integrate MediaPipe Face Mesh
2. Calculate EAR, MAR values
3. Send to `/api/v1/face/events` endpoint
4. Display statistics on dashboard

**For Backend (Week 3 Thursday)**:
- Redis caching for session data ✅ (already done)
- Data buffering for high-frequency EEG

---

**Status**: Week 3 Wednesday COMPLETE! ✅  
**Ready for**: Frontend MediaPipe integration

**Last Updated**: 21 Januari 2026
