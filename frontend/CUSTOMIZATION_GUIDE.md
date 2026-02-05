# 🛠️ Customization & Configuration Guide

## Quick Customization

### 1. Change Camera Position

**Current**: Bottom-right corner

To change position, edit `CameraFatigueMonitor.css`:

```css
/* Change FROM: bottom-right */
.camera-fatigue-monitor {
    bottom: 20px;
    right: 20px;
}

/* TO: bottom-left */
.camera-fatigue-monitor {
    bottom: 20px;
    left: 20px;
}

/* TO: top-right */
.camera-fatigue-monitor {
    top: 20px;
    right: 20px;
}

/* TO: top-left */
.camera-fatigue-monitor {
    top: 20px;
    left: 20px;
}
```

---

### 2. Change Camera Size

**Current**: 320x240 pixels

In `CameraFatigueMonitor.tsx` (line ~99-100):

```tsx
// FROM:
video: { width: 320, height: 240 }

// TO (Larger):
video: { width: 640, height: 480 }

// TO (Smaller):
video: { width: 256, height: 192 }

// TO (Ultra Small):
video: { width: 160, height: 120 }
```

Also update canvas in JSX:
```tsx
<canvas
    ref={canvasRef}
    width={320}      // Change here
    height={240}     // Change here
    className="monitor-canvas-overlay"
/>
```

---

### 3. Change Fatigue Thresholds

In `CameraFatigueMonitor.tsx` (lines 274-295):

```tsx
// Current thresholds:
if (fatigue >= 75) {
    message = '⚠️ SANGAT MENGANTUK! Istirahat sekarang!';
} else if (fatigue >= 50) {
    message = '⚠️ Anda terlihat lelah!';
}

// More sensitive (lower thresholds):
if (fatigue >= 60) {  // Changed from 75
    message = '⚠️ SANGAT MENGANTUK! Istirahat sekarang!';
} else if (fatigue >= 40) {  // Changed from 50
    message = '⚠️ Anda terlihat lelah!';
}

// Less sensitive (higher thresholds):
if (fatigue >= 85) {  // Changed from 75
    message = '⚠️ SANGAT MENGANTUK! Istirahat sekarang!';
} else if (fatigue >= 60) {  // Changed from 50
    message = '⚠️ Anda terlihat lelah!';
}
```

---

### 4. Change Alert Cooldown

In `CameraFatigueMonitor.tsx` (line 51):

```tsx
// Current: 10 seconds
const alertCooldown = 10000;

// More frequent (every 5 seconds):
const alertCooldown = 5000;

// Less frequent (every 30 seconds):
const alertCooldown = 30000;

// No cooldown (always alert):
const alertCooldown = 0;
```

---

### 5. Change Alert Messages

In `CameraFatigueMonitor.tsx` (lines 274-295):

```tsx
// Current:
message = '⚠️ SANGAT MENGANTUK! Istirahat sekarang!';

// Shorter:
message = '⚠️ ISTIRAHAT SEKARANG!';

// More casual:
message = '😴 Waktunya tidur dude!';

// Motivational:
message = '💪 Stay strong! Sedikit lagi!';
```

---

### 6. Change Alert Auto-Hide Duration

In `CameraFatigueMonitor.tsx` (line 295):

```tsx
// Current: 3 seconds
setTimeout(() => setShowAlert(false), 3000);

// Longer: 5 seconds
setTimeout(() => setShowAlert(false), 5000);

// No auto-hide (manual close needed):
// Remove this setTimeout completely
```

---

### 7. Change Colors

In `CameraFatigueMonitor.css`:

```css
/* Button gradient - FROM */
background: linear-gradient(135deg, #3b82f6, #2563eb);

/* Button gradient - TO (Purple) */
background: linear-gradient(135deg, #8b5cf6, #7c3aed);

/* Button gradient - TO (Green) */
background: linear-gradient(135deg, #10b981, #059669);

/* Monitor border - FROM */
border: 2px solid rgba(59, 130, 246, 0.3);

/* Monitor border - TO (Red) */
border: 2px solid rgba(239, 68, 68, 0.3);
```

---

### 8. Enable/Disable Specific Features

