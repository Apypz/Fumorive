# ERGODRIVE Project Timeline
**Driving Simulator dengan Integrasi EEG & Face Recognition**

---

## 📋 Informasi Project
- **Mulai**: 7 Januari 2026 (Rabu - Week 1)
- **Target Ideal**: 13 Februari 2026 (Jumat)
- **Target Maksimal**: 20 Februari 2026 (Jumat)
- **Hari Kerja**: Senin - Jumat (5 hari/minggu)
- **Week 1 Khusus**: Rabu - Jumat (3 hari)

## 👥 Tim Pengembang (5 Orang)
1. **Front End Web Developer**
2. **Back End Web Developer**
3. **Game Logic Developer**
4. **Asset & UI Developer**
5. **Data Analyst & EEG Engineer**

---

## 🗓️ Timeline Pengerjaan Detail

### **WEEK 1: Planning & Setup** (7 - 9 Januari 2026)
**Catatan: Week 1 dimulai hari Rabu (3 hari kerja)**

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 1** | **Rabu, 7 Januari** | - Kickoff meeting dengan stakeholder<br>- Diskusi visi dan misi project ERGODRIVE<br>- Identifikasi masalah dan tujuan pengembangan<br>- Pembuatan requirement umum project |
| | **Kamis, 8 Januari** | - Mendefinisikan fitur utama (EEG integration, face recognition, driving simulator)<br>- Diskusi teknologi stack yang akan digunakan<br>- Pembagian peran tim (5 roles) |
| | **Jumat, 9 Januari** | - Setup workspace dan repository project<br>- Pembuatan timeline project keseluruhan<br>- Menentukan milestone dan deliverables<br>- Learning session tentang project (EEG, face recognition, Babylon.js) |

---

### **WEEK 2: Development Foundation** (12 - 16 Januari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 2** | **Senin, 12 Januari** | **Frontend:**<br>- Setup React + TypeScript + Vite project<br>- Install dependencies (Babylon.js, Zustand, React Router, D3.js)<br>**Backend:**<br>- Setup FastAPI environment (Python 3.10+)<br>- Setup PostgreSQL + TimescaleDB extension<br>- Database schema design (users, sessions, EEG time-series data)<br>**Game Logic:**<br>- Setup project structure untuk game engine<br>- Initialize Babylon.js scene, engine, dan camera<br>**Asset & UI:**<br>- Research design references untuk driving simulator<br>- Sketch wireframe dashboard dan HUD<br>**EEG Engineer:**<br>- Setup Python LSL middleware (standalone app)<br>- Research Muse 2 LSL integration<br>- Install pylsl, MNE-Python, websockets library |
| | **Selasa, 13 Januari** | **Frontend:**<br>- Setup routing structure (React Router)<br>- Create basic page components (Landing, Dashboard, Session)<br>**Backend:**<br>- Implementasi database models dengan SQLAlchemy<br>- Setup Alembic migration scripts<br>- Configure TimescaleDB hypertables untuk EEG data<br>**Game Logic:**<br>- Implementasi Babylon.js camera controller<br>- Setup UniversalCamera untuk first-person view<br>**Asset & UI:**<br>- Desain mockup landing page<br>- Create color palette dan typography guideline<br>**EEG Engineer:**<br>- Setup Python LSL stream discovery<br>- Test connection dengan Muse 2 device<br>- Implement basic LSL inlet |
| | **Rabu, 14 Januari** | **Frontend:**<br>- Setup Zustand store structure<br>- Implement basic state management (user, session, EEG data)<br>**Backend:**<br>- Implementasi user authentication (JWT + OAuth2)<br>- Create login/register endpoints<br>- Setup Redis untuk session caching<br>**Game Logic:**<br>- Implementasi input manager (keyboard, gamepad support)<br>- Setup event listeners untuk kontrol kendaraan<br>**Asset & UI:**<br>- Desain mockup dashboard monitoring<br>- Design HUD components (speedometer, alerts)<br>**EEG Engineer:**<br>- Implement Python WebSocket server (asyncio)<br>- Setup message protocol (MessagePack)<br>- Test bidirectional communication |
| | **Kamis, 15 Januari** | **Frontend:**<br>- Implementasi landing page component<br>- Create reusable UI components (buttons, cards, modals)<br>**Backend:**<br>- Setup RESTful API structure (routes, dependencies)<br>- Implement CORS dan middleware<br>- Create API versioning (/api/v1/)<br>**Game Logic:**<br>- Setup Babylon.js physics engine (Havok/Ammo.js)<br>- Implementasi basic vehicle physics dan controller<br>**Asset & UI:**<br>- Create design system documentation<br>- Design alert dan notification components<br>**EEG Engineer:**<br>- Implement bandpass filter (1-50Hz) dengan SciPy<br>- Implement notch filter (50Hz) untuk powerline noise<br>- Test filtering pada sample EEG data |
| | **Jumat, 16 Januari** | **Frontend:**<br>- Integration testing (routing + state)<br>- Fix styling issues<br>**Backend:**<br>- Auto-generate API documentation (FastAPI Swagger UI)<br>- Test authentication flow dengan Postman<br>**Game Logic:**<br>- Testing vehicle controls di Babylon.js<br>- Debug physics engine issues<br>**Asset & UI:**<br>- Review dan revisi mockup berdasarkan feedback<br>- Prepare asset export format (.glb/.gltf)<br>**EEG Engineer:**<br>- Test pipeline: Muse 2 → LSL → Python → WebSocket<br>- Documentation Python LSL middleware setup |

