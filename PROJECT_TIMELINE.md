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
| | **Jumat, 9 Januari** | - Setup workspace dan repository project<br>- Pembuatan timeline project keseluruhan<br>- Menentukan milestone dan deliverables<br>- Learning session tentang project (EEG, face recognition, Three.js) |

---

### **WEEK 2: Development Foundation** (12 - 16 Januari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 2** | **Senin, 12 Januari** | **Frontend:**<br>- Setup React + TypeScript + Vite project<br>- Install dependencies (Three.js, Zustand, React Router)<br>**Backend:**<br>- Setup FastAPI/Flask environment<br>- Database schema design (users, sessions, EEG data)<br>**Game Logic:**<br>- Setup project structure untuk game engine<br>- Initialize Three.js scene dan renderer<br>**Asset & UI:**<br>- Research design references untuk driving simulator<br>- Sketch wireframe dashboard dan HUD<br>**EEG Engineer:**<br>- Research EEG headset options (OpenBCI, Muse, NeuroSky)<br>- Studi library untuk EEG processing (MNE-Python, Brainflow) |
| | **Selasa, 13 Januari** | **Frontend:**<br>- Setup routing structure (React Router)<br>- Create basic page components<br>**Backend:**<br>- Implementasi database models (SQLAlchemy/Prisma)<br>- Setup migration scripts<br>**Game Logic:**<br>- Implementasi camera controller class<br>- Setup orbit controls dan perspective camera<br>**Asset & UI:**<br>- Desain mockup landing page<br>- Create color palette dan typography guideline<br>**EEG Engineer:**<br>- Setup Python environment untuk EEG processing<br>- Install dan test EEG libraries |
| | **Rabu, 14 Januari** | **Frontend:**<br>- Setup Zustand store structure<br>- Implement basic state management<br>**Backend:**<br>- Implementasi user authentication (JWT)<br>- Create login/register endpoints<br>**Game Logic:**<br>- Implementasi input manager (keyboard, gamepad)<br>- Setup event listeners untuk kontrol kendaraan<br>**Asset & UI:**<br>- Desain mockup dashboard monitoring<br>- Design HUD components (speedometer, minimap)<br>**EEG Engineer:**<br>- Setup EEG data streaming protocol<br>- Test real-time data acquisition |
| | **Kamis, 15 Januari** | **Frontend:**<br>- Implementasi landing page component<br>- Create reusable UI components (buttons, cards)<br>**Backend:**<br>- Setup RESTful API structure<br>- Implement CORS dan middleware<br>**Game Logic:**<br>- Implementasi basic vehicle physics<br>- Create vehicle controller class<br>**Asset & UI:**<br>- Create design system documentation<br>- Design alert dan notification components<br>**EEG Engineer:**<br>- Research signal preprocessing techniques<br>- Implement basic filtering algorithms |
| | **Jumat, 16 Januari** | **Frontend:**<br>- Integration testing (routing + state)<br>- Fix styling issues<br>**Backend:**<br>- API documentation (Swagger/Postman)<br>- Test authentication flow<br>**Game Logic:**<br>- Testing vehicle controls<br>- Debug physics issues<br>**Asset & UI:**<br>- Review dan revisi mockup berdasarkan feedback<br>- Prepare assets untuk development<br>**EEG Engineer:**<br>- Test end-to-end data pipeline<br>- Documentation setup dan findings |

---

