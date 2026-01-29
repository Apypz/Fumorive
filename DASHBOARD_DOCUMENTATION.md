# 📊 Dokumentasi Dashboard Fumorive

## 🎯 Tujuan Utama Dashboard

Dashboard Fumorive adalah **pusat kontrol monitoring kelelahan mengemudi** yang mengintegrasikan data dari:
- 🧠 **EEG Headset (Muse 2)** - Aktivitas gelombang otak
- 👁️ **Computer Vision (MediaPipe Face Mesh)** - Analisis visual wajah
- 🎮 **Simulasi Mengemudi** - Performa berkendara real-time

---

## 🏗️ Arsitektur Menu Dashboard

Dashboard menggunakan **Tabbed Navigation System** dengan 3 tab utama:

### 1️⃣ **Overview Tab** - Ringkasan & Monitoring Real-time

**Tujuan:** Memberikan snapshot status sistem dan driver secara keseluruhan.

#### **A. Welcome Banner dengan Quick Actions**
```
🎨 Design: Gradient purple banner
📍 Lokasi: Paling atas, span 3 columns
🎯 Fungsi:
  - Menyambut user dengan nama (dari JWT token)
  - Menampilkan Fatigue Score real-time (saat ini "--" jika belum ada data)
  - 2 Quick Action Buttons:
    → "Mulai Sesi Baru" - Navigate ke /session (simulasi + EEG)
    → "Test Kamera" - Navigate ke /face-recognition
```

**Kenapa Penting:**
- User langsung tahu status kelelahan mereka (fatigue score)
- CTA jelas untuk memulai monitoring
- One-click access ke fitur utama

---

#### **B. System Status Cards (3 Cards)**

##### 🔹 **EEG Headset Card**
```
Device: Muse 2
Status: Disconnected (default)
Action Button: "Konfigurasi Device" → Navigate ke Settings Tab
```

**Tujuan:**
- Menampilkan status koneksi EEG headset
- Visual indicator (red dot = offline, green = connected)
- Direct link ke settings untuk setup device

**Technical:**
- Akan integrate dengan LSL (Lab Streaming Layer) untuk real-time streaming
- Status berubah otomatis saat headset terkoneksi

---

##### 🔹 **Camera System Card**
```
Device: Face Mesh (MediaPipe)
Status: Ready (default - karena browser-based)
Action Button: "Test Face Detection" → Navigate ke Face Recognition
```

**Tujuan:**
- Menunjukkan camera system selalu ready (tidak perlu hardware khusus)
- User bisa langsung test face detection
- Green status memberi confidence bahwa fitur ini available

**Technical:**
- Menggunakan `navigator.mediaDevices.getUserMedia()`
- MediaPipe Face Mesh via TensorFlow.js
- Browser-based, no external hardware needed

---

##### 🔹 **Backend API Card**
```
Service: PostgreSQL Database
Status: Connected (jika backend running)
Features: ✓ Auth ✓ Sessions ✓ Face API
```

**Tujuan:**
- Transparency sistem backend status
- User tahu apakah data bisa disimpan atau tidak
- Debugging: jika offline, user tahu harus start backend

**Technical:**
- Check via API health endpoint (akan diimplementasi)
- Auto-reconnect dengan exponential backoff

---

#### **C. Informasi & Tips Section**
```
🎨 Design: Light gray card dengan dashed border
📍 Lokasi: Full width (span 3 columns)
🎯 Fungsi: Onboarding guide untuk new users
```

**Konten:**
1. Hubungkan Muse 2 via LSL
2. Pastikan kamera terdeteksi
3. Klik "Mulai Sesi Baru"
4. Sistem analisis brain waves + visual cues
5. Dapatkan alert otomatis

**Kenapa Penting:**
- New user guidance tanpa perlu manual terpisah
- Step-by-step instruction langsung di UI
- Mengurangi learning curve

---

#### **D. Brain Wave Activity Card (Muse2 EEG)**
```
📊 Displays: Delta, Theta, Alpha, Beta, Gamma waves
🎨 Design: 5 circular indicators dengan warna berbeda
📍 Status: "No Data" (until EEG connected)
```

**Tujuan Monitoring Gelombang Otak:**