---

### **WEEK 3: Core Features Development** (19 - 23 Januari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 3** | **Senin, 19 Januari** | **Frontend:**<br>- Setup WebSocket client (native atau socket.io-client)<br>- Create EEG data visualization skeleton (D3.js/Recharts)<br>**Backend:**<br>- Implementasi FastAPI WebSocket endpoint<br>- Setup WebSocket relay: Python LSL → FastAPI → Browser<br>- API endpoint untuk receive EEG data dari Python LSL<br>**Game Logic:**<br>- Create road generator system di Babylon.js<br>- Implement procedural road mesh generation<br>**Asset & UI:**<br>- Start 3D modeling road segments di Blender<br>- Design texture untuk aspal dan marka jalan<br>**EEG Engineer:**<br>- Implement real-time LSL data acquisition loop<br>- Setup preprocessing pipeline (bandpass + notch filter)<br>- Send processed data ke FastAPI via HTTP POST |
| | **Selasa, 20 Januari** | **Frontend:**<br>- Implement Babylon.js canvas component di React<br>- Setup React-Babylon.js integration (useEffect lifecycle)<br>**Backend:**<br>- Create session management endpoints (CRUD)<br>- Implement TimescaleDB data insertion untuk EEG records<br>- Setup batch insertion untuk performance<br>**Game Logic:**<br>- Implementasi environment lighting (HemisphericLight, DirectionalLight)<br>- Create skybox dengan Babylon.js CubeTexture<br>**Asset & UI:**<br>- Continue 3D modeling kendaraan di Blender<br>- Design vehicle textures dan materials (PBR workflow)<br>**EEG/Data Analyst:**<br>- Implement FFT dengan NumPy untuk frequency analysis<br>- Feature extraction: Delta (1-4Hz), Theta (4-8Hz), Alpha (8-13Hz), Beta (13-30Hz), Gamma (30-50Hz)<br>- Calculate band powers |
| | **Rabu, 21 Januari** | **Frontend:**<br>- Setup webcam access (MediaDevices API)<br>- Create video stream component (hidden dari UI - privacy)<br>- Install @mediapipe/face_mesh library<br>**Backend:**<br>- API untuk log face detection events<br>- Endpoint untuk store aggregate face stats<br>**Game Logic:**<br>- Import vehicle model (.glb) ke Babylon.js<br>- Setup basic collision detection (bounding boxes)<br>**Asset & UI:**<br>- Create 3D environment props (trees, signs, barriers)<br>- Design HUD mockup (speedometer, alerts)<br>**EEG/Data Analyst:**<br>- Implement drowsiness detection: Theta/Alpha ratio<br>- Create baseline calibration procedure<br>- Define alertness thresholds (alert/drowsy/fatigued) |
| | **Kamis, 22 Januari** | **Frontend:**<br>- Integrate MediaPipe Face Mesh<br>- Implement real-time face landmark detection (468 points)<br>- Calculate Eye Aspect Ratio (EAR) untuk eye closure<br>- Calculate Mouth Aspect Ratio (MAR) untuk yawning<br>**Backend:**<br>- Implement data buffering untuk high-frequency EEG<br>- Setup Redis caching untuk session data<br>**Game Logic:**<br>- Create traffic lane system dengan line detection<br>- Implement road curvature logic (Bezier curves)<br>**Asset & UI:**<br>- Implement HUD components dengan Babylon.js GUI<br>- Create sprite textures untuk UI elements<br>**EEG/Data Analyst:**<br>- Implement PERCLOS calculation (eye closed >80% per minute)<br>- Implement yawn detection threshold (MAR analysis)<br>- Head pose estimation dari face landmarks |
| | **Jumat, 23 Januari** | **Frontend:**<br>- Integration testing: EEG data (backend) + Face data (local)<br>- Debug real-time data flow dan timestamp sync<br>- Implement multimodal fusion logic di browser<br>**Backend:**<br>- Test WebSocket performance (latency measurement)<br>- Optimize streaming: target <50ms backend latency<br>**Game Logic:**<br>- Integration Babylon.js dengan monitoring data<br>- Test vehicle behavior dengan real-time alerts<br>**Asset & UI:**<br>- Finalize basic 3D assets export (.glb format)<br>- Prepare LOD levels (high/medium/low poly)<br>**EEG/Data Analyst:**<br>- Test multimodal fusion: 60% EEG + 40% Face<br>- Validate detection accuracy dengan test scenarios<br>- Calculate combined fatigue score (0-100) |

