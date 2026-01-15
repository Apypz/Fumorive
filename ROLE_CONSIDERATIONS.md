# ERGODRIVE - Pertimbangan Pengembangan Per Peran
**Analisis Requirement & Scope untuk 5 Roles**

---

## 🎯 Overview

Dokumen ini menganalisis requirement dari **Diskusi Magang.md** dan memetakan tanggung jawab, teknologi, dan prioritas untuk setiap role dalam tim pengembangan ERGODRIVE.

---

## 👨‍💻 1. FRONT END WEB DEVELOPER

### **Teknologi Stack Utama**
- **Framework**: React 18+ dengan TypeScript 5+
- **Game Engine**: **Babylon.js 6+** (BUKAN Three.js!) - WebGL 2.0, physics built-in
- **Build Tool**: Vite 5.0+
- **State Management**: Zustand (lightweight)
- **Data Visualization**: D3.js v7+ dan Recharts untuk EEG waveform charts
- **Face Recognition**: TensorFlow.js 4.0+ dengan FaceMesh model
- **Routing**: React Router v6

### **Tanggung Jawab Utama**

#### **A. Single Page Application (SPA) Core** [FR-01]
- Integrasi Babylon.js simulator, dashboard, dan management dalam satu aplikasi
- Routing tanpa page reload (React Router)
- State management untuk koordinasi antar komponen
- **Prioritas**: TINGGI

#### **B. WebSocket Real-time Client** [FR-03]
- Setup WebSocket client untuk terima data dari Python LSL middleware
- Handle connection/disconnection/reconnection
- Real-time data binding ke UI components
- **Prioritas**: TINGGI

#### **C. Face Recognition Integration** [FR-05, FACE-01 to FACE-06]
- Akses webcam via MediaDevices API
- **PENTING**: Video TIDAK ditampilkan di UI (privacy)
- Integrasi TensorFlow.js untuk:
  - Face mesh detection (468 landmarks)
  - Eye state detection (Eye Aspect Ratio - EAR)
  - Yawn detection (Mouth Aspect Ratio - MAR)
  - Head pose estimation (yaw, pitch, roll)
  - Blink rate analysis
- Processing di browser (client-side, no server upload)
- **Prioritas**: TINGGI (Core Feature)

#### **D. Real-time Monitoring Dashboard** [UI-01]
- Sidebar/overlay dengan visualisasi real-time:
  - EEG waveform charts (D3.js/Recharts)
  - Brain wave band power (Delta, Theta, Alpha, Beta, Gamma)
  - Face detection status (mata, mulut, pose)
  - Fatigue score meter
- Non-blocking rendering (tidak ganggu game FPS)
- **Prioritas**: TINGGI

#### **E. Game Canvas Component** [GAME-01]
- React component wrapper untuk Babylon.js canvas
- Handle resize, fullscreen, performance monitoring
- Integration dengan alert system
- **Prioritas**: TINGGI

#### **F. UI/UX Components** [UI-02, UI-03, UI-04]
- Session control panel (start/stop/pause, settings)
- Post-session analytics report dengan charts
- User profile & session history
- Calibration wizard (step-by-step)
- **Prioritas**: SEDANG-TINGGI

#### **G. Performance Optimization**
- Code splitting dan lazy loading
- Bundle size optimization (target: <5MB initial)
- Maintain 30+ FPS dengan semua sistem aktif
- Web Workers untuk heavy computation (face detection)
- **Prioritas**: TINGGI

### **Challenges Khusus Frontend**
1. **Babylon.js Learning Curve**: Berbeda dari Three.js (yang disebutkan di timeline awal)
   - Built-in physics engine (perlu dipahami)
   - Scene management berbeda
   - Camera system lebih kompleks
   
2. **Real-time Performance**: Sinkronisasi 3 data stream (EEG, Face, Game) tanpa lag
   
3. **TensorFlow.js Face Detection**: Processing real-time video di browser
   - Optimize model (quantization)
   - Target: <100ms latency per frame
   