| Wave    | Frequency | Indikasi               | Warna   | Use Case                      |
|---------|-----------|------------------------|---------|-------------------------------|
| **Delta** | 1-4 Hz    | Deep Sleep             | Purple  | Extreme drowsiness detection  |
| **Theta** | 4-8 Hz    | Drowsiness             | Cyan    | Early fatigue warning         |
| **Alpha** | 8-13 Hz   | Relaxed                | Green   | Optimal driving state         |
| **Beta**  | 13-30 Hz  | Focused                | Orange  | High concentration            |
| **Gamma** | 30-50 Hz  | High Alert             | Red     | Stress/overstimulation        |

**Algoritma Detection:**
```python
# Pseudocode
if (theta_power > threshold) AND (alpha_power < threshold):
    fatigue_level = "High"
    trigger_warning()

if delta_power > critical_threshold:
    fatigue_level = "Critical"
    trigger_emergency_alert()
```

**Technical Implementation:**
- Real-time FFT (Fast Fourier Transform) via Muse LSL stream
- Power Spectral Density (PSD) calculation
- Moving average dengan window 5 detik
- Data dikirim ke backend untuk long-term analysis

---

#### **E. Analisis Kelelahan (Multimodal Fusion)**
```
📊 Displays:
  - EEG Fatigue Score (0-100%)
  - Eye Closure / PERCLOS (0-100%)
  - Blink Rate (per minute)
  - Yawn Count
🎨 Design: Progress bars + mini stat cards
⚡ Real-time: Update setiap detik
```

**Tujuan Multimodal Fusion:**

Menggabungkan 2 data sources untuk akurasi lebih tinggi:

1. **EEG Data (Objective - Internal State)**
   - Brain fatigue dari gelombang theta/delta
   - Cognitive load dari beta/gamma
   - Attention level dari alpha

2. **Computer Vision (Objective - External Behavior)**
   - Eye Aspect Ratio (EAR) untuk deteksi mata tertutup
   - Mouth Aspect Ratio (MAR) untuk deteksi yawn
   - Head pose untuk deteksi head nodding
   - Blink rate analysis

**Fusion Algorithm:**
```javascript
// Weighted averaging
final_fatigue_score = 
  (eeg_fatigue * 0.6) +          // EEG lebih reliable (60%)
  (face_fatigue * 0.4)           // Face detection (40%)

// Cross-validation
if (eeg_fatigue > 70 AND face_fatigue > 70):
  confidence_level = "High"
  trigger_immediate_alert()
else if (eeg_fatigue > 70 OR face_fatigue > 70):
  confidence_level = "Medium"
  trigger_warning()
```

**Keuntungan Multimodal:**
- ✅ Reduce false positives (kedua sistem harus konfirmasi)
- ✅ Lebih robust (jika 1 sensor gagal, masih ada backup)
- ✅ Capture different aspects (internal brain state + external behavior)

---

#### **F. Status Kognitif Card**
```
📊 Metrics:
  - Attention Level (0-100)
  - Cognitive Load (Low/Medium/High)
  - Signal Quality (0-100)
🎨 Design: 3 colored info boxes
📍 Data Source: EEG analysis
```

**Tujuan:**
- **Attention Level**: Mengukur fokus driver (dari alpha/beta waves)
- **Cognitive Load**: Deteksi mental fatigue (dari gamma waves)
- **Signal Quality**: QC untuk data EEG (jika jelek, warning ke user)

**Use Cases:**
- Driver distracted (attention < 50%) → Warning
- High cognitive load + low attention → Critical state
- Poor signal quality → Prompt user to adjust headset

---

#### **G. Performa Mengemudi (Simulasi)**
```
📊 Metrics:
  - Lane Deviation (cm)
  - Speed Consistency (%)
  - Reaction Time (ms)
  - Alert Count (#)
🎨 Design: 4-column grid dengan icons
📍 Status: "Awaiting Session"
```

**Tujuan:**
Mengukur **behavioral performance** dari simulasi:

1. **Lane Deviation**
   - Mengukur seberapa sering keluar jalur
   - Higher deviation = lower attention/fatigue
   - Threshold: >30cm = warning

2. **Speed Consistency**
   - Variasi kecepatan (steady = baik)
   - Erratic speed = fatigue indicator
   - Target: >85% consistency

3. **Reaction Time**
   - Response ke obstacle/event di simulasi
   - Slower reaction = drowsiness
   - Normal: <500ms, Warning: >800ms

4. **Alert Count**
   - Total warnings yang triggered
   - Metric untuk driver safety awareness