---

### **WEEK 4: Advanced Features & Integration** (26 - 30 Januari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 4** | **Senin, 26 Januari** | **Frontend:**<br>- Implement graphics settings panel (quality presets)<br>- Create performance monitoring overlay (FPS, latency)<br>**Backend:**<br>- Implement alerting system API (threshold-based)<br>- Setup WebSocket notification push<br>**Game Logic:**<br>- Dynamic lighting di Babylon.js (day/night cycle)<br>- Implement sun position animation dengan keyframes<br>**Asset & UI:**<br>- Create environment assets (skybox variations, sun/moon)<br>- Design settings UI components<br>**EEG/Data Analyst:**<br>- Refine multimodal fusion algorithm<br>- Implement weighted combination (configurable weights)<br>- Adaptive threshold adjustment |
| | **Selasa, 27 Januari** | **Frontend:**<br>- Implement real-time EEG waveform chart (D3.js)<br>- Create band power visualization (bar charts)<br>**Backend:**<br>- Create ML model serving endpoint (if using ML)<br>- Implement prediction API dengan FastAPI<br>**Game Logic:**<br>- Post-processing pipeline: DefaultRenderingPipeline<br>- Implement bloom, SSAO effects di Babylon.js<br>**Asset & UI:**<br>- Design modal dan panel components<br>- Create icon set untuk UI (alerts, settings)<br>**EEG/Data Analyst:**<br>- Train ML classifier (Random Forest/SVM)<br>- Features: band powers, ratios, face metrics<br>- Model validation dan hyperparameter tuning |
| | **Rabu, 28 Januari** | **Frontend:**<br>- Real-time monitoring dashboard layout<br>- Implement face detection status visualization<br>- Show EEG signal quality indicators<br>**Backend:**<br>- Session recording: save EEG timeline ke TimescaleDB<br>- Create session playback data structure<br>**Game Logic:**<br>- Implement AI traffic vehicles di Babylon.js<br>- Basic lane-following pathfinding untuk NPC<br>**Asset & UI:**<br>- Finalize button styles dan interactions<br>- Create loading animations (spinner, progress bar)<br>**EEG/Data Analyst:**<br>- Implement confidence scoring untuk predictions<br>- Create configurable alert thresholds (warning/critical)<br>- Implement hysteresis untuk prevent alert flickering |
| | **Kamis, 29 Januari** | **Frontend:**<br>- Implement session playback controls<br>- Create session history view dengan filtering<br>**Backend:**<br>- Playback API endpoints (retrieve time-series data)<br>- Data export: XDF (LSL standard), CSV, JSON<br>**Game Logic:**<br>- Traffic AI behavior: lane changing, speed variation<br>- Obstacle placement system (random events)<br>**Asset & UI:**<br>- Create 3D vehicle variants (sedan, truck, bus)<br>- Design traffic sign 3D models<br>**EEG/Data Analyst:**<br>- Optimize real-time prediction latency<br>- Target: <100ms total (EEG processing + inference)<br>- Profile bottlenecks dengan Python profiler |
| | **Jumat, 30 Januari** | **Frontend:**<br>- Full integration: React + Babylon.js + MediaPipe + WebSocket<br>- E2E testing complete user flow<br>**Backend:**<br>- Integration: FastAPI + Python LSL + TimescaleDB + Redis<br>- Load testing dengan k6 (10-20 concurrent users)<br>**Game Logic:**<br>- Babylon.js integration dengan fatigue score<br>- Implement visual effects: blur, vignette, camera sway<br>- Test multiple scenario variations<br>**Asset & UI:**<br>- Final asset review dan optimization<br>- Texture compression (Basis/KTX format)<br>- LOD setup untuk all 3D models<br>**EEG/Data Analyst:**<br>- Validate multimodal detection accuracy<br>- Performance benchmarking: end-to-end latency<br>- Test dengan real Muse 2 data |

