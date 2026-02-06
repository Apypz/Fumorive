# EEG Integration Setup Verification

## ✅ Implementation Complete

All components have been created and integrated. Use this checklist to verify everything is working correctly.

## Pre-Flight Checks

### Backend Setup
- [ ] Muse2 EEG headset connected and streaming
- [ ] eeg-processing/server.py running (listens to Muse2 via LSL)
- [ ] Backend FastAPI running on `http://localhost:8000`
- [ ] WebSocket endpoint `/api/v1/ws/session/{id}` available
- [ ] Database migrations applied

**Check Backend**:
```bash
# Terminal 1: Start EEG processor
cd eeg-processing
python server.py

# Terminal 2: Start backend
cd backend
python main.py
```

### Frontend Setup
- [ ] Node modules installed (`npm install`)
- [ ] No build errors in frontend project
- [ ] Vite dev server running (`npm run dev`)
- [ ] Browser console shows no errors

**Check Frontend**:
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

## Runtime Verification

### 1. **Component Files Exist**
```bash
# Verify all files created:
cd c:\xampp\htdocs\Fumorive\frontend\src

# Component
ls components/EEGMonitoringWidget.tsx       # ✅
ls components/EEGMonitoringWidget.css       # ✅

# Store
ls stores/sessionStore.ts                   # ✅

# Updated Files
ls components/page/Session.tsx              # ✅ (modified)
ls hooks/useEEGWebSocket.ts                 # ✅ (exists)
ls stores/eegStore.ts                       # ✅ (exists)
```

### 2. **Start Game and Verify**

```
Step 1: Open frontend in browser
├─ Navigate to http://localhost:5173
└─ Should see Fumorive game

Step 2: Select a map
├─ Click "Start Game"
└─ Game should begin loading

Step 3: Wait for game to start
├─ Click "Play" to enter playing state
└─ All HUDs should appear

Step 4: Check EEG Widget
├─ Look for 🧠 EEG MONITOR in top-right corner
├─ Status should show "🟢 Connected (Live)" if backend is running
├─ Status shows "🔴 Connecting..." if backend is starting
└─ If no widget appears, see Troubleshooting below

Step 5: Verify Metrics Display
├─ All 4 channels should show µV values (not 0)
├─ Cognitive state should be one of: Alert/Drowsy/Fatigued
├─ Fatigue score should be 0-100%
├─ Quality indicator should show percentage
└─ Metrics should update every 100ms

Step 6: Test Interactions
├─ Click and drag the header to move widget
├─ Click chevron to collapse/expand
├─ Verify position is saved while dragging
└─ Check all info displays correctly when collapsed
```

### 3. **Browser Console Checks**

Open DevTools (`F12`) and check:

```javascript
// In Console tab

// Should see WebSocket connection
// Look for: "ws://localhost:8000/api/v1/ws/session/[sessionId]"

// Check Zustand stores
// Type in console:
window.sessionStore = require('@/stores/sessionStore').useSessionStore
window.sessionStore.getState()  // Should show { sessionId: "session_..." }

// Check EEG store
window.eegStore = require('@/stores/eegStore').useEEGStore
window.eegStore.getState()  // Should show metrics updating
```

### 4. **Network Tab Verification**

In DevTools Network tab:
```
Look for:
├─ WebSocket connection to ws://localhost:8000/api/v1/ws/session/[id]
│  └─ Status: 101 Switching Protocols (normal for WebSocket)
│
├─ Messages should flow continuously
│  └─ JSON with EEG metrics
│
└─ Check for any red errors (404, 500, etc.)
```

## Troubleshooting

### ❌ Widget Not Appearing

**Check 1**: Verify game state
```tsx
// Add to console in DevTools
gameStore = window.__gameStore  // if exposed
gameStore.getState()  // Check gameState === 'playing'
```

**Solution**:
```bash
1. Click "Play" to enter playing state
2. Make sure game isn't paused
3. Check browser console for errors
4. Refresh page (F5) and try again
```

**Check 2**: Verify sessionStore
```javascript
useSessionStore.getState().sessionId  // Should NOT be empty
```

**Check 3**: Verify component is imported
```bash
# Check Session.tsx has this import
grep "EEGMonitoringWidget" src/components/page/Session.tsx
# Should show: import { EEGMonitoringWidget } from '../EEGMonitoringWidget'
```

---

### ❌ Widget Shows "🔴 Connecting..."

**Check 1**: Backend is running?
```bash
# Verify backend WebSocket is accessible
curl -i http://localhost:8000/docs
# Should return 200 OK if backend is running
```

**Solution**:
```bash
cd backend
python main.py
# Wait for "Uvicorn running on http://0.0.0.0:8000"
```

**Check 2**: Wrong endpoint?
```typescript
// In useEEGWebSocket.ts, verify:
const wsUrl = `ws://localhost:8000/api/v1/ws/session/${sessionId}`
// Check that /api/v1/ws/session endpoint exists in backend
```

---

### ❌ Metrics Show "Waiting for EEG data..."

**Check 1**: Backend is publishing data?
```bash
# Check backend logs for EEG data
# Should see: "Broadcasting EEG metrics to session: [sessionId]"
```

**Check 2**: EEG processor is running?
```bash
# In eeg-processing directory
python server.py
# Wait for: "LSL Stream outlet initialized"
```

**Check 3**: Muse2 is connected?
```bash
# Check if Muse2 is discoverable
# You should see it in Bluetooth devices
```

**Solution**:
```bash
# Terminal 1: Start EEG processor first
cd eeg-processing
python server.py

# Terminal 2: Start backend
cd backend
python main.py

