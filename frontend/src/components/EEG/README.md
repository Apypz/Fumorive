# EEG Real-Time Streaming Frontend Integration

Dokumentasi lengkap untuk integrasi EEG Muse2 streaming ke frontend Fumorive.

## Arsitektur Data Flow

```
Muse 2 Headband
    ↓
eeg-processing/server.py (LSL → HTTP POST)
    ↓
Backend /api/v1/eeg/stream (HTTP POST endpoint)
    ↓
Backend WebSocket Broadcasting
    ↓
Frontend (useEEGWebSocket hook)
    ↓
React Components (Real-time visualization)
```

## File-file yang Dibuat

### 1. **Store (Zustand)**
- **File**: `src/stores/eegStore.ts`
- **Fungsi**: State management untuk EEG data
- **Features**:
  - Menyimpan metrics real-time
  - Maintain history buffer (500 samples)
  - Connection status tracking
  - Helper methods untuk averaging data

### 2. **WebSocket Hook**
- **File**: `src/hooks/useEEGWebSocket.ts`
- **Fungsi**: Koneksi dan reconnection logic
- **Features**:
  - Auto-reconnect dengan exponential backoff
  - Ping/pong untuk keep-alive
  - Error handling dan retry mechanism
  - Type-safe data parsing

### 3. **Komponen Visualisasi**

#### EEGWaveformDisplay
- **File**: `src/components/EEG/EEGWaveformDisplay.tsx`
- **Props**:
  - `channel`: 'TP9' | 'AF7' | 'AF8' | 'TP10'
  - `height`: px (default: 120)
  - `width`: px (default: 400)
  - `updateInterval`: ms (default: 50)
- **Fitur**:
  - Real-time waveform plotting dengan Canvas
  - Grid visualization
  - Throttled rendering untuk performa optimal

#### EEGMetricsDisplay
- **File**: `src/components/EEG/EEGMetricsDisplay.tsx`
- **Fitur**:
  - Display cognitive state (Alert/Drowsy/Fatigued)
  - Raw channel values (TP9, AF7, AF8, TP10)
  - Frequency bands (Delta, Theta, Alpha, Beta, Gamma)
  - Ratios (θ/α, β/α)
  - Signal quality
  - Connection status indicator

#### EEGDashboard
- **File**: `src/components/EEGDashboard.tsx`
- **Props**:
  - `sessionId`: string (required) - UUID dari session
  - `backendUrl`: string (default: 'ws://localhost:8000')
  - `showWaveforms`: boolean (default: true)
  - `onStateChange`: callback ketika cognitive state berubah
- **Fitur**:
  - Integrated dashboard dengan semua komponen
  - Live connection badge
  - Debug information
  - Responsive design

## Cara Penggunaan

### 1. Basic Implementation

```tsx
import { EEGDashboard } from '@/components/EEGDashboard'
import { useUserStore } from '@/stores/userStore'

function GamePage() {
  const sessionId = useUserStore((state) => state.sessionId) // UUID
  
  return (
    <div>
      <EEGDashboard 
        sessionId={sessionId}
        backendUrl="ws://localhost:8000"
      />
      {/* Game canvas, etc */}
    </div>
  )
}
```

### 2. With Cognitive State Tracking

```tsx
const [fatigueLevel, setFatigueLevel] = useState<'alert' | 'drowsy' | 'fatigued'>('alert')

<EEGDashboard
  sessionId={sessionId}
  onStateChange={(state) => {
    if (state === 'fatigued') {
      showFatigueAlert()
    }
    setFatigueLevel(state || 'alert')
  }}
/>
```

### 3. Manual WebSocket Hook

```tsx
import { useEEGWebSocket } from '@/hooks/useEEGWebSocket'
import { useEEGStore } from '@/stores/eegStore'

function CustomComponent() {
  const { isConnected, connectionError } = useEEGWebSocket({
    sessionId: 'your-session-id',
    onMetricsReceived: (metrics) => {
      console.log('Received EEG data:', metrics)
    },
  })
  
  const metrics = useEEGStore((state) => state.currentMetrics)
  
  return (
    <div>
      {isConnected ? '✓ Connected' : '✗ Disconnected'}
      {metrics && <div>{metrics.eegFatigueScore}%</div>}
    </div>
  )
}
```

### 4. Custom Waveform Visualization

```tsx
import { EEGWaveformDisplay } from '@/components/EEG/EEGWaveformDisplay'

function WaveformPanel() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <EEGWaveformDisplay channel="TP9" width={300} height={150} />
      <EEGWaveformDisplay channel="AF7" width={300} height={150} />
      <EEGWaveformDisplay channel="AF8" width={300} height={150} />
      <EEGWaveformDisplay channel="TP10" width={300} height={150} />
    </div>
  )
}
```

## Data Structure

### EEGMetrics (interface)

```typescript
interface EEGMetrics {
  timestamp: string              // ISO format timestamp
  rawChannels: {
    TP9: number                  // µV values
    AF7: number
    AF8: number
    TP10: number
  }
  deltapower?: number            // 1-4 Hz band
  thetaPower?: number            // 4-8 Hz band (drowsiness)
  alphaPower?: number            // 8-13 Hz band (relaxation)
  betaPower?: number             // 13-30 Hz band (alertness)
  gammaPower?: number            // 30-45 Hz band (cognition)
  thetaAlphaRatio?: number       // θ/α ratio (drowsiness indicator)
  betaAlphaRatio?: number        // β/α ratio (engagement index)
  signalQuality?: number         // 0-1 (confidence score)
  cognitiveState?: 'alert' | 'drowsy' | 'fatigued'
  eegFatigueScore?: number       // 0-100 percentage
}
```