### **WEEK 3: Core Features Development** (19 - 23 Januari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 3** | **Senin, 19 Januari** | **Frontend:**<br>- Setup WebSocket client untuk real-time data<br>- Create EEG data visualization component skeleton<br>**Backend:**<br>- Implementasi WebSocket server<br>- API endpoint untuk EEG data ingestion<br>**Game Logic:**<br>- Create road generator system<br>- Implement procedural terrain generation<br>**Asset & UI:**<br>- Start 3D modeling basic road segments<br>- Design texture untuk aspal dan marka jalan<br>**EEG Engineer:**<br>- Implementasi EEG signal acquisition<br>- Setup data preprocessing pipeline (filtering) |
| | **Selasa, 20 Januari** | **Frontend:**<br>- Implement game canvas component<br>- Setup Three.js integration dengan React<br>**Backend:**<br>- Create session management endpoints<br>- Implement data storage untuk EEG records<br>**Game Logic:**<br>- Implementasi environment lighting<br>- Create skybox dan ambient setup<br>**Asset & UI:**<br>- Continue 3D assets (kendaraan model)<br>- Design vehicle textures dan materials<br>**EEG/Data Analyst:**<br>- Feature extraction (Alpha, Beta, Theta waves)<br>- Implement FFT untuk frequency analysis |
| | **Rabu, 21 Januari** | **Frontend:**<br>- Setup webcam access (MediaDevices API)<br>- Create video stream component<br>**Backend:**<br>- API untuk face recognition data processing<br>- Setup image upload dan processing endpoint<br>**Game Logic:**<br>- Implement vehicle model integration<br>- Setup collision detection basic<br>**Asset & UI:**<br>- Create 3D props (trees, signs, barriers)<br>- Design HUD mockup (speedometer, alerts)<br>**EEG/Data Analyst:**<br>- Implement drowsiness detection algorithm<br>- Create baseline thresholds untuk alertness |
| | **Kamis, 22 Januari** | **Frontend:**<br>- Integrate MediaPipe/OpenCV.js<br>- Implement face mesh detection<br>**Backend:**<br>- Real-time data processing pipeline<br>- Implement data buffering dan caching<br>**Game Logic:**<br>- Create traffic lane system<br>- Implement road curvature logic<br>**Asset & UI:**<br>- Implement HUD components dalam Three.js<br>- Create sprite textures untuk UI elements<br>**EEG/Data Analyst:**<br>- Implement eye closure detection (PERCLOS)<br>- Yawning detection algorithm |
| | **Jumat, 23 Januari** | **Frontend:**<br>- Integration testing (EEG + Face Recognition)<br>- Debug real-time data flow<br>**Backend:**<br>- Test WebSocket performance<br>- Optimize data streaming latency<br>**Game Logic:**<br>- Integration game engine dengan monitoring<br>- Test vehicle behavior dengan real-time alerts<br>**Asset & UI:**<br>- Finalize basic 3D assets<br>- Prepare asset optimization (LOD)<br>**EEG/Data Analyst:**<br>- Test multimodal data fusion<br>- Validate detection accuracy |

---

### **WEEK 4: Advanced Features & Integration** (26 - 30 Januari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 4** | **Senin, 26 Januari** | **Frontend:**<br>- Implement graphics settings panel<br>- Create performance monitoring overlay<br>**Backend:**<br>- Implement alerting system API<br>- Setup notification service<br>**Game Logic:**<br>- Dynamic lighting setup (day/night cycle)<br>- Implement directional light transitions<br>**Asset & UI:**<br>- Create environment assets (clouds, sun, moon)<br>- Design settings UI components<br>**EEG/Data Analyst:**<br>- Multimodal fusion algorithm development<br>- Combine EEG + face data features |
| | **Selasa, 27 Januari** | **Frontend:**<br>- Implement real-time chart untuk EEG signals<br>- Create signal visualization component<br>**Backend:**<br>- Create ML model serving endpoint<br>- Implement prediction API<br>**Game Logic:**<br>- Post-processing pipeline (bloom, SSAO)<br>- Implement render passes<br>**Asset & UI:**<br>- Design modal dan panel components<br>- Create icon set untuk UI<br>**EEG/Data Analyst:**<br>- Train ML model (alert/drowsy/distracted)<br>- Model validation dan hyperparameter tuning |
| | **Rabu, 28 Januari** | **Frontend:**<br>- Real-time monitoring dashboard layout<br>- Implement face detection overlay visualization<br>**Backend:**<br>- Session recording implementation<br>- Create timeline data structure<br>**Game Logic:**<br>- Implement AI traffic vehicles<br>- Basic pathfinding untuk NPC cars<br>**Asset & UI:**<br>- Finalize button styles dan interactions<br>- Create loading animations<br>**EEG/Data Analyst:**<br>- Implement confidence scoring<br>- Create alert threshold configuration |
| | **Kamis, 29 Januari** | **Frontend:**<br>- Implement playback controls<br>- Create session history view<br>**Backend:**<br>- Playback API endpoints<br>- Data export functionality (JSON, CSV)<br>**Game Logic:**<br>- Traffic behavior logic (lane changing, speed)<br>- Obstacle placement system<br>**Asset & UI:**<br>- Create 3D vehicle variants (sedan, truck, bus)<br>- Design traffic sign assets<br>**EEG/Data Analyst:**<br>- Real-time prediction optimization<br>- Reduce inference latency |
| | **Jumat, 30 Januari** | **Frontend:**<br>- Full integration frontend components<br>- E2E testing user flow<br>**Backend:**<br>- Integration all services<br>- Load testing APIs<br>**Game Logic:**<br>- Game engine integration dengan alert system<br>- Test scenario variations<br>**Asset & UI:**<br>- Final asset review dan optimization<br>- Texture compression dan LOD setup<br>**EEG/Data Analyst:**<br>- Validate multimodal detection accuracy<br>- Performance benchmarking |