4. **Cross-browser Compatibility**: Chrome/Edge 115+, Firefox 115+, Safari 16.4+

### **Dependencies dengan Role Lain**
- **Backend**: WebSocket protocol, API endpoints
- **Game Logic**: Babylon.js scene structure, game state
- **Asset & UI**: UI design mockup, 3D assets compatibility
- **EEG Engineer**: Data format dari Python LSL, real-time protocol

---

## ⚙️ 2. BACK END WEB DEVELOPER

### **Teknologi Stack Utama**
- **Framework**: FastAPI 0.104+ (Python, async)
- **Database**: PostgreSQL 15+ dengan **TimescaleDB 2.11+** extension
- **Cache**: Redis 7.2+ (session data, pub/sub)
- **Authentication**: JWT + OAuth2
- **File Storage**: MinIO (S3-compatible) untuk raw EEG data
- **WebSocket**: FastAPI WebSocket support
- **Documentation**: Swagger/OpenAPI (auto-generated)

### **Tanggung Jawab Utama**

#### **A. WebSocket Server for Real-time Communication** [FR-03]
- WebSocket server untuk bridge Python LSL middleware → Browser
- Handle multiple concurrent connections (10-20 simultaneous)
- Message routing dan broadcasting
- Connection management (timeout, reconnection)
- **Prioritas**: TINGGI (Critical Path)

#### **B. Authentication & User Management** [FR-06]
- JWT token-based authentication
- User roles: Student, Researcher, Admin
- Login/register endpoints
- Role-based access control (RBAC)
- **Prioritas**: TINGGI

#### **C. Session Data Storage** [DATA-01, DATA-03]
- **TimescaleDB** untuk time-series data (EEG, face detection events)
- Session management (create, update, close)
- Real-time database streaming (PostgreSQL LISTEN/NOTIFY atau Redis pub/sub)
- Efficient storage format untuk high-frequency data (256Hz EEG)
- **Prioritas**: TINGGI

#### **D. EEG Data Ingestion API** [EEG-06, DATA-01]
- API endpoint untuk receive processed EEG data dari Python LSL
- Batch insertion untuk performance
- Data validation dan sanitization
- **Prioritas**: TINGGI

#### **E. Face Recognition Data Processing** [Backend support]
- API untuk log face detection events
- Aggregate statistics (blink rate, yawn count)
- **Prioritas**: SEDANG

#### **F. Multimodal Alert System** [FUSION-03]
- Alert logic API (threshold management)
- Notification service (WebSocket push)
- Alert history tracking
- **Prioritas**: TINGGI

#### **G. Session Recording & Playback** [DATA-02]
- Session timeline data structure
- Playback API endpoints
- Data export (CSV, JSON, XDF format)
- **Prioritas**: SEDANG

#### **H. Reporting & Analytics** [UI-03]
- Aggregation queries untuk post-session report
- Statistical calculations (mean, std, percentiles)
- API untuk generate PDF reports
- **Prioritas**: SEDANG

#### **I. File Storage Management** [DATA-01]
- MinIO integration untuk raw EEG data (XDF files)
- Presigned URLs untuk secure download
- Storage quota management
- **Prioritas**: RENDAH-SEDANG

### **Challenges Khusus Backend**
1. **TimescaleDB Optimization**: 
   - Hypertable design untuk EEG data (256 samples/second)
   - Compression policies
   - Retention policies
   
2. **Real-time Data Streaming**:
   - Low latency (<50ms backend processing)
   - Handle 10-20 concurrent sessions
   - Buffer management
   
3. **Data Privacy & Security**:
   - GDPR compliance
   - Data encryption at rest
   - No video storage (face processing di browser)
   
4. **WebSocket Scalability**:
   - Connection pooling
   - Load balancing (jika perlu)

### **Dependencies dengan Role Lain**
- **Frontend**: API contracts, WebSocket protocol
- **EEG Engineer**: Data format dari Python LSL, message protocol
- **Game Logic**: Game event logging format
- **Data Analyst**: ML model serving endpoint