---

### **WEEK 5: Testing & Refinement** (2 - 6 Februari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 5** | **Senin, 2 Februari** | **Frontend:**<br>- Unit testing React components<br>- Test state management logic<br>**Backend:**<br>- API endpoint testing (Pytest)<br>- Database query testing<br>**Game Logic:**<br>- Test vehicle physics accuracy<br>- Validate collision detection<br>**Asset & UI:**<br>- Visual QA untuk semua assets<br>- Check texture loading dan rendering<br>**EEG/Data Analyst:**<br>- Test EEG data pipeline end-to-end<br>- Validate signal processing accuracy |
| | **Selasa, 3 Februari** | **Frontend:**<br>- Integration testing (Frontend ↔ Backend)<br>- Test WebSocket connection stability<br>**Backend:**<br>- Load testing dengan k6/Artillery<br>- Test concurrent user handling<br>**Game Logic:**<br>- Performance testing (FPS monitoring)<br>- Test dengan different hardware specs<br>**Asset & UI:**<br>- Cross-browser rendering test<br>- Responsive design validation<br>**EEG/Data Analyst:**<br>- Face recognition accuracy testing<br>- Test detection pada berbagai kondisi lighting |
| | **Rabu, 4 Februari** | **Frontend:**<br>- Code splitting dan lazy loading (React.lazy)<br>- Optimize bundle size (tree shaking, minification)<br>**Backend:**<br>- TimescaleDB query optimization (continuous aggregates)<br>- Implement Redis caching strategy untuk hot data<br>**Game Logic:**<br>- Babylon.js frustum culling configuration<br>- LOD system optimization (distance-based switching)<br>- Scene optimizer untuk auto-tuning<br>**Asset & UI:**<br>- Asset compression (texture: Basis, model: Draco)<br>- Reduce draw calls (mesh merging, instancing)<br>**EEG/Data Analyst:**<br>- ML model optimization (quantization untuk smaller size)<br>- Optimize NumPy operations<br>- Reduce prediction latency to <100ms |
| | **Kamis, 5 Februari** | **Frontend:**<br>- Fix critical UI bugs<br>- Improve error boundaries<br>**Backend:**<br>- Fix API edge cases<br>- Enhance error handling dan logging<br>**Game Logic:**<br>- Fix physics glitches<br>- Debug traffic AI issues<br>**Asset & UI:**<br>- Fix asset loading issues<br>- Resolve texture artifacts<br>**EEG/Data Analyst:**<br>- Fix false positive detections<br>- Improve threshold tuning |
| | **Jumat, 6 Februari** | **Frontend:**<br>- Implement loading screen dengan progress<br>- Add smooth transitions<br>**Backend:**<br>- Health check endpoints<br>- Monitoring setup (logging, metrics)<br>**Game Logic:**<br>- Debug overlay implementation<br>- Performance metrics display<br>**Asset & UI:**<br>- Design tutorial screens<br>- Create onboarding animation<br>**EEG/Data Analyst:**<br>- Create detection confidence visualization<br>- Implement calibration flow |

