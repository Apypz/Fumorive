# 🎥 Camera Monitor Update - Visual Guide

## Sebelum vs Sesudah

### SEBELUM (Old Version)
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│          🎮 GAME CANVAS FULL SCREEN                    │
│                                                         │
│                                    ┌─────────────────┐  │
│                                    │ [X]             │  │
│                                    ├─────────────────┤  │
│                                    │ Camera Feed     │  │
│                                    │ (320x240)       │  │
│                                    │                 │  │
│                                    ├─────────────────┤  │
│                                    │   Fatigue: 45   │  │
│                                    ├─────────────────┤  │
│                                    │ Stats           │  │
│                                    └─────────────────┘  │
│                                    (pojok kanan bawah)  │
│                                                         │
└─────────────────────────────────────────────────────────┘

Problems:
❌ Pojok kanan bawah (bisa keblok kontrol)
❌ Posisi fixed (tidak bisa dipindah)
❌ Tidak bisa diminimaize
❌ Error popup jika session gagal
```

### SESUDAH (New Version)
```
┌──────────────┐
│ ⊞ Camera [-] [X]  ← Draggable header
├──────────────┤
│ Camera Feed  │  
│ (320x240)    │
│              │
├──────────────┤
│  Fatigue: 45 │
├──────────────┤
│ Stats Data   │
└──────────────┘
(pojok kiri atas - draggable!)

Benefits:
✅ Pojok kiri atas (safe area)
✅ Bisa di-drag (user control)
✅ Bisa di-minimize (save space)
✅ No error popup (graceful handling)
```

---

## Monitor States

### 1. EXPANDED (Normal View)
```
┌─ ⊞ ─ Camera Monitor ─────────────── [-] [X] ─┐
│                                                │
│  📹 Camera Feed                                │
│  (320x240 pixels)                             │
│  • Face mesh overlay                          │
│  • Real-time detection                        │
│                                                │
├────────────────────────────────────────────────┤
│            Fatigue Score Circle                │
│              (70x70 diameter)                  │
│                   62                           │
│                  Lelah                         │
├────────────────────────────────────────────────┤
│  👁️ 18 blinks/min     ⚡ 25% PERCLOS          │
├────────────────────────────────────────────────┤
│  ⚠️ Anda terlihat lelah! (auto-hide)          │
└────────────────────────────────────────────────┘
Width: 320px
Height: Full content
```

### 2. MINIMIZED (Compact View)
```
┌─ ⊞ ─ Camera Monitor ─────────────── [+] [X] ─┐
└────────────────────────────────────────────────┘
Only header visible!
Width: 280px
Height: ~40px

Data still processing in background ✓
```

### 3. DISABLED (Button Only)
```
┌──────────────┐
│     📷       │  ← Blue button
└──────────────┘
32x32 pixels
Click to enable camera
```

---

## Drag Behavior

### Grab State
```
Cursor over header → Changes to GRAB (✋)

┌─ ⊞ ─ Camera Monitor ─────────────── [-] [X] ─┐
   ↑                                               
   Cursor here shows "grab" icon
```

### Dragging State
```
Click + Move mouse → Monitor follows cursor

Before:                    After drag:
┌─────────────┐           
│ Camera      │           
│ Monitor     │           
└─────────────┘           
  (20px, 20px)              

                          ┌─────────────┐
                          │ Camera      │
                          │ Monitor     │
                          └─────────────┘
                            (100px, 150px)

Movement: Smooth & Instant
```

### Drop State
```
Release mouse → Position saved for session

┌─────────────┐
│ Camera      │
│ Monitor     │
└─────────────┘
  (300px, 250px) ← New position locked
```

---

## Button Interactions

### Minimize Button [-]
```
BEFORE:                    AFTER:
┌─────────────────────┐   ┌─────────────────────┐
│ ⊞ Camera [-] [X]   │   │ ⊞ Camera [+] [X]   │ ← Button changed
├─────────────────────┤   └─────────────────────┘
│ Camera Feed         │
│ Fatigue Indicator   │   Content hidden
│ Stats               │
└─────────────────────┘

Click again to expand ↻
```

### Close Button [X]
```
┌─────────────────────┐
│ ⊞ Camera [-] [X]   │
├─────────────────────┤
│ Camera Feed         │
│ Fatigue Indicator   │
│ Stats               │
└─────────────────────┘
       ↓ Click [X]
       ↓
Monitor disappears
Camera stops
Session ends (if exists)
```

---

## Positioning

### Default Position (Initial)
```
Screen:
┌──────────────────────────────────────────┐
│┌────────────────────────────┐            │
││ ⊞ Camera Monitor  [-] [X]  │            │
││ 20px          20px         │            │
││ from left     from top      │            │
│└────────────────────────────┘            │
│                                          │
│                                          │
│                    🎮 GAME CANVAS        │
│                                          │
│                                          │
└──────────────────────────────────────────┘