---

## 🎮 3. GAME LOGIC DEVELOPER

### **Teknologi Stack Utama**
- **Game Engine**: Babylon.js 6.0+ (WebGL 2.0)
- **Physics**: Built-in Babylon.js physics (Havok, Ammo.js, atau Cannon.js)
- **Language**: TypeScript 5+
- **Asset Format**: .glb, .gltf untuk 3D models

### **Tanggung Jawab Utama**

#### **A. First-person Driving Simulation** [GAME-01]
- Kamera first-person dari sudut pandang pengemudi
- Kontrol kendaraan realistis:
  - Keyboard (WASD/Arrow keys)
  - Gamepad support (Xbox/PlayStation controller)
  - Optional: Steering wheel support
- Vehicle physics:
  - Acceleration, braking, steering
  - Momentum dan friction
  - Collision response
- **Prioritas**: TINGGI

#### **B. Long-distance Route System** [GAME-02]
- Rute 30-60 menit driving time
- Opsi 1: Fixed route dengan checkpoints
- Opsi 2: Procedural road generation
- Environment variations:
  - Urban (city streets)
  - Highway (long straight roads)
  - Rural (winding roads)
- **Prioritas**: TINGGI

#### **C. Dynamic Lighting & Weather** [GAME-03]
- Day/night cycle:
  - Dynamic sun position
  - Skybox transitions
  - Headlight activation at night
- Weather effects:
  - Rain (particle system + puddles)
  - Fog (visibility reduction)
  - Clear weather
- **Prioritas**: SEDANG

#### **D. Traffic & Event System** [GAME-04]
- AI traffic vehicles:
  - Lane following
  - Speed variations
  - Lane changing behavior
  - Traffic lights response
- Pedestrians (crossing roads)
- Unexpected events:
  - Animal crossing
  - Obstacles on road
  - Sudden braking from front vehicle
- **Prioritas**: TINGGI (Testing vigilance)

#### **E. Fatigue Visual Effects** [GAME-05]
- Progressive visual degradation saat fatigue detected:
  - Blur effect (simulating drowsy eyes)
  - Vignette darkening (peripheral vision loss)
  - Camera sway (head nodding simulation)
  - Slow blink effect
- Triggered by fatigue score dari multimodal detection
- **Prioritas**: TINGGI (Core Interaction)

#### **F. Performance Metrics Tracking** [GAME-06]
- Real-time tracking:
  - Lane deviation (center line distance)
  - Speed consistency
  - Reaction time to events
  - Collision events
  - Off-road events
- Log to backend for analysis
- **Prioritas**: SEDANG-TINGGI

#### **G. Post-processing Pipeline**
- Bloom effect (light glow)
- SSAO (ambient occlusion)
- Motion blur (optional)
- Anti-aliasing (FXAA or MSAA)
- **Prioritas**: SEDANG