#### Disable Face Mesh Drawing
In `CameraFatigueMonitor.tsx` (line 187), comment out:
```tsx
// Draw face mesh
drawFaceMesh(ctx, landmarks);
```

#### Disable Alert System
In `CameraFatigueMonitor.tsx` (line 215), comment out:
```tsx
// Check for drowsiness alert
// checkDrowsinessAlert(currentFatigue, currentPERCLOS);
```

#### Disable Backend Sync
In `CameraFatigueMonitor.tsx` (lines 220-239), comment out entire block:
```tsx
// // Send to backend (throttled - every 1 second)
// if (Math.random() < 0.033) {
//     if (sessionId.current) {
//         try {
//             await faceApi.logEvent({...});
//         } catch (err) {...}
//     }
// }
```

---

## Advanced Customization

### Custom Fatigue Formula

In `CameraFatigueMonitor.tsx` (line 208):

```tsx
// Current: Uses built-in calculateFatigueScore
const currentFatigue = calculateFatigueScore(
    currentEAR,
    currentPERCLOS,
    currentBlinkRate,
    currentYawning
);

// Custom formula:
const currentFatigue = 
    (currentEAR < 0.2 ? 30 : 0) +  // 30 points if eyes closed
    (currentPERCLOS * 0.8) +         // 0-80 points from PERCLOS
    (currentBlinkRate < 10 ? 20 : 0) + // 20 points if low blink rate
    (currentYawning ? 20 : 0);       // 20 points if yawning
```

---

### Custom Face Mesh Colors

In `CameraFatigueMonitor.tsx` (lines 246-257):

```tsx
// Current eyes colors
ctx.strokeStyle = eyesClosed ? '#ef4444' : '#10b981';  // Red / Green

// Custom (blue/yellow):
ctx.strokeStyle = eyesClosed ? '#3b82f6' : '#eab308';  // Blue / Yellow

// Current mouth colors
ctx.strokeStyle = yawning ? '#f59e0b' : '#3b82f6';  // Orange / Blue

// Custom (red/green):
ctx.strokeStyle = yawning ? '#ef4444' : '#10b981';  // Red / Green
```

---

### Custom Fatigue Level Labels

In `CameraFatigueMonitor.tsx`, need to modify `getFatigueLevel()` from `faceUtils.ts`

Or create wrapper:
```tsx
const getFatigueLevelCustom = (score: number) => {
    if (score < 25) return { level: 'Terjaga!', color: '#10b981' };
    if (score < 50) return { level: 'Awas!', color: '#eab308' };
    if (score < 75) return { level: 'Hati-hati!', color: '#f97316' };
    return { level: 'DANGER!', color: '#ef4444' };
};
```

---

### Add Sound Alerts

In `CameraFatigueMonitor.tsx` (after setShowAlert):

```tsx
// Add after: setShowAlert(true);

// Simple beep
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

oscillator.frequency.value = fatigue > 75 ? 1000 : 800; // Higher pitch if critical
oscillator.type = 'sine';

gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

oscillator.start(audioContext.currentTime);
oscillator.stop(audioContext.currentTime + 0.5);
```

---

### Change Background Theme

In `CameraFatigueMonitor.css`:

```css
/* Current dark theme */
.camera-fatigue-monitor {
    background: rgba(15, 23, 42, 0.95);  /* Dark slate */
}

/* Light theme */
.camera-fatigue-monitor {
    background: rgba(248, 250, 252, 0.95);  /* Light slate */
}

/* Colored theme (blue) */
.camera-fatigue-monitor {
    background: rgba(30, 58, 138, 0.95);  /* Dark blue */
}

/* Fully opaque (no blur) */
.camera-fatigue-monitor {
    background: rgba(15, 23, 42, 1.0);  /* Completely opaque */
    backdrop-filter: none;  /* Remove blur */
}
```

---

## Integration Options

### Option 1: Always Show (Default)
```tsx
<CameraFatigueMonitor 
    isEnabled={cameraEnabled}
    onToggle={() => setCameraEnabled(!cameraEnabled)}
/>
```