# Terminal 3: Start frontend (already running)
# Frontend auto-connects when backend is ready
```

---

### ❌ Widget Metrics All Show "0"

**Likely Cause**: EEG data not streaming from headset

**Verify**:
```bash
# Check if Muse2 is actually connected
# In eeg-processing/server.py logs, look for:
# "MuseClient: Connected to Muse-XXXX"
# "Stream started" 
# "Published EEG data: ..."

# If not connected, check:
# 1. Headset is powered on
# 2. Headset is paired in Bluetooth
# 3. Python muselsl library is installed (pip list | grep muse)
```

**Fix**:
```bash
# Ensure Muse2 is properly connected
1. Check Bluetooth: Device should show "Muse-XXXX"
2. Power on headset
3. Restart EEG processor: python server.py
4. Should see connection logs
```

---

### ❌ Session ID is Empty or Not Initializing

**Check**:
```javascript
// In console:
useSessionStore.getState()
// Should show: { sessionId: "session_..." }
// NOT: { sessionId: "" }
```

**Solution**:
```typescript
// In Session.tsx, verify useEffect is running
// Add console.log to debug:

useEffect(() => {
  console.log('Initializing session')
  initializeSession()
  console.log('Session ID:', sessionId)
}, [initializeSession])
```

---

### ❌ WebSocket Keeps Disconnecting

**Symptoms**: Status flickers between 🟢 and 🔴

**Check Backend Health**:
```bash
# Verify backend is stable
# Look for errors in backend logs
# Common issues:
# - Backend running out of memory
# - Database connection drops
# - Redis connection issues
```

**Check Network**:
```bash
# Verify network stability
ping localhost
# Should show consistent response times
```

**Solution**:
```bash
# Restart everything in order
1. Kill backend (Ctrl+C)
2. Kill EEG processor (Ctrl+C)
3. Wait 5 seconds
4. Start EEG processor
5. Start backend
6. Refresh frontend page
```

---

### ❌ Fatigue Score Stuck at Same Value

**Check 1**: Muse2 is actually measuring?
```bash
# Try moving your head
# Try mental tasks (counting, math)
# Metrics should change
```

**Check 2**: Update rate is slow?
```javascript
// In console, watch for updates
setInterval(() => {
  const metrics = useEEGStore.getState().currentMetrics
  console.log('Fatigue:', metrics?.eegFatigueScore)
}, 1000)
// Should see values changing
```

**Check 3**: Signal quality is poor?
```javascript
// Check signal quality
const { currentMetrics } = useEEGStore.getState()
console.log('Quality:', currentMetrics?.signalQuality)
// If < 0.5, signal is poor - check headset placement
```

**Solution**:
```bash
1. Reposition Muse2 headset
2. Ensure contacts are making good connection
3. Check for hair interfering with electrodes
4. Try moving closer/away from wireless devices (WiFi routers, phones)
```

---

## Performance Check

### Monitor Resource Usage

While game is running:
```javascript
// Monitor memory usage
setInterval(() => {
  const used = performance.memory.usedJSHeapSize / 1048576;
  console.log(`Memory used: ${used.toFixed(1)}MB`);
}, 5000);
```

**Expected**:
- Initial: ~50-100MB
- With EEG Widget: +2-5MB
- Stable (not growing): Good ✅

**If Growing**:
- Memory leak suspected
- Refresh page
- Check for DevTools open (DevTools uses extra memory)

### Monitor Frame Rate

```javascript
// Check FPS (should be 60 FPS gaming)
let lastTime = performance.now();
let frames = 0;

const checkFPS = () => {
  const now = performance.now();
  const delta = now - lastTime;
  if (delta >= 1000) {
    console.log(`FPS: ${frames}`);
    frames = 0;
    lastTime = now;
  }
  frames++;
  requestAnimationFrame(checkFPS);
};

checkFPS();
// Should see 55-60 FPS
```

**If FPS Drops**:
- Close other browser tabs
- Disable camera monitor (`setCameraEnabled(false)`)
- Reduce graphics settings in game
- Close browser extensions

---

## Final Verification Checklist

- [ ] Backend running and accessible
- [ ] EEG processor running and connected to Muse2
- [ ] Frontend running without console errors
- [ ] Game starts and enters playing state
- [ ] EEG Widget appears in top-right corner
- [ ] Widget shows "🟢 Connected (Live)"
- [ ] Metrics display and update (not all zeros)
- [ ] Cognitive state badge shows Alert/Drowsy/Fatigued
- [ ] Fatigue score bar animates smoothly
- [ ] Widget is draggable and collapsible
- [ ] Memory usage stable (<200MB total)
- [ ] FPS remains 55-60 during gameplay
- [ ] Camera monitor also displays (bottom-right)
- [ ] Both widgets work simultaneously

## If Everything Works ✅

```
You now have:
✅ Real-time EEG monitoring in-game
✅ Cognitive fatigue detection (Alert/Drowsy/Fatigued)
✅ Live channel measurements (TP9, AF7, AF8, TP10)
✅ Signal quality monitoring
✅ Dual biometric assessment (EEG + Camera)
✅ Game-integrated fatigue tracking
✅ Draggable, collapsible interface
✅ 30+ FPS gaming performance maintained
```

**Next Steps**:
1. Test with actual Muse2 EEG stream for 30+ minutes
2. Adjust fatigue thresholds based on user feedback
3. Implement game difficulty adjustment based on fatigue
4. Add fatigue-based notifications/warnings
5. Log session data for research analysis

---

**Support**: If issues persist, check backend logs and frontend console for error messages, and share the error details.

**Last Updated**: Feb 6, 2026