**Integration:**
```javascript
// Simulasi akan kirim event via WebSocket
socket.on('driving_event', (data) => {
  if (data.lane_deviation > 30) {
    fatigue_score += 5
    alert_count++
  }
})
```

---

#### **H. Tips Keselamatan Berkendara**
```
🎨 Design: Pink-red gradient card
📍 Lokasi: Span 2 columns
🎯 Fungsi: Safety reminders & best practices
```

**4 Tips Utama:**
1. **Istirahat Teratur** - Setiap 2 jam/200km
2. **Cek Signal Quality** - Headset terpasang benar
3. **Respond to Alerts** - Jangan ignore warnings
4. **Hindari Multitasking** - Fokus mengemudi

**Kenapa di Overview:**
- Constant reminder untuk safety
- Educate users tentang best practices
- Increase trust dengan transparency

---

#### **I. Sesi Terakhir Card**
```
📊 Shows: Last completed session summary
📍 Default: Empty state dengan CTA
🎯 Fungsi: Quick access ke history
```

**When Data Available:**
- Date & time sesi
- Duration
- Distance driven
- Average fatigue score
- Overall performance score

---

### 2️⃣ **History Tab** - Rekaman Sesi & Analytics

**Tujuan:** Long-term tracking dan trend analysis.

#### **A. Filter & Search Bar**
```
🔍 Search: Cari sesi by name/date
🎚️ Filter: By date range, fatigue level, device type
📥 Export: Download data as CSV/JSON
```

**Use Cases:**
- Research data collection
- Personal progress tracking
- Report generation untuk supervisor

---

#### **B. Session Statistics Overview**
```
📊 4 Aggregate Metrics:
  - Total Sessions
  - Total Hours driven
  - Average Fatigue Score
  - Total Alerts Triggered
```

**Tujuan Analytics:**
- Identify patterns (e.g., fatigue always high di malam hari)
- Compare performance across sessions
- Data-driven insights untuk improve safety

---

#### **C. Session List**
```
📋 Each card shows:
  - Session name
  - Date, duration, distance
  - Fatigue score (visual indicator)
  - Tags: "Moderate Fatigue", "3 Alerts"
  - "View Details" button → Detailed analytics page (future)
```

**Empty State:**
- Clear CTA: "Start Your First Session"
- User tidak bingung kenapa kosong

---

### 3️⃣ **Settings Tab** - Konfigurasi Sistem

**Tujuan:** Customization & system configuration.

#### **A. Device Configuration**
```
⚙️ Settings:
  - EEG Headset selection (dropdown)
  - Camera device selection
  - Sampling rate (128Hz/256Hz/512Hz)
```

**Kenapa Penting:**
- Multi-device support (jika punya >1 Muse)
- Adjustable sampling rate untuk performance vs accuracy tradeoff
- Camera selection untuk multiple webcam

---

#### **B. Detection Thresholds**
```
🎚️ Sliders:
  - Warning Threshold (default: 60%)
  - Critical Threshold (default: 80%)
  - PERCLOS Threshold (default: 80%)
```

**Customization Use Cases:**
- **Strict mode** (thresholds lebih rendah) untuk new drivers
- **Relaxed mode** untuk experienced drivers
- **Research mode** dengan custom thresholds untuk experiments

**Technical:**
```javascript
// Backend akan respect custom thresholds
if (fatigue_score > user_warning_threshold) {
  send_warning_alert()
}
if (fatigue_score > user_critical_threshold) {
  send_critical_alert()
}
```

---

#### **C. Notifications Settings**
```
🔔 Toggles:
  - Audio Alerts (beep sound)
  - Visual Effects (screen flash)
  - Haptic Feedback (vibration - future)
```

**Accessibility:**
- Hearing impaired → Visual only
- Driving → Audio + Haptic
- Lab research → All off

---

#### **D. Data & Privacy**
```
🔒 Options:
  - Save Session Data (toggle)
  - Share Anonymous Data (toggle)
  - Export All Data (button)
```

**Privacy-First Approach:**
- User kontrol penuh atas data mereka
- Transparent tentang data usage
- Easy export untuk portability

---

#### **E. System Info**
```
ℹ️ Display:
  - App version
  - Backend status (online/offline)
  - LSL connection status
```

**Debugging:**
- User bisa report bugs dengan version number
- Quick check untuk system health

---

