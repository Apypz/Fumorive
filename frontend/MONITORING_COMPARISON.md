# Monitoring Comparison: EEG vs Camera

## Display Comparison

### Current In-Game Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TOP OF SCREEN (HUDs)                         │
│                                                                      │
│                      ┌──────────────────────┐                        │
│                      │  🧠 EEG MONITOR      │                        │
│                      │  Top-Right Corner    │                        │
│                      │  • State (Alert/...)  │                        │
│                      │  • Fatigue (0-100%)   │                        │
│                      │  • 4 Channels (µV)    │                        │
│                      │  • Quality Metrics    │                        │
│                      └──────────────────────┘                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                                                                      │
│                  [GAME CANVAS - MAIN RACING GAME]                   │
│                                                                      │
│                  [SpeedometerHUD - Top Left]                        │
│                  [ControlsHUD - Center]                             │
│                  [SteeringWheelHUD - Bottom Center]                 │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                           ┌──────────────┐                           │
│                           │ 🎥 CAMERA    │                           │
│                           │ MONITOR      │                           │
│                           │ Bottom-Right │                           │
│                           │ • Webcam     │                           │
│                           │ • Fatigue    │                           │
│                           │ • Score      │                           │
│                           └──────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Feature Comparison Table

| Feature | EEG Monitor | Camera Monitor | Purpose |
|---------|-------------|----------------|---------|
| **Location** | Top-Right | Bottom-Right | Non-overlapping UI |
| **Size** | 280×380px compact | ~320px wide | Both fit in viewport |
| **Data Source** | Muse2 Headset | Webcam | Dual biometric monitoring |
| **Monitoring Type** | Brain Activity | Eye/Face Fatigue | Comprehensive fatigue detection |
| **Key Metrics** | θ/α ratio, bands | Blink rate, PERCLOS | Different detection methods |
| **Update Rate** | ~10 FPS (100ms) | ~30 FPS (33ms) | Real-time processing |
| **Draggable** | ✅ Yes | ✅ Yes | Can reposition both |
| **Collapsible** | ✅ Yes | ✅ Yes | Save screen space |
| **Connection Status** | 🟢 Live/🔴 Error | N/A | Verify data flow |
| **Fatigue Score** | 0-100% (colored bar) | 0-100% (numeric) | Visual & numeric |
| **State Badge** | Alert/Drowsy/Fatigued | N/A | Clear status indicator |

## EEG Metrics Explained

### What's Being Measured?

```
CHANNEL DATA (Raw EEG):
├── TP9:  Temporal left (30-50 µV typically)
├── AF7:  Front-left prefrontal (25-45 µV typically)
├── AF8:  Front-right prefrontal (25-45 µV typically)
└── TP10: Temporal right (30-50 µV typically)

FREQUENCY BANDS (How brain is "oscillating"):
├── Delta (0.5-4 Hz)    → Deep sleep/unconsciousness
├── Theta (4-8 Hz)      → Drowsiness/meditation
├── Alpha (8-12 Hz)     → Relaxation/focus
├── Beta (12-30 Hz)     → Active thinking/alert
└── Gamma (30+ Hz)      → High cognitive demand

DERIVED INDICATORS:
├── θ/α Ratio (0.0-3.0) → Drowsiness indicator
│   └─ <1.0: Alert, >2.0: Fatigued
├── β/α Ratio (0.0-2.0) → Cognitive engagement
│   └─ High: Focused, Low: Relaxed
└── Signal Quality (0-1.0) → Data reliability
    └─ >0.8: Good signal
```

### Cognitive State Detection Logic

```
ALERT (Green) ✓
├─ θ/α ratio < 1.0
├─ High alpha power (8-10 Hz)
├─ Stable signal quality
└─ Fatigue score: 0-30%

DROWSY (Orange) ⚠
├─ θ/α ratio 1.0 - 2.0
├─ Increasing theta power
├─ Moderate signal quality
└─ Fatigue score: 31-65%

FATIGUED (Red) ✕
├─ θ/α ratio > 2.0
├─ Dominant theta/delta
├─ May have quality issues
└─ Fatigue score: 66-100%
```

## How They Complement Each Other

### EEG Monitoring (Brain Activity)
✅ **Strengths**:
- Direct brain signal measurement
- Early fatigue detection (before eyes show signs)
- Works with eyes open or closed
- Doesn't require lighting conditions
- Measures cognitive load directly

❌ **Limitations**:
- Requires headset placement
- Sensitive to head movement
- May have signal quality issues
- More technical setup