---

### **WEEK 6: Polishing & Documentation** (9 - 13 Februari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 6** | **Senin, 9 Februari** | **Frontend:**<br>- Write component documentation (JSDoc)<br>- Code refactoring (DRY, SOLID principles)<br>**Backend:**<br>- API documentation dengan Swagger/OpenAPI<br>- Add comprehensive docstrings<br>**Game Logic:**<br>- Code comments untuk complex logic<br>- Architecture documentation<br>**Asset & UI:**<br>- Design system documentation<br>- Asset usage guide<br>**EEG/Data Analyst:**<br>- Document ML model (architecture, training)<br>- Create data processing guide |
| | **Selasa, 10 Februari** | **Frontend:**<br>- UI polish (micro-interactions, animations)<br>- Implement smooth page transitions<br>**Backend:**<br>- Add rate limiting<br>- Enhance security headers<br>**Game Logic:**<br>- Audio implementation (engine sound, alerts)<br>- Environmental audio (wind, traffic)<br>**Asset & UI:**<br>- Create sound effects library<br>- Design ambient soundscape<br>**EEG/Data Analyst:**<br>- Fine-tune detection parameters<br>- A/B testing alert thresholds |
| | **Rabu, 11 Februari** | **Frontend:**<br>- Implement reporting dashboard UI<br>- Create data visualization charts<br>**Backend:**<br>- Reporting API endpoints<br>- Implement data aggregation queries<br>**Game Logic:**<br>- Session data collection enhancement<br>- Create event logging system<br>**Asset & UI:**<br>- Design report templates<br>- Create PDF export styling<br>**EEG/Data Analyst:**<br>- Statistical analysis implementation<br>- Create performance metrics calculator |
| | **Kamis, 12 Februari** | **Frontend:**<br>- Cross-browser testing (Chrome, Firefox, Edge)<br>- Mobile responsiveness check<br>**Backend:**<br>- Test dengan multiple EEG devices<br>- Compatibility layer implementation<br>**Game Logic:**<br>- Test on different GPU tiers<br>- Implement fallback rendering mode<br>**Asset & UI:**<br>- Test asset rendering across platforms<br>- Validate accessibility (WCAG)<br>**EEG/Data Analyst:**<br>- Test dengan different webcam models<br>- Validate detection across demographics |
| | **Jumat, 13 Februari** | **🎯 TARGET IDEAL**<br>**Frontend:**<br>- Final integration testing<br>- Performance audit (Lighthouse)<br>**Backend:**<br>- Security audit (OWASP)<br>- Stress testing<br>**Game Logic:**<br>- Complete system E2E testing<br>- Performance benchmarking<br>**Asset & UI:**<br>- Final visual QA<br>- Polish inconsistencies<br>**EEG/Data Analyst:**<br>- Validation complete pipeline<br>- Prepare demo scenarios |

