# EEG Integration Setup Guide

Panduan lengkap untuk setup EEG streaming Muse2 ke frontend.

## Prerequisites

- Muse 2 headband (terbaru atau Gen 2)
- Bluetooth device atau USB Bluetooth adapter
- Python 3.8+
- Node.js 16+
- Windows 10/11

## Step 1: Backend Setup

### 1.1 Pastikan Backend Running

```bash
cd backend
python main.py
```

Verify endpoints:
- HTTP POST: `http://localhost:8000/api/v1/eeg/stream`
- WebSocket: `ws://localhost:8000/api/v1/ws/session/{session_id}`

### 1.2 Check Requirements

Backend requirements sudah include:
- FastAPI
- WebSocket support
- CORS middleware

## Step 2: EEG Processing Server

### 2.1 Install Dependencies

```bash
cd eeg-processing
pip install -r requirements.txt
```

Required packages:
- `pylsl` - Lab Streaming Layer
- `muselsl` - Muse LSL connector
- `numpy` - Data processing
- `scipy` - Signal processing
- `requests` - HTTP POST

### 2.2 Setup Muse2 Device

#### Windows:
1. Pair Muse 2 via Bluetooth Settings
2. Note the device name (usually "Muse-*")

#### Via Command Line:
```bash
# Start muselsl stream
python -m muselsl stream
```

Monitor terminal untuk "Subscribed to 10Hz stream"

### 2.3 Start EEG Server

```bash
# Get session ID dari backend atau user store
python server.py --session-id <UUID> --backend-url http://localhost:8000
```

Output harus menunjukkan:
```
[INFO] Resolving LSL EEG stream...
[INFO] Connected to Muse stream
[INFO] Posting to backend: http://localhost:8000/api/v1/eeg/stream
```

## Step 3: Frontend Integration

### 3.1 Copy Files

Semua file sudah ada di:
```
frontend/src/
├── stores/eegStore.ts           ✓
├── hooks/useEEGWebSocket.ts      ✓
├── components/EEGDashboard.tsx   ✓
├── components/EEG/
│   ├── EEGMetricsDisplay.tsx     ✓
│   ├── EEGWaveformDisplay.tsx    ✓
│   └── README.md                 ✓
└── modules/eeg/index.ts          ✓
```

### 3.2 Add Route (jika perlu page dedicated)

Update `src/routes/index.tsx` atau routing setup:

```tsx
import { EEGMonitoringPage } from '@/components/page/EEGMonitoringPage'

const routes = [
  // ...
  {
    path: '/monitoring/eeg',
    element: <EEGMonitoringPage />,
    name: 'EEG Monitoring'
  }
]
```

### 3.3 Add Environment Variables

`.env.local`:
```
VITE_BACKEND_URL=localhost:8000
VITE_WEBSOCKET_URL=ws://localhost:8000
```

### 3.4 Install Dependencies (if needed)

```bash
cd frontend
npm install
```

Core dependencies already in package.json:
- `zustand` - State management
- `react` - UI framework

## Step 4: Integrate to Game

### 4.1 Option A: Floating Widget

```tsx
// GamePage.tsx
import { EEGMetricsDisplay } from '@/modules/eeg'
import { useUserStore } from '@/stores/userStore'

function GamePage() {
  return (
    <div>
      {/* Game canvas */}
      <GameCanvas />
      
      {/* EEG widget (floating) */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        width: 300,
        maxHeight: 400,
        zIndex: 100,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        borderRadius: 8,
        background: 'white',
        padding: 12,
        overflow: 'auto'
      }}>
        <EEGMetricsDisplay />
      </div>
    </div>
  )
}
```

### 4.2 Option B: Full Dashboard

```tsx
// EEGMonitoringPage sudah tersedia
import { EEGMonitoringPage } from '@/components/page/EEGMonitoringPage'

// Gunakan sebagai dedicated monitoring page
<Route path="/eeg-monitor" element={<EEGMonitoringPage />} />
```

### 4.3 Option C: Side Panel

```tsx
// Tambah di game UI layout
<div style={{ display: 'grid', gridTemplateColumns: '1fr 400px' }}>
  <GameCanvas />
  <div className="eeg-panel">
    <EEGDashboard sessionId={sessionId} showWaveforms={false} />
  </div>
</div>
```

## Step 5: Testing

### 5.1 Backend Test