Safe area: Top-left (doesn't block controls)
```

### Dragged Position (Example)
```
Screen:
┌──────────────────────────────────────────┐
│                    ┌────────────────────┐│
│                    │ ⊞ Camera [-] [X] ││
│                    │ (200px, 100px)   ││
│                    │                  ││
│                    └────────────────────┘│
│       🎮 GAME CANVAS                     │
│                                          │
│                                          │
└──────────────────────────────────────────┘

User can drag anywhere
(persists for session)
```

---

## Error Handling Flow

### Scenario: No Authentication

#### Before (Old):
```
User clicks camera button
         ↓
System tries to create session
         ↓
❌ FAILED (not authenticated)
         ↓
❌ Error popup: "Failed to create session"
         ↓
❌ Camera doesn't start
```

#### After (New):
```
User clicks camera button
         ↓
System tries to create session
         ↓
⚠️ SKIPPED (not authenticated)
         ↓
✅ Camera still starts!
         ↓
✅ Face detection works locally
         ↓
✅ (Data not saved to backend, but feature works!)
```

---

## Color Scheme

### Header Colors
```
Background: Dark blue (rgba(30, 41, 59, 0.5))
Border: Blue (rgba(59, 130, 246, 0.3))
Text: Light gray (#cbd5e1)
```

### Button Colors
```
NORMAL STATE:
Background: Blue (rgba(59, 130, 246, 0.1))
Border: Blue (rgba(59, 130, 246, 0.2))
Text: Gray (#cbd5e1)

HOVER STATE:
Background: Lighter Blue (rgba(59, 130, 246, 0.2))
Border: Lighter Blue (rgba(59, 130, 246, 0.4))
Text: White (#e2e8f0)

CLOSE BUTTON HOVER:
Background: Red (rgba(239, 68, 68, 0.2))
Border: Red (rgba(239, 68, 68, 0.4))
Text: Red (#ef4444)
```

---

## Size Comparison

### Monitor Sizes by Device

```
DESKTOP (1920x1080):
┌─────────────────┐
│ Camera Monitor  │  Width: 320px
│ (Full size)     │  Height: 300px
│                 │  Ratio: 4:3 camera
└─────────────────┘

TABLET (1024x768):
┌──────────────┐
│Camera Monitor│  Width: 280px
│(Smaller)     │  Height: 250px
└──────────────┘

MOBILE (480x640):
┌────────────┐
│ Camera     │  Width: 240px
│ Monitor    │  Height: 210px
│ (Tiny)     │
└────────────┘
```

---

## Interaction Timeline

### User Journey

```
T=0:00 - User starts game
         └─ Camera button (📷) appears at top-left

T=0:05 - User clicks camera button
         └─ Browser asks: "Allow camera?"
         └─ User: "Allow"

T=0:10 - Camera monitor appears at top-left
         ├─ Position: 20px, 20px
         ├─ Face detection starts
         └─ Metrics begin updating

T=2:00 - User wants to see more
         └─ Drags monitor to center
         └─ Monitor follows cursor smoothly
         └─ New position: 400px, 200px

T=3:00 - User wants to focus on game
         └─ Clicks [-] button
         └─ Monitor minimizes
         └─ Only header visible now
         └─ Face detection still running ✓

T=4:00 - Alert triggered!
         └─ Shows: "Anda terlihat lelah!"
         └─ Even while minimized, alert works!

T=5:00 - User clicks [+] to expand
         └─ Monitor expands again
         └─ Back to full view

T=10:00 - User done gaming
          └─ Clicks [X] button
          └─ Camera stops
          └─ Session ends
          └─ Monitor disappears
```

---

## Responsive Layout

### Desktop Layout
```
Game Window (1920x1080):
┌──────────────────────────────────────────────────┐
│┌──────────────────┐                              │
││ Camera Monitor   │                              │
││ (320x240)        │                              │
││ Top-Left Area    │                              │
│└──────────────────┘                              │
│                                                  │
│              🎮 FULL GAME VIEWPORT              │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘

Monitor doesn't block controls ✓
```

### Mobile Layout
```
Game Window (480x640):
┌──────────────────┐
│┌────────────────┐│
││Camera Monitor  ││ (240x180)
││(compact)       ││
│└────────────────┘│
│                  │
│ 🎮 GAME VIEWPORT │
│                  │
│                  │
└──────────────────┘

Still usable, compact size ✓
```

---

## Animation Reference

### Drag Animation
```
Duration: Instant (0ms)
Easing: Linear
Movement: Follow cursor exactly
Smoothness: 60 FPS
```

### Minimize Animation
```
Duration: 0.3s
Easing: ease
Effect: Width transition
From: 320px → 280px (minimized)
Back: 280px → 320px (expanded)
```

### Alert Animation
```
Duration: 0.3s
Easing: ease
Effect: slideInUp
From: 10px lower + transparent
To: Original position + visible
Auto-hide: 3 seconds
```

---

## Accessibility

### Keyboard Navigation
```
Tab key: Cycle through buttons
  1. Minimize/Expand button [-]/[+]
  2. Close button [X]

Enter/Space: Activate button
  • [-]/[+]: Toggle minimize
  • [X]: Close camera

Mouse:
  • Header: Drag to move
  • Buttons: Click to interact
  • Right-click: No context menu (disabled)
```

### Visual Feedback
```
Button State:
IDLE:   Light blue background
HOVER:  Lighter blue background
ACTIVE: Darker blue background
FOCUS:  Visible border ring

Cursor Changes:
Over header: grab (✋)
Over button: pointer (👆)
While dragging: grabbing (✊)
```

---

## Browser Compatibility

```
Chrome:     ✅ Full support
Firefox:    ✅ Full support
Safari:     ✅ Full support
Edge:       ✅ Full support

Mobile:
Chrome:     ✅ Full support
Safari iOS: ✅ Full support
Firefox:    ✅ Full support
```

---

**Visual Guide Complete! 🎨**

Untuk lebih detail, lihat: CAMERA_MONITOR_UPDATE.md