#### **H. Performance Optimization**
- Maintain 30+ FPS minimum, 60 FPS target
- Frustum culling (don't render off-screen objects)
- LOD system (Level of Detail)
- Occlusion culling
- Asset streaming (load/unload based on distance)
- **Prioritas**: TINGGI

### **Challenges Khusus Game Logic**
1. **Babylon.js vs Three.js**: 
   - Babylon.js memiliki struktur berbeda dari Three.js
   - Built-in physics engine (lebih mudah tapi perlu dipahami)
   - Scene optimizer built-in
   
2. **Realistic Vehicle Physics**:
   - Balance antara realism dan playability
   - Tuning handling untuk feel yang baik
   
3. **Traffic AI Optimization**:
   - 10-20 NPC vehicles tanpa tank FPS
   - Simple but believable behavior
   
4. **Integration dengan Alert System**:
   - React to fatigue score in real-time
   - Apply visual effects tanpa break immersion

### **Dependencies dengan Role Lain**
- **Frontend**: Canvas integration, state management
- **Asset & UI**: 3D models, textures, sounds
- **EEG/Data**: Fatigue score input for visual effects
- **Backend**: Game event logging

---

## 🎨 4. ASSET & UI DEVELOPER

### **Teknologi Stack Utama**
- **3D Modeling**: Blender 3.x+
- **Texture Design**: Substance Painter, Photoshop, GIMP
- **UI/UX Design**: Figma, Adobe XD
- **Audio Editing**: Audacity, FL Studio
- **Format**: .glb/.gltf untuk models, .png/.jpg untuk textures, .mp3/.ogg untuk audio

### **Tanggung Jawab Utama**

#### **A. UI/UX Design & Mockups**
- **Landing Page Design**
  - Clean, modern interface
  - Call-to-action yang jelas
  - Responsive layout mockup
- **Dashboard Design** [UI-01]
  - Real-time monitoring layout
  - EEG chart visualization design
  - Alert notification design
- **Session Control Panel** [UI-02]
  - Button styles, controls
  - Settings modal
  - Calibration wizard UI
- **Post-session Report** [UI-03]
  - Report layout dengan charts
  - Print-friendly design
- **Color Palette & Typography**
  - Accessibility compliant (WCAG 2.1 AA)
  - High contrast untuk readability
  - Professional yet friendly tone
- **Prioritas**: TINGGI

#### **B. 3D Assets untuk Driving Simulator**
- **Road & Environment**
  - Road segments (straight, curve, intersection)
  - Asphalt textures dengan marka jalan
  - Sidewalks, curbs
  - Terrain (grass, dirt, buildings)
  - Trees, bushes, rocks
  - Skybox (day, night, sunset)
- **Vehicles**
  - Player vehicle (interior + exterior)
    - Dashboard, steering wheel, seats
    - Hood view reference
  - AI traffic vehicles (sedan, SUV, truck, bus)
  - Low-poly untuk performance
- **Props & Details**
  - Traffic signs (stop, yield, speed limit)
  - Traffic lights
  - Street lamps
  - Barriers, cones
  - Pedestrians (simple models)
- **Optimization**
  - LOD levels (high, medium, low)
  - Texture atlases
  - Target: <100k polygons total scene
- **Prioritas**: TINGGI

#### **C. HUD & UI Elements (In-game)**
- **HUD Components**
  - Speedometer (analog or digital)
  - Minimap (optional)
  - Alert indicators (fatigue warning)
  - Fuel gauge, gear indicator
- **Sprite Textures**
  - Icons untuk alerts
  - Button graphics
- **Babylon.js GUI Integration**
  - 2D UI overlay menggunakan Babylon.js GUI
- **Prioritas**: SEDANG-TINGGI

#### **D. Audio Assets**
- **Vehicle Sounds**
  - Engine idle, acceleration, deceleration
  - Brake sounds
  - Collision impact
- **Environment Sounds**
  - Wind ambience
  - Rain sounds
  - Traffic noise
- **Alert Sounds**
  - Warning beep (fatigue alert)
  - Critical alert sound
- **Music** (optional)
  - Ambient background music (low volume)
- **Prioritas**: SEDANG

#### **E. Animation & Visual Effects**
- **UI Animations**
  - Loading animations
  - Transition effects
  - Micro-interactions (button hover, click)
- **Particle Effects** (reference for game dev)
  - Rain particles
  - Dust/smoke
  - Exhaust fumes
- **Prioritas**: RENDAH-SEDANG

#### **F. Design System Documentation**
- Component library documentation
- Asset naming conventions
- Style guide (colors, typography, spacing)
- Icon library
- **Prioritas**: SEDANG

### **Challenges Khusus Asset & UI**
1. **Performance vs Quality**:
   - Balance detail dengan polygon count
   - Texture resolution trade-offs
   - Audio file size optimization
   
2. **Babylon.js Compatibility**:
   - Export dari Blender ke .glb format
   - Test loading dan rendering di Babylon.js
   - Material/shader compatibility
   
3. **Accessibility**:
   - Color blind friendly palette
   - High contrast ratios
   - Readable fonts
   
4. **Consistency**:
   - Unified art direction
   - Consistent style across all assets

### **Dependencies dengan Role Lain**
- **Frontend**: UI components implementation
- **Game Logic**: 3D asset integration, performance requirements
- **Backend**: Asset file storage (MinIO)
- **EEG/Data**: Alert visualization design

---

## 🧠 5. DATA ANALYST & EEG ENGINEER

### **Teknologi Stack Utama**
- **Language**: Python 3.10-3.11
- **EEG Streaming**: pylsl 1.16.0+ (Lab Streaming Layer)
- **Signal Processing**: MNE-Python 1.5+, SciPy 1.11+, NumPy
- **Real-time Communication**: websockets 12.0+ dengan asyncio
- **Data Serialization**: MessagePack (msgpack) - binary format
- **Machine Learning**: scikit-learn, TensorFlow/PyTorch (optional)
- **GUI** (optional): PyQt5 atau Custom Tkinter untuk calibration
- **Packaging**: PyInstaller + conda untuk distribusi

### **Tanggung Jawab Utama**

#### **A. Python LSL Middleware Application** [FR-02, EEG-01]
**CORE COMPONENT - Aplikasi Python terpisah dari web backend**

- **LSL Stream Connection**
  - Discover dan connect ke EEG device stream
  - Support multiple devices: Muse 2/3, OpenBCI, Emotiv, NeuroSky
  - Handle connection loss dan auto-reconnection
  - Stream info parsing (channel count, sample rate)
- **Configuration Management**
  - Config file untuk different devices
  - Calibration parameters storage
  - User preferences
- **Prioritas**: TINGGI (Critical Infrastructure)

#### **B. Real-time Signal Processing** [EEG-02]
- **Preprocessing Pipeline**
  - Bandpass filter (1-50Hz) untuk remove DC drift dan high-freq noise
  - Notch filter (50Hz atau 60Hz) untuk remove powerline interference
  - Artifact removal (eye blink, muscle artifact detection)
  - Baseline correction
- **Epoch Creation**
  - Sliding window (1-2 second epochs)
  - Overlap untuk smooth transition
- **Performance**: Process dalam <50ms per epoch
- **Prioritas**: TINGGI

#### **C. Feature Extraction** [EEG-03]
- **Frequency Band Power Analysis**
  - FFT (Fast Fourier Transform)
  - Power spectral density calculation
  - Band extraction:
    - Delta (1-4 Hz) - deep sleep
    - Theta (4-8 Hz) - drowsiness, meditation
    - Alpha (8-13 Hz) - relaxed, closed eyes
    - Beta (13-30 Hz) - active thinking, alert
    - Gamma (30-50 Hz) - cognitive processing
- **Derived Metrics**
  - Theta/Alpha ratio (drowsiness indicator)
  - Beta/Alpha ratio (engagement index)
  - Total power
- **Prioritas**: TINGGI

#### **D. Cognitive State Detection** [EEG-04]
- **Fatigue Detection Algorithm**
  - Threshold-based: High Theta/Alpha ratio
  - Engagement index: Low Beta/High Alpha
  - Cognitive load estimation
- **Real-time Classification**
  - States: Alert, Drowsy, Fatigued, Distracted
  - Confidence scoring (0-100%)
- **Adaptive Thresholds**
  - Baseline calibration (first 2-5 minutes)
  - Personal threshold adjustment
- **Prioritas**: TINGGI (Core Feature)

#### **E. WebSocket Server for Browser Communication** [FR-03]
- **Async WebSocket Server**
  - Python `websockets` library dengan `asyncio`
  - Send processed EEG data ke browser client
  - Receive commands dari browser (start, stop, calibrate)
- **Message Format**
  - MessagePack serialization (faster than JSON)
  - Structured message types:
    - EEG data (band powers, features)
    - Device status
    - Alerts/warnings
- **Connection Management**
  - Handle multiple clients
  - Heartbeat/ping-pong
  - Graceful disconnect
- **Prioritas**: TINGGI

#### **F. Multimodal Fusion Algorithm** [FUSION-01, FUSION-02]
- **Data Synchronization**
  - Timestamp alignment (LSL timestamps + browser timestamps)
  - Handle clock drift
- **Fusion Algorithm**
  - Weighted combination:
    - 60% EEG features
    - 40% Face recognition features (dari frontend)
  - Fatigue score calculation (0-100)
- **Alert Logic**
  - Threshold-based alerts:
    - Warning: 60-75
    - Critical: 75+
  - Hysteresis untuk prevent flickering
- **Prioritas**: TINGGI

#### **G. Signal Quality Monitoring** [EEG-05]
- **Electrode Quality Check**
  - Impedance monitoring (if device supports)
  - Signal amplitude validation
  - Noise level detection
- **Visual Feedback**
  - Per-channel quality indicator
  - Real-time alerts untuk poor contact
- **Prioritas**: SEDANG

#### **H. Data Recording & Export** [EEG-06, DATA-02]
- **Raw Data Recording**
  - Save to .xdf format (LSL standard)
  - Compatible dengan MATLAB, Python MNE, EEGLAB
- **Processed Data Export**
  - CSV untuk features (timestamp, band powers)
  - JSON untuk metadata
- **Session Metadata**
  - Device info, calibration params
  - Start/end times
  - Event markers
- **Prioritas**: SEDANG-TINGGI

#### **I. Machine Learning Model (Advanced)** [FUSION-02]
- **Training Data Collection**
  - Labeled data (alert vs drowsy)
  - Feature engineering
- **Model Training**
  - Classifier: Random Forest, SVM, atau Neural Network
  - Cross-validation
  - Hyperparameter tuning
- **Model Deployment**
  - Real-time inference (<100ms)
  - Model versioning
- **Prioritas**: SEDANG (Optional MVP, Tinggi untuk v2)

#### **J. Calibration Tool** [UI-06 - Python side]
- **GUI Application** (PyQt5 atau Tkinter)
  - Wizard interface
  - Step-by-step calibration
  - Visual feedback
- **Calibration Procedure**
  - Baseline recording (eyes open, eyes closed)
  - Threshold calculation
  - Save calibration profile
- **Prioritas**: SEDANG

#### **K. Packaging & Distribution** [SYS-03]
- **Standalone Executable**
  - PyInstaller untuk create .exe (Windows) atau app (macOS)
  - Bundle semua dependencies
  - One-click installer
- **Docker Alternative**
  - Dockerfile untuk Python LSL app
  - Docker Compose integration
- **Prioritas**: SEDANG (End of project)

### **Challenges Khusus EEG Engineer**
1. **Multi-device Compatibility**:
   - Different sample rates (256Hz vs 500Hz)
   - Different channel counts (4-8 channels)
   - Different LSL stream formats
   
2. **Real-time Constraints**:
   - Total latency budget: <200ms (device → browser)
   - Processing: <50ms
   - WebSocket transmission: <50ms
   - Frontend rendering: <100ms
   
3. **Artifact Handling**:
   - Eye blink artifacts sangat kuat
   - Muscle artifacts (jaw clenching)
   - Movement artifacts
   
4. **Individual Variability**:
   - Brain wave patterns vary per person
   - Calibration critical untuk accuracy
   - Adaptive algorithms needed

5. **Python Distribution**:
   - User mungkin tidak familiar dengan Python
   - Dependencies hell (library conflicts)
   - PyInstaller packaging issues

### **Dependencies dengan Role Lain**
- **Frontend**: WebSocket protocol, data format, face detection features input
- **Backend**: Data storage format, API untuk ML model serving
- **Game Logic**: Fatigue score output untuk visual effects
- **Asset & UI**: Calibration UI design

---

## 🔗 INTEGRATION ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S COMPUTER                              │
│                                                                   │
│  ┌────────────────┐                                              │
│  │  EEG Device    │ (Muse, OpenBCI, etc.)                       │
│  │  (LSL Stream)  │                                              │
│  └───────┬────────┘                                              │
│          │ LSL Protocol                                          │
│          ▼                                                        │
│  ┌──────────────────────────────────────────┐                   │
│  │  PYTHON LSL MIDDLEWARE APP               │                   │
│  │  (Data Analyst & EEG Engineer)           │                   │
│  │  - Signal processing                      │                   │
│  │  - Feature extraction                     │                   │
│  │  - WebSocket server                       │                   │
│  └───────────────────┬──────────────────────┘                   │
│                      │ WebSocket                                 │
│                      ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         BROWSER (Chrome/Firefox/Edge)                     │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  REACT APP (Frontend Developer)                     │ │  │
│  │  │  - WebSocket client                                  │ │  │
│  │  │  - State management (Zustand)                        │ │  │
│  │  │  - Webcam access (MediaDevices API)                 │ │  │
│  │  │  - TensorFlow.js face recognition                   │ │  │
│  │  └──────────────────┬──────────────────────────────────┘ │  │
│  │                     │                                      │  │
│  │  ┌─────────────────▼──────────────────────────────────┐  │  │
│  │  │  BABYLON.JS GAME (Game Logic Developer)           │  │  │
│  │  │  - Driving simulation                               │  │  │
│  │  │  - Physics engine                                   │  │  │
│  │  │  - Visual effects (fatigue)                         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────┬───────────────────────────────────────┘  │
│                       │ HTTPS/WSS                                │
└───────────────────────┼──────────────────────────────────────────┘
                        ▼
         ┌──────────────────────────────────────┐
         │   BACKEND SERVER (Backend Dev)       │
         │   - FastAPI                          │
         │   - WebSocket relay (optional)       │
         │   - PostgreSQL + TimescaleDB         │
         │   - Redis cache                      │
         │   - MinIO storage                    │
         └──────────────────────────────────────┘
```

### **Data Flow**
1. **EEG Device** → pylsl → **Python LSL Middleware**
2. **Python Middleware** processes signal → WebSocket → **Browser**
3. **Webcam** → **Frontend** → TensorFlow.js → face features
4. **Browser** combines EEG + Face data → **Multimodal Fusion**
5. **Fusion Result** → **Babylon.js Game** (visual effects)
6. **All Data** → **Backend** → **Database** (storage)

---

## 📋 KEY TECHNICAL CORRECTIONS FOR TIMELINE

### **🚨 CRITICAL CHANGES NEEDED**

1. **Three.js → Babylon.js**
   - ALL timeline references to "Three.js" harus diganti "Babylon.js"
   - Learning resources berbeda
   - API dan struktur berbeda
   
2. **Python LSL Middleware adalah Aplikasi Terpisah**
   - Bukan part of backend
   - Standalone Python app (EEG Engineer responsibility)
   - Perlu development timeline sendiri
   
3. **Face Recognition: TensorFlow.js (bukan MediaPipe/OpenCV)**
   - Timeline mention MediaPipe → should be TensorFlow.js
   - FaceMesh model from TensorFlow.js
   
4. **TimescaleDB bukan PostgreSQL biasa**
   - Backend perlu setup TimescaleDB extension
   - Hypertable configuration
   - Time-series optimization

5. **Data Flow Architecture**
   - EEG data TIDAK langsung ke Backend
   - Flow: Device → Python LSL → WebSocket → Browser → Backend
   - Frontend role lebih besar (handle fusion)

---

## ✅ NEXT STEPS

1. **Review** dokumen ini dengan tim
2. **Diskusi** scope dan prioritas untuk setiap role
3. **Update** PROJECT_TIMELINE.md dengan:
   - Babylon.js instead of Three.js
   - Python LSL middleware development tasks
   - TensorFlow.js face recognition
   - TimescaleDB setup
   - Correct architecture integration
4. **Re-distribute** tasks berdasarkan findings ini

---

**Dokumen ini akan menjadi acuan untuk update timeline yang lebih akurat!**