---

### **WEEK 7: Final Testing & Deployment** (16 - 20 Februari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 7** | **Senin, 16 Februari** | **Frontend:**<br>- Internal UAT untuk UI/UX flow<br>- Collect feedback dari tim<br>**Backend:**<br>- UAT untuk API stability<br>- Load testing dengan real scenarios<br>**Game Logic:**<br>- UAT untuk game mechanics<br>- Test driving scenarios end-to-end<br>**Asset & UI:**<br>- Visual consistency check<br>- Gather aesthetic feedback<br>**EEG/Data Analyst:**<br>- UAT untuk detection accuracy<br>- Demo preparation dengan stakeholder |
| | **Selasa, 17 Februari** | **Frontend:**<br>- Fix UAT issues (UI bugs, UX flow)<br>- Final styling adjustments<br>**Backend:**<br>- Fix API issues dari UAT<br>- Optimize slow queries<br>**Game Logic:**<br>- Fix gameplay issues<br>- Final physics tuning<br>**Asset & UI:**<br>- Touch-up assets based on feedback<br>- Final UI polish<br>**EEG/Data Analyst:**<br>- Adjust thresholds based on feedback<br>- Improve detection responsiveness |
| | **Rabu, 18 Februari** | **Frontend:**<br>- Build production bundle<br>- Environment variables setup<br>**Backend:**<br>- Setup production server (AWS/GCP/DigitalOcean)<br>- Configure SSL certificates<br>**Game Logic:**<br>- Production build optimization<br>- Asset CDN setup<br>**Asset & UI:**<br>- Upload assets ke CDN/storage<br>- Verify asset links<br>**EEG/Data Analyst:**<br>- Package ML models untuk production<br>- Setup model serving infrastructure |
| | **Kamis, 19 Februari** | **Frontend:**<br>- Deploy ke Vercel/Netlify/Cloudflare<br>- DNS configuration<br>**Backend:**<br>- Deploy backend services<br>- Database migration pada production<br>**Game Logic:**<br>- Verify game engine production build<br>- CDN cache configuration<br>**Asset & UI:**<br>- Smoke test asset loading<br>- Verify rendering in production<br>**EEG/Data Analyst:**<br>- Deploy ML inference service<br>- Test real-time detection in production |
| | **Jumat, 20 Februari** | **🎯 TARGET MAX**<br>**Frontend:**<br>- Final smoke testing<br>- Monitor production metrics<br>**Backend:**<br>- Production health monitoring<br>- Backup verification<br>**Game Logic:**<br>- Performance validation production<br>- Monitor error rates<br>**Asset & UI:**<br>- Final presentation materials<br>- Create demo video<br>**EEG/Data Analyst:**<br>- Final detection validation<br>- Prepare technical presentation<br><br>**🎉 PROJECT CELEBRATION & HANDOVER** |

---

## 📊 Milestone Checklist

### ✅ Week 1-2: Foundation (Selesai: 16 Januari)
- [ ] Project setup & requirements done
- [ ] Basic frontend structure
- [ ] Basic backend API
- [ ] Basic game engine
- [ ] EEG research completed

### 🎯 Week 3-4: Core Development (Selesai: 30 Januari)
- [ ] EEG signal processing implemented
- [ ] Face recognition implemented
- [ ] Multimodal fusion working
- [ ] Game environment complete
- [ ] Real-time monitoring dashboard

### 🔍 Week 5: Testing (Selesai: 6 Februari)
- [ ] All features tested
- [ ] Critical bugs fixed
- [ ] Performance optimized
- [ ] User experience enhanced

### 📝 Week 6: Documentation (Selesai: 13 Februari - TARGET IDEAL)
- [ ] All documentation complete
- [ ] Code quality verified
- [ ] Reporting system ready
- [ ] Security audit passed