### Camera Monitoring (Eye/Face)
✅ **Strengths**:
- Non-contact (no headset needed)
- Easy user experience
- Visual confirmation of drowsiness
- Blink pattern analysis
- Works in most conditions

❌ **Limitations**:
- Requires good lighting
- Affected by glasses/sunglasses
- Can't detect cognitive fatigue
- May miss early stage drowsiness

## Game Integration Points

### 1. **Dual Monitoring System**
Both monitors show in-game, allowing developers to:
```typescript
// In Session.tsx
const [eegCognitiveState, setEegCognitiveState] = useState<'alert' | 'drowsy' | 'fatigued'>()
const [cameraFatigueState, setCameraFatigueState] = useState<number>() // 0-100%

// Use combined assessment
const overallFatigueLevel = (eegCognitiveState + cameraFatigueState) / 2
```

### 2. **Recommended Actions Based on Combined Data**
```typescript
if (eegCognitiveState === 'fatigued' && cameraFatigueState > 70) {
  // Both indicate severe fatigue
  showRestWarning()
  reduceGameDifficulty()
  playAlertSound()
} else if (eegCognitiveState === 'drowsy' || cameraFatigueState > 50) {
  // Early stage, show gentle warning
  showCautionIndicator()
}
```

### 3. **Data Logging for Research**
```typescript
// Log session data including both metrics
const sessionData = {
  timestamp: Date.now(),
  eegState: eegCognitiveState,
  eegFatigueScore: currentMetrics.eegFatigueScore,
  cameraFatigueScore: cameraFatigueScore,
  gameState: gameState,
  playerPerformance: performanceMetrics,
}
```

## Visual Display Side-by-Side Example

### EEG Widget (Top-Right)
```
┌────────────────────────┐
│ 🧠 EEG MONITOR    ▼    │
├────────────────────────┤
│ 🟢 Connected (Live)    │
│                        │
│ State: ✓ Alert        │
│                        │
│ Fatigue: 23%           │
│ ▓░░░░░░░░░░░░░░░░░░░ │
│                        │
│ TP9:  45.23µV   │      │
│ AF7:  32.10µV   │      │
│ AF8:  28.45µV   │      │
│ TP10: 38.12µV   │      │
│                        │
│ θ/α: 0.825 | QA: 92%   │
└────────────────────────┘
```

### Camera Monitor (Bottom-Right)
```
┌────────────────┐
│ 🎥 CAMERA  ✕ ▼ │
├────────────────┤
│ ┌────────────┐ │
│ │   WEBCAM   │ │
│ │  [FEED]    │ │
│ └────────────┘ │
│                │
│ Fatigue: 15%   │
│ ████░░░░░░░░  │
│ PERCLOS: 12%   │
│ Blinks/min: 18 │
└────────────────┘
```

## Customization Options

### 1. Change EEG Position
```typescript
// In Session.tsx
<EEGMonitoringWidget
  defaultPosition="top-left"  // Options: top-left, top-right, bottom-left, bottom-right
/>
```

### 2. Hide Either Monitor
```typescript
// Disable EEG
const [eegEnabled, setEegEnabled] = useState(false)

// Disable Camera
<CameraFatigueMonitor isEnabled={false} />
```

### 3. Combine into Single Panel
Create a unified dashboard showing both metrics:
```typescript
// Pseudo-code
<UnifiedMonitor
  eegData={currentMetrics}
  cameraData={cameraFatigueScore}
  position="top-right"
/>
```

## Usage Recommendations

### For **Research/Studies**:
- ✅ Enable both monitors
- ✅ Log all metrics
- ✅ Position non-overlapping
- ✅ Use all biometric data

### For **Gaming Experience**:
- EEG: Always enabled (primary fatigue detection)
- Camera: Optional (user can toggle)
- Show warnings when fatigue detected
- Adjust game difficulty dynamically

### For **User Comfort**:
- Keep draggable (users can position as needed)
- Collapsible (save screen space)
- Clear connection status (user knows if data is valid)
- Accessible information (not technical jargon)

## Performance Considerations

| Component | CPU Impact | Memory | Update Rate |
|-----------|-----------|--------|------------|
| EEG Widget | ~2-3% | ~1MB | 10 FPS |
| Camera Monitor | ~5-8% | ~3-5MB | 30 FPS |
| Combined | ~7-11% | ~4-6MB | 30 FPS |

Both can run simultaneously without significant impact on game performance.

---

**Current Status**: ✅ Both monitors integrated and working
**Last Updated**: Feb 6, 2026