```bash
# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Check WebSocket
# Buka DevTools > Console
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/session/test-id')
ws.addEventListener('message', (e) => console.log(e.data))
```

### 5.2 EEG Server Test

```bash
# Terminal 2: EEG Server
cd eeg-processing
python server.py --session-id test-uuid-12345 --backend-url http://localhost:8000

# Verifikasi output:
# [INFO] Connected to Muse stream
# [INFO] Posting data...
```

### 5.3 Frontend Test

```bash
# Terminal 3: Frontend dev server
cd frontend
npm run dev

# Buka http://localhost:5173
# DevTools > Console
import { useEEGStore } from '@/modules/eeg'
const store = useEEGStore.getState()
console.log(store.isConnected)
console.log(store.currentMetrics)
```

## Step 6: Monitoring

### Check Connection Status

```tsx
import { useEEGStore } from '@/modules/eeg'

function StatusCheck() {
  const isConnected = useEEGStore(s => s.isConnected)
  const error = useEEGStore(s => s.connectionError)
  const samples = useEEGStore(s => s.dataHistory.length)
  
  return (
    <div>
      Connected: {isConnected ? '✓' : '✗'}
      Samples: {samples}
      Error: {error || 'None'}
    </div>
  )
}
```

### Real-time Data

```tsx
function DataMonitor() {
  const metrics = useEEGStore(s => s.currentMetrics)
  
  return metrics ? (
    <div>
      State: {metrics.cognitiveState}
      Fatigue: {metrics.eegFatigueScore}%
      TP9: {metrics.rawChannels.TP9.toFixed(2)} µV
    </div>
  ) : null
}
```

## Troubleshooting

### Issue: "No EEG LSL stream found"

**Cause**: Muse2 tidak streaming via LSL

**Solution**:
1. Check Bluetooth pairing
2. Run `python -m muselsl stream` manually
3. Verify device dalam Bluetooth settings
4. Restart muselsl service

### Issue: "Failed to post to backend"

**Cause**: Backend endpoint tidak accessible

**Solution**:
```bash
# Test connectivity
curl -X POST http://localhost:8000/api/v1/eeg/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","channels":{}}'

# Check backend logs untuk errors
```

### Issue: "Disconnected" di frontend

**Cause**: WebSocket connection putus

**Solution**:
- Check browser console untuk specific error
- Verify backend WebSocket endpoint aktif
- Check network stability
- Restart browser tab

### Issue: High CPU Usage

**Cause**: Waveform rendering terlalu cepat

**Solution**:
```tsx
// Reduce update frequency
<EEGWaveformDisplay 
  updateInterval={100}  // Increase dari 50
  width={300}           // Reduce size
/>

// Or disable waveforms
<EEGDashboard showWaveforms={false} />
```

## Performance Tips

1. **Limit History Buffer**: 
   - Max 500 samples untuk smooth rendering
   - Adjust di eegStore.ts: `maxHistoryLength`

2. **WebSocket Throttling**:
   - Backend dapat mengurangi frequency posting
   - Frontend automatically throttles rendering

3. **Component Optimization**:
   - Use `React.memo()` untuk frequent updates
   - Memoize selector functions di Zustand

4. **Network Optimization**:
   - Compress data jika perlu
   - Use binary protocol untuk real-time (future)

## Production Deployment

### Frontend Build

```bash
cd frontend
npm run build
# Output: dist/
```

### Backend Deployment

```bash
# Use gunicorn atau similar
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### EEG Server

Keep running as separate service:
```bash
nohup python server.py --session-id $SESSION_ID > eeg.log 2>&1 &
```

## Future Enhancements

1. **Data Persistence**: Save EEG data ke database
2. **Historical Analysis**: View past EEG recordings
3. **Advanced Visualization**: Spectrograms, heatmaps
4. **Machine Learning**: Better fatigue prediction
5. **Multi-Device**: Support multiple Muse devices
6. **Biometric Integration**: Combine dengan face detection

## Support & References

- [Muse 2 Documentation](https://choosemuse.com/muse-2/)
- [LSL Documentation](https://github.com/sccn/labstreaminglayer)
- [EEG Basics](https://en.wikipedia.org/wiki/Electroencephalography)
- [Backend API Docs](http://localhost:8000/api/docs)

---

**Last Updated**: February 5, 2026
**Status**: ✓ Production Ready