### 🚀 Week 7: Launch (Selesai: 20 Februari - TARGET MAX)
- [ ] UAT completed
- [ ] Production deployed
- [ ] Stakeholder approved
- [ ] Project delivered

---

## 🎯 Deliverables

### Technical Deliverables
1. **Web Application** (React + TypeScript dengan Vite)
2. **Driving Simulator** (Babylon.js 6+ game engine)
3. **Python LSL Middleware** (Standalone EEG processing app)
4. **Backend Server** (FastAPI dengan WebSocket support)
5. **Face Recognition Module** (MediaPipe Face Mesh - browser based)
6. **Multimodal Fusion System** (EEG + Face data fusion)
7. **Real-time Monitoring Dashboard** (D3.js/Recharts visualization)
8. **Database** (PostgreSQL + TimescaleDB untuk time-series EEG data)

### Documentation Deliverables
1. Technical Documentation
2. API Documentation
3. User Manual
4. Installation Guide
5. Research Report (findings tentang multimodal detection)

---

## ⚠️ Risk Management

| Risk | Mitigation Strategy |
|------|---------------------|
| **EEG hardware compatibility** | Focus on Muse 2 via LSL, prepare fallback dengan simulated data |
| **Face recognition accuracy** | Use MediaPipe Face Mesh (Google pretrained), test dengan diverse lighting |
| **Real-time performance** | Target 30+ FPS, optimize Babylon.js rendering, use Web Workers untuk face detection |
| **Python LSL distribution** | Package dengan PyInstaller atau Docker untuk easy installation |
| **Team member unavailability** | Cross-training, documentation, modular architecture |
| **Scope creep** | Strict requirement freeze after Week 1, prioritize MVP features |

---

## 📞 Communication Protocol

- **Daily Standup**: Setiap hari jam 9:00 (15 menit)
- **Weekly Review**: Setiap Jumat jam 16:00 (1 jam)
- **Blocker Discussion**: Ad-hoc via chat/call
- **Code Review**: Setiap PR sebelum merge
- **Documentation**: Update setiap akhir minggu

---

## 🎓 Learning Resources

### Week 1-2
- EEG basics & signal processing (MNE-Python)
- Babylon.js 6+ fundamentals (WebGL, scene, camera, physics)
- React + TypeScript best practices
- FastAPI + WebSocket programming
- Python LSL (pylsl library)

### Week 3-4
- Machine learning untuk multimodal fusion
- MediaPipe Face Mesh (face landmarks, eye tracking)
- Real-time data processing dan streaming
- TimescaleDB untuk time-series data
- Babylon.js advanced (post-processing, optimization)

### Week 5-7
- Testing strategies
- Performance optimization
- Deployment best practices

---

**🎯 Target Ideal Completion: Jumat, 13 Februari 2026 (Week 6)**  
**⏰ Maximum Deadline: Jumat, 20 Februari 2026 (Week 7)**

---

## 📅 Kalender Ringkas

| Week | Tanggal | Hari Kerja | Status |
|------|---------|------------|--------|
| **Week 1** | 7-9 Januari | Rabu - Jumat (3 hari) | ✅ Selesai |
| **Week 2** | 12-16 Januari | Senin - Jumat (5 hari) | 🔄 Dalam Progress |
| **Week 3** | 19-23 Januari | Senin - Jumat (5 hari) | ⏳ Upcoming |
| **Week 4** | 26-30 Januari | Senin - Jumat (5 hari) | ⏳ Upcoming |
| **Week 5** | 2-6 Februari | Senin - Jumat (5 hari) | ⏳ Upcoming |
| **Week 6** | 9-13 Februari | Senin - Jumat (5 hari) | 🎯 **Target Ideal** |
| **Week 7** | 16-20 Februari | Senin - Jumat (5 hari) | ⏰ **Target Max** |

*Timeline ini bersifat fleksibel dan dapat disesuaikan berdasarkan progress dan kendala yang muncul selama pengerjaan.*