#### **F. Database Status**
```
💾 Shows:
  - Storage used
  - Sessions stored
  - "Clear All Data" button
```

**Data Management:**
- Prevent storage overflow
- Quick cleanup untuk testing
- Transparency tentang disk usage

---

## 🎨 Design Philosophy

### **1. Progressive Disclosure**
- Overview → High-level status
- History → Detailed past data
- Settings → Advanced configuration

### **2. Visual Hierarchy**
```
Priority 1: Fatigue Score (biggest, gradient banner)
Priority 2: System Status (3 prominent cards)
Priority 3: Detailed Metrics (grid layout)
Priority 4: Tips & History (supplementary info)
```

### **3. Color Coding System**
```
🟢 Green (#10b981):  Safe, Connected, Good
🟡 Yellow (#f59e0b): Warning, Medium Fatigue
🔴 Red (#ef4444):    Critical, Disconnected, High Fatigue
🔵 Blue (#3b82f6):   Info, EEG Data
🟣 Purple (#8b5cf6): Performance, Simulation
```

### **4. Empty States**
- Setiap section punya empty state yang clear
- Call-to-action untuk guide user next steps
- Tidak membuat user bingung kenapa "kosong"

---

## 🚀 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DASHBOARD                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   EEG Data   │  │  Face Data   │  │  Sim Data    │    │
│  │   (Muse 2)   │  │ (MediaPipe)  │  │  (Unity)     │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                  ┌─────────▼─────────┐                     │
│                  │  Fusion Algorithm │                     │
│                  │  (Backend API)    │                     │
│                  └─────────┬─────────┘                     │
│                            │                                │
│                  ┌─────────▼─────────┐                     │
│                  │  PostgreSQL DB    │                     │
│                  │  (TimescaleDB)    │                     │
│                  └─────────┬─────────┘                     │
│                            │                                │
│                  ┌─────────▼─────────┐                     │
│                  │  Dashboard UI     │                     │
│                  │  (React + Zustand)│                     │
│                  └───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### **Real-time Updates:**
```javascript
// WebSocket connection untuk live data
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Update dashboard state
  updateBrainWaves(data.eeg);
  updateFaceMetrics(data.face);
  updateDrivingPerformance(data.simulation);
  
  // Calculate fusion score
  const fatigueScore = calculateFusion(data);
  updateFatigueScore(fatigueScore);
  
  // Trigger alerts if needed
  if (fatigueScore > threshold) {
    showAlert();
  }
};
```

---

## 📊 Metrics Prioritization

### **Critical Metrics (Always Visible):**
1. **Fatigue Score** - Composite dari semua data
2. **System Status** - EEG/Camera/Backend connectivity
3. **Alert Count** - Safety warnings triggered

### **Secondary Metrics (Expandable):**
1. Brain wave breakdown (Delta-Gamma)
2. Face detection details (EAR, MAR, blinks)
3. Driving performance details

### **Tertiary Metrics (History Tab):**
1. Long-term trends
2. Session comparisons
3. Statistical analysis

---

## 🔮 Future Enhancements

### **Phase 2 - Predictive Analytics:**
- Machine learning untuk predict fatigue 5-10 menit ahead
- Personalized thresholds based on historical data
- Smart recommendations based on patterns

### **Phase 3 - Social Features:**
- Compare scores dengan peers (anonymous)
- Leaderboards untuk gamification
- Team management untuk fleet operators

### **Phase 4 - Advanced Integrations:**
- Mobile app dengan push notifications
- Wearable device support (smartwatch)
- Car integration (OBD-II, CAN bus)

---

## 📚 Summary

Dashboard Fumorive adalah **comprehensive monitoring platform** yang:

✅ **Intuitif** - User langsung paham apa yang harus dilakukan
✅ **Informatif** - Semua metrics penting visible di satu tempat
✅ **Actionable** - Clear CTAs dan next steps
✅ **Safe** - Prioritas pada safety dengan alerts & tips
✅ **Scalable** - Arsitektur modular untuk future features

**Core Value Proposition:**
> "Combine EEG brain monitoring with computer vision to create the most accurate driver fatigue detection system, presented in an intuitive dashboard that anyone can use."

---

**Questions? Contact:**
- Project: Fumorive Driver Fatigue Monitoring System
- Stack: React + TypeScript + FastAPI + PostgreSQL + MediaPipe
- Architecture: Multimodal Fusion (EEG + Computer Vision)