## Backend Integration

### Endpoint: POST /api/v1/eeg/stream

```python
# Backend expects from eeg-processing/server.py
{
  "session_id": "uuid-string",
  "timestamp": "2026-02-05T12:34:56.789Z",
  "sample_rate": 256,
  "channels": {
    "TP9": -5.23,
    "AF7": 3.21,
    "AF8": -2.15,
    "TP10": 1.87
  },
  "processed": {
    "delta_power": 0.123,
    "theta_power": 0.456,
    "alpha_power": 0.789,
    "beta_power": 0.234,
    "gamma_power": 0.567,
    "theta_alpha_ratio": 0.578,
    "beta_alpha_ratio": 0.297,
    "signal_quality": 0.95,
    "cognitive_state": "alert",
    "eeg_fatigue_score": 25.5
  },
  "save_to_db": true
}
```

### WebSocket Endpoint: WS /api/v1/ws/session/{session_id}

Backend broadcast ke frontend:

```json
{
  "type": "eeg_data",
  "timestamp": "2026-02-05T12:34:56.789Z",
  "channels": {...},
  "processed": {...}
}
```

## Setup Procedure

### 1. Start EEG Server

```bash
cd eeg-processing
python server.py --session-id <SESSION_UUID>
```

### 2. Backend sudah berjalan

```bash
cd backend
python main.py
# atau jika sudah running, pastikan WebSocket endpoint aktif
```

### 3. Frontend Component

```tsx
// Tambahkan ke main game page atau session page
import { EEGDashboard } from '@/components/EEGDashboard'

<EEGDashboard 
  sessionId={sessionId}
  backendUrl={`ws://${process.env.REACT_APP_BACKEND_URL || 'localhost:8000'}`}
/>
```

## Environment Variables

Tambahkan ke `.env`:

```
VITE_BACKEND_URL=http://localhost:8000
VITE_WEBSOCKET_URL=ws://localhost:8000
```

Gunakan di code:

```tsx
const backendUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000'
```

## Performance Optimization

### 1. Waveform Rendering
- Menggunakan Canvas bukan SVG
- Throttled dengan `requestAnimationFrame`
- Update interval configurable
- History buffer limited ke 500 samples (~2 detik @ 256Hz)

### 2. State Management
- Zustand (lightweight store)
- Direct selector access untuk prevent unnecessary re-renders
- Data averaging untuk smoothing metrics

### 3. WebSocket
- Automatic reconnection dengan backoff
- Ping/pong keep-alive
- Memory-efficient message parsing

## Troubleshooting

### "Waiting for EEG data..."
- Pastikan Muse2 device tersambung ke komputer
- Cek apakah `eeg-processing/server.py` running
- Verify backend `/api/v1/eeg/stream` endpoint menerima data
- Check browser console untuk error messages

### Waveform tidak update
- Verify data masuk ke frontend (check React DevTools)
- Pastikan `showWaveforms={true}`
- Check browser console untuk warnings
- Coba resize window untuk trigger re-render

### Koneksi putus-putus
- Cek network stability
- Increase `PING_INTERVAL_MS` di hook
- Check backend WebSocket connections

### High CPU usage
- Reduce `updateInterval` di EEGWaveformDisplay
- Disable waveform visualization dengan `showWaveforms={false}`
- Reduce `maxHistoryLength` di store

## Testing

### 1. Mock Data Testing

```tsx
// Simulate EEG data untuk testing tanpa Muse2
import { useEEGStore } from '@/stores/eegStore'

function useEEGMockData() {
  const addMetrics = useEEGStore((state) => state.addMetrics)
  
  useEffect(() => {
    const interval = setInterval(() => {
      addMetrics({
        timestamp: new Date().toISOString(),
        rawChannels: {
          TP9: Math.sin(Date.now() / 1000) * 10,
          AF7: Math.cos(Date.now() / 1000) * 10,
          AF8: Math.sin(Date.now() / 2000) * 8,
          TP10: Math.cos(Date.now() / 2000) * 8,
        },
        cognitiveState: 'alert',
        eegFatigueScore: 30,
      })
    }, 50) // ~20Hz updates
    
    return () => clearInterval(interval)
  }, [])
}
```

### 2. Browser DevTools

```javascript
// Di console:
import { useEEGStore } from '@/stores/eegStore'
const store = useEEGStore.getState()
console.log(store.currentMetrics)
console.log(store.dataHistory)
console.log(store.isConnected)
```

## Next Steps

1. **Integrasi ke Game State**: Gunakan EEG fatigue score untuk adjust game difficulty
2. **Alert System**: Tampilkan warning saat drowsy/fatigued detected
3. **Data Logging**: Simpan EEG metrics ke database untuk analysis
4. **Calibration UI**: Buat user calibration process untuk akurasi lebih baik
5. **Biometric Dashboard**: Combine dengan face detection untuk multimodal monitoring

## References

- [Muse 2 Specifications](https://choosemuse.com/muse-2/)
- [LSL (Lab Streaming Layer)](https://github.com/sccn/labstreaminglayer)
- [EEG Frequency Bands](https://en.wikipedia.org/wiki/Electroencephalography#Frequency_bands)
- [Fatigue Detection Research](https://ieeexplore.ieee.org/)

---

**Last Updated**: February 5, 2026
**Backend Version**: 1.0.0
**Frontend Version**: 1.0.0