---

### **WEEK 5: Testing & Refinement** (2 - 6 Februari 2026)

| Mingguan | Harian | Aktivitas |
|----------|--------|-----------|
| **Week 5** | **Senin, 2 Februari** | **Frontend:**<br>- Unit testing React components<br>- Test state management logic<br>**Backend:**<br>- API endpoint testing (Pytest)<br>- Database query testing<br>**Game Logic:**<br>- Test vehicle physics accuracy<br>- Validate collision detection<br>**Asset & UI:**<br>- Visual QA untuk semua assets<br>- Check texture loading dan rendering<br>**EEG/Data Analyst:**<br>- Test EEG data pipeline end-to-end<br>- Validate signal processing accuracy |
| | **Selasa, 3 Februari** | **Frontend:**<br>- Integration testing (Frontend ↔ Backend)<br>- Test WebSocket connection stability<br>**Backend:**<br>- Load testing dengan k6/Artillery<br>- Test concurrent user handling<br>**Game Logic:**<br>- Performance testing (FPS monitoring)<br>- Test dengan different hardware specs<br>**Asset & UI:**<br>- Cross-browser rendering test<br>- Responsive design validation<br>**EEG/Data Analyst:**<br>- Face recognition accuracy testing<br>- Test detection pada berbagai kondisi lighting |
| | **Rabu, 4 Februari** | **Frontend:**<br>- Code splitting dan lazy loading<br>- Optimize bundle size<br>**Backend:**<br>- Database query optimization<br>- Implement caching strategy (Redis)<br>**Game Logic:**<br>- Frustum culling implementation<br>- LOD system optimization<br>**Asset & UI:**<br>- Asset compression (textures, models)<br>- Reduce draw calls<br>**EEG/Data Analyst:**<br>- ML model optimization (quantization)<br>- Reduce prediction latency <100ms |
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
1. **Web Application** (Frontend + Backend)
2. **Driving Simulator** (3D game engine dengan Three.js)
3. **EEG Processing Module** (Python)
4. **Face Recognition Module** (OpenCV/MediaPipe)
5. **Multimodal Fusion System** (AI/ML model)
6. **Real-time Monitoring Dashboard**
7. **Database** (user data, session records, detection logs)

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
| **EEG hardware compatibility** | Research multiple devices, prepare fallback dengan simulated data |
| **Face recognition accuracy** | Use proven libraries (MediaPipe, OpenCV), test dengan diverse lighting |
| **Real-time performance** | Optimize early, use Web Workers, implement degraded mode |
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
- EEG basics & signal processing
- Three.js fundamentals
- React + TypeScript best practices

### Week 3-4
- Machine learning untuk multimodal fusion
- Computer vision (OpenCV, MediaPipe)
- Real-time data processing

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