### Option 2: Start Enabled
```tsx
const [cameraEnabled, setCameraEnabled] = useState(true);  // Changed from false
```

### Option 3: Keyboard Shortcut to Toggle

In `Session.tsx`:
```tsx
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'c' || e.key === 'C') {  // Press 'C' to toggle camera
            setCameraEnabled(!cameraEnabled);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [cameraEnabled]);
```

### Option 4: Auto-Enable on Critical Fatigue

In `CameraFatigueMonitor.tsx`:
```tsx
// After checkDrowsinessAlert function
if (shouldAlert && fatigue >= 75 && !cameraEnabled) {
    // Auto-enable camera if fatigue is critical
    setCameraEnabled(true);  // Note: would need to pass this as prop
}
```

---

## Monitoring & Debugging

### Enable Console Logs

In `CameraFatigueMonitor.tsx`, uncomment or add:
```tsx
// In onResults function
console.log({
    ear: currentEAR.toFixed(3),
    mar: currentMAR.toFixed(3),
    perclos: currentPERCLOS.toFixed(1),
    fatigue: currentFatigue.toFixed(1),
    blinkRate: currentBlinkRate.toFixed(1)
});
```

### Check Backend Data

In browser console:
```javascript
// Check all face events sent
fetch('http://localhost:8000/api/v1/face/stats/[session_id]')
    .then(r => r.json())
    .then(d => console.log(d))
```

---

## Performance Optimization

### Reduce Detection Frequency

In `CameraFatigueMonitor.tsx` (line 225):

```tsx
// Current: Every frame (~30fps)
if (Math.random() < 0.033) {  // ~1/30

// Reduce to 1x per 2 seconds:
if (Math.random() < 0.0167) {  // ~1/60

// Reduce to 1x per 5 seconds:
if (Math.random() < 0.0067) {  // ~1/150
```

### Lower Face Detection Resolution

In `CameraFatigueMonitor.tsx` (line 99-100):

```tsx
// Current: 320x240
video: { width: 320, height: 240 }

// Lower: 240x180 (faster)
video: { width: 240, height: 180 }

// Even lower: 160x120 (fastest, less accurate)
video: { width: 160, height: 120 }
```

---

## Responsive Design Adjustments

In `CameraFatigueMonitor.css`:

```css
/* Mobile first approach */
@media (max-width: 480px) {
    .camera-fatigue-monitor {
        width: 240px;  /* FROM 240px */
        width: 200px;  /* TO 200px - smaller */
    }
}

/* Tablet */
@media (max-width: 768px) {
    .camera-fatigue-monitor {
        width: 280px;  /* FROM 280px */
        width: 250px;  /* TO 250px */
    }
}

/* Desktop */
.camera-fatigue-monitor {
    width: 320px;  /* FROM 320px */
    width: 350px;  /* TO 350px - larger */
}
```

---

## Testing Custom Changes

### Test Checklist
1. ✅ Component still compiles
2. ✅ Camera button visible
3. ✅ Toggle works
4. ✅ Face detection accurate
5. ✅ Alerts trigger correctly
6. ✅ No console errors
7. ✅ Performance acceptable
8. ✅ UI looks good

### Debug Mode

Add to `CameraFatigueMonitor.tsx`:
```tsx
const DEBUG = true;  // Set to true for verbose logging

if (DEBUG) {
    console.log('[Camera Monitor]', {
        isActive,
        fatigueScore,
        perclos,
        blinkRate,
        timestamp: new Date().toLocaleTimeString()
    });
}
```

---

## Configuration Reference

| Setting | Location | Current | Range | Impact |
|---------|----------|---------|-------|--------|
| Position | CSS | bottom-right | 4 corners | UI layout |
| Size | TSX + CSS | 320x240 | 160-640px | Performance |
| Alert Cooldown | TSX | 10s | 0-60s | Alert frequency |
| Fatigue Threshold | TSX | 50/75 | 0-100 | Alert sensitivity |
| Sync Frequency | TSX | 1x/sec | 0.5-5x/sec | Backend load |
| Display Duration | TSX | 3 sec | 1-10s | Alert visibility |

---

**Customization Guide Complete!**
Ready to tweak as needed 🎨
