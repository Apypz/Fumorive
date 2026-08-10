**Fumorive** (singkatan dari *Fusion/Future Monitoring Driving(sementara)*) adalah platform pemantauan kelelahan pengemudi berbasis **multimodal fusion** yang mengintegrasikan dua modalitas deteksi secara simultan:

1. **Electroencephalography (EEG)** — menggunakan headband *Muse 2* untuk merekam aktivitas gelombang otak pengemudi secara *real-time*, menganalisis pola frekuensi Delta (1–4 Hz), Theta (4–8 Hz), Alpha (8–13 Hz), Beta (13–30 Hz), dan Gamma (30–45 Hz) guna mendeteksi penurunan kewaspadaan secara neurofisiologis.

2. **Face Recognition berbasis Computer Vision** — menggunakan *MediaPipe Face Mesh* dan *TensorFlow.js* untuk menganalisis 468 titik landmark wajah secara *real-time* di browser, menghitung metrik Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), PERCLOS (*Percentage of Eye Closure*), frekuensi kedipan mata (*blink rate*), dan estimasi pose kepala (*head pose: yaw, pitch, roll*).

Kedua modalitas digabungkan melalui algoritma **Multimodal Fusion** dengan pembobotan 60% EEG + 40% Face untuk menghasilkan skor kelelahan gabungan (*Combined Fatigue Score*) yang lebih akurat dan *robust* dibanding pendekatan unimodal. Skor tersebut kemudian diklasifikasikan menjadi tiga tingkat: *Alert* (waspada), *Drowsy* (mengantuk), dan *Fatigued* (kelelahan berat), dengan sistem peringatan bertingkat (*progressive alert system*) yang secara otomatis memberikan notifikasi kepada pengemudi.

Selain itu, Fumorive mengintegrasikan **simulator mengemudi 3D** berbasis *Babylon.js* sebagai lingkungan pengujian dan pelatihan yang realistis. Simulator menghadirkan kota prosedural dinamis (**"Ngawi City"**) yang jaringan jalan, bangunan, dan rutenya di-generate acak setiap sesi (sehingga selalu berbeda), dilengkapi lalu lintas kendaraan NPC beragam (sedan, SUV, van, bus, truk), pejalan kaki, serta aturan lalu lintas lengkap (lampu lalu lintas, zebra cross, polisi tidur, rambu). Pengemudi dapat mengendalikan kendaraan menggunakan keyboard, mouse, maupun **setir balap fisik (racing wheel)**, dan setiap pelanggaran (menabrak, melawan arah, keluar jalur, menerobos lampu merah, menabrak pejalan kaki) dicatat sebagai skor perilaku berkendara. Umpan balik adaptif diberikan seiring peningkatan tingkat kelelahan sebagai simulasi dampak nyata kelelahan terhadap kemampuan mengemudi.

### (2) Inovasi yang Diterapkan pada Produk

Fumorive menerapkan beberapa inovasi teknologi utama yang membedakannya dari sistem deteksi kelelahan konvensional:

**a. Multimodal Fusion Detection**
Berbeda dengan produk sejenis yang hanya mengandalkan satu sumber data, Fumorive menggabungkan sinyal neurofisiologis (EEG) dan data visual (face recognition) secara simultan. Pendekatan *fusion* ini meningkatkan akurasi deteksi karena kelelahan kognitif yang belum tampak secara fisik dapat terdeteksi melalui perubahan pola gelombang otak, sementara tanda-tanda fisik seperti mata terpejam dan menguap terdeteksi melalui kamera.

**b. Arsitektur Real-time End-to-End**
Seluruh alur data — dari akuisisi sinyal EEG dan deteksi wajah hingga visualisasi di dashboard — berjalan secara *real-time* dengan target latensi end-to-end di bawah 100 ms. Arsitektur ini menggunakan kombinasi WebSocket untuk streaming data dan HTTP REST API untuk penyimpanan, dengan buffering dan kompresi yang dioptimasi.

**c. Kalibrasi Personal (*Personal Baseline Calibration*)**
Sistem melakukan kalibrasi awal selama 10 detik untuk menangkap *baseline* gelombang otak personal setiap pengemudi. Hal ini memungkinkan deteksi yang lebih akurat karena ambang batas kelelahan disesuaikan dengan profil neurofisiologis individu, bukan menggunakan nilai ambang statis yang sama untuk semua pengguna.

**d. Simulator 3D Prosedural dengan Umpan Balik Adaptif**
Simulator mengemudi 3D menggunakan *Babylon.js* dengan model **fisika kendaraan kinematik buatan sendiri (berbasis momentum)** menghadirkan **kota prosedural dinamis** — peta, bangunan, dan rute checkpoint di-generate acak setiap sesi — lengkap dengan lalu lintas NPC cerdas (mengikuti lajur, menyalip, menaati lampu merah), pejalan kaki, dan **sistem pelanggaran berskor**. Selain sebagai lingkungan pengujian, simulator memberikan umpan balik adaptif berdasarkan tingkat kelelahan: kendali dan tampilan berubah dinamis seiring peningkatan skor kelelahan, mensimulasikan dampak nyata kelelahan terhadap kemampuan mengemudi.

**e. Browser-based Face Processing (Privacy-First)**
Seluruh pemrosesan deteksi wajah dilakukan secara lokal di browser pengguna menggunakan *TensorFlow.js* dengan backend *WebGL*, tanpa mengirimkan video atau gambar wajah ke server. Pendekatan ini menjamin privasi pengemudi sekaligus mengurangi beban jaringan dan latensi.

### (3) Rencana Spesifikasi dan Fitur Produk

**Arsitektur Sistem Fumorive** terdiri dari lima lapisan utama:

**Lapisan 1 — Perangkat Keras (*Hardware Layer*)**
| Komponen | Spesifikasi | Fungsi |
|----------|-------------|--------|
| Muse 2 EEG Headband | 4 kanal EEG (TP9, AF7, AF8, TP10), sampling rate 256 Hz, koneksi Bluetooth Low Energy | Akuisisi sinyal gelombang otak secara non-invasif |
| Web Camera (720p+) | Resolusi minimum 720p, 30 FPS | Input visual untuk deteksi wajah |
| Steering Wheel Controller | Sades Ryunix **Kaiju XR1** (racing wheel X-Input, 1080°, force feedback) atau setir X-Input lain | Kontrol kemudi simulator untuk pengalaman imersif — **sudah terintegrasi** via browser Gamepad API |
| Pedal Set | Pedal gas, rem, dan kopling (satu paket dengan setir) | Input akselerasi dan pengereman — **sudah terintegrasi** (dengan kalibrasi) |
| Joystick (opsional) | Gamepad standar USB/Bluetooth | Input kontrol alternatif untuk simulator |
| Mikrokontroler (Arduino/ESP32) | Arduino Mega 2560 / ESP32-WROOM-32 | Penghubung sensor fisik tambahan dan trigger IoT |
| Sensor Getaran (*Vibration Motor*) | Motor vibrator DC, dikontrol via mikrokontroler | Umpan balik haptic pada steering wheel saat kelelahan terdeteksi |
| Modul Buzzer/Speaker | Buzzer piezoelectric atau speaker kecil | Peringatan audio saat kelelahan terdeteksi |
| LED Indicator Strip | WS2812B RGB LED Strip | Indikator visual tingkat kelelahan pada dashboard fisik |

**Lapisan 2 — Pemrosesan Sinyal EEG (*EEG Processing Layer*)**
- **Akuisisi**: Muse 2 → Bluetooth → Lab Streaming Layer (LSL) menggunakan library `muselsl` dan `pylsl`
- **Preprocessing**: Filter *bandpass* Butterworth orde 4 (1–40 Hz), filter *notch* 50 Hz untuk noise listrik, penilaian kualitas sinyal
- **Ekstraksi Fitur**: Analisis Power Spectral Density (PSD) menggunakan metode Welch (`scipy`), perhitungan daya pita frekuensi (Delta, Theta, Alpha, Beta, Gamma), rasio Theta/Alpha (indikator kantuk), rasio Beta/Alpha (indikator keterlibatan kognitif)
- **Analisis Kognitif**: Klasifikasi kondisi kognitif (*fatigue, stress, focused, relaxed, normal*) dengan *confidence scoring* dan pembobotan kualitas sinyal

**Lapisan 3 — Pemrosesan Wajah (*Face Processing Layer*)**
- **MediaPipe Face Mesh**: Deteksi 468 titik landmark wajah secara *real-time* pada resolusi 320×240 piksel @ 30 FPS
- **Metrik**: EAR (*Eye Aspect Ratio*), MAR (*Mouth Aspect Ratio*), PERCLOS, *blink rate*, estimasi pose kepala (*yaw, pitch, roll*), pelacakan arah pandangan (*gaze tracking*)
- **Skor Kelelahan Wajah**: Komposit tertimbang dari seluruh metrik, skala 0 (waspada) hingga 100 (sangat mengantuk)

**Lapisan 4 — Backend & Database**
- **Framework**: FastAPI (Python 3.10+) dengan server ASGI Uvicorn
- **Database**: PostgreSQL dengan ekstensi TimescaleDB untuk penyimpanan data *time-series* (hypertable untuk data EEG, *face events*, peringatan, dan *game events*)
- **Caching**: Redis untuk manajemen sesi dan *token blacklist*
- **Autentikasi**: JWT + OAuth2 (Google) melalui Firebase Admin SDK
- **API**: RESTful endpoints + WebSocket untuk streaming data *real-time*

**Lapisan 5 — Frontend & Simulator**
- **Framework**: React 19 + TypeScript 5 + Vite 7
- **Game Engine**: Babylon.js 8 dengan model **fisika kendaraan kinematik kustom (berbasis momentum)** untuk simulasi mengemudi 3D — lengkap dengan generasi kota prosedural (seeded PRNG), AI lalu lintas NPC, deteksi tabrakan berbasis AABB, dan optimasi performa (penggabungan mesh, pembekuan mesh statis, pemuatan bertahap)
- **Visualisasi**: D3.js untuk grafik gelombang EEG *real-time*, dashboard pemantauan dengan widget *draggable* dan *collapsible*
- **UI**: Mantine UI Component Library dengan dukungan *dark mode*
- **State Management**: Zustand untuk pengelolaan state reaktif
- **Animasi**: Framer Motion untuk transisi UI yang halus

**Rencana Pengembangan Hardware Lanjutan (Integrasi IoT)**

Fumorive dirancang dengan arsitektur modular sehingga dapat diperluas untuk integrasi perangkat keras tambahan. Rencana pengembangan selanjutnya meliputi:

| Komponen | Platform/Tools | Fungsi Integrasi |
|----------|---------------|-----------------|
| **Arduino Mega 2560** | Arduino IDE, C/C++ | Mikrokontroler utama untuk membaca sensor fisik (tekanan, getaran) dan mengontrol aktuator (vibration motor, buzzer, LED) |
| **ESP32-WROOM-32** | ESP-IDF / Arduino Core, Wi-Fi + BLE | Mikrokontroler dengan konektivitas nirkabel untuk komunikasi data sensor ke backend melalui protokol MQTT/HTTP |
| **Racing Wheel (Sades Ryunix Kaiju XR1)** | Browser **Gamepad API (X-Input)** — *sudah diimplementasikan*; Force Feedback via WebHID *direncanakan* | Kontrol kemudi fisik (setir, gas, rem, paddle pemindah gigi) dengan kalibrasi sumbu/pedal; umpan balik getaran adaptif menyusul |
| **Pedal Set (satu paket Kaiju XR1)** | Browser Gamepad API | Input akselerasi dan pengereman untuk simulator — *sudah terintegrasi* |
| **Joystick/Gamepad** | Web Gamepad API, Bluetooth HID | Input kontrol alternatif untuk navigasi simulator |
| **Vibration Motor (ERM/LRA)** | PWM output Arduino/ESP32 | Umpan balik haptic pada steering wheel saat kelelahan terdeteksi |
| **WS2812B Addressable LED Strip** | FastLED / NeoPixel library | Visualisasi fisik tingkat kelelahan melalui gradasi warna (hijau → kuning → merah) |
| **Buzzer Piezoelectric** | Digital output Arduino | Peringatan audio bertingkat sesuai level kelelahan |
| **MQTT Broker (Mosquitto)** | Eclipse Mosquitto | Protokol komunikasi ringan untuk pengiriman data sensor IoT ke backend |

Integrasi komponen IoT ini akan menggunakan arsitektur berikut:
- Sensor fisik (akselerometer) terhubung ke **Arduino Mega 2560** melalui pin analog/digital
- Arduino berkomunikasi dengan **ESP32** melalui serial UART untuk diteruskan ke backend via Wi-Fi (protokol MQTT atau HTTP POST)
- Backend menerima data sensor dan menggabungkannya ke dalam pipeline multimodal fusion yang sudah ada
- Aktuator (vibration motor, buzzer, LED strip) dikontrol oleh **Arduino** berdasarkan instruksi dari backend melalui ESP32

**Fitur Utama Produk:**
1. Monitoring kelelahan multimodal *real-time* (EEG + Face Recognition)
2. Simulator mengemudi 3D dengan **kota prosedural dinamis** (Ngawi City), lalu lintas NPC beragam (sedan/SUV/van/bus/truk), pejalan kaki, aturan lalu lintas (lampu merah, zebra cross, polisi tidur), dan **sistem pelanggaran berskor**
3. Sistem peringatan bertingkat (*progressive alert*) — 4 level: info, warning, danger, critical
4. Dashboard analitik dengan visualisasi gelombang otak dan metrik wajah
5. Kalibrasi personal untuk setiap pengemudi
6. Efek visual adaptif pada simulator sesuai tingkat kelelahan
7. Perekaman dan pemutaran ulang sesi (*session recording & playback*)
8. Ekspor data sesi dalam format CSV dan JSON untuk analisis lanjutan
9. Autentikasi pengguna dengan dukungan Google OAuth
10. Dukungan **setir balap fisik (Kaiju XR1)** & pedal via browser Gamepad API (X-Input) dengan kalibrasi; rencana lanjutan: force feedback (WebHID), sensor IoT & mikrokontroler untuk umpan balik haptic dan monitoring tambahan
11. Preset kualitas grafis (Low / Medium / High) yang dapat dipilih untuk menyeimbangkan visual dan performa

### Detail Simulator Mengemudi (Kondisi Saat Ini)

Simulator mengemudi 3D Fumorive telah berkembang menjadi lingkungan berkendara yang kaya dan realistis:

**Peta & Lingkungan**
- **Solo City** dan **Sriwedari Park** — peta buatan tangan (hand-authored).
- **Ngawi City** — kota **prosedural dinamis**: jaringan jalan, blok bangunan, dan rute checkpoint di-generate acak (*seeded PRNG*) setiap sesi sehingga selalu berbeda, terbagi menjadi **3 level** dengan kepadatan berjenjang.
- Bangunan bervariasi: **rumah** (atap limas), **ruko/toko** (etalase + papan nama), **apartemen**, dan **gedung kantor** ber-jendela; dilengkapi pohon, taman, lampu jalan, pembatas jalan, kursi taman, marka jalan (garis putus-putus & tepi), serta properti jalan lain.
- Fitur **waktu hari (*time-of-day*)** yang memengaruhi pencahayaan dan suasana.

**Lalu Lintas & Aturan Jalan**
- **Kendaraan NPC** ber-AI (mengikuti lajur kiri, menjaga jarak/mengikuti kendaraan di depan, menyalip, menaati lampu merah) dengan tipe beragam berukuran realistis: **sedan, hatchback, SUV, van, bus, dan truk**.
- **Pejalan kaki** yang menyeberang di zebra cross serta berjalan di trotoar/taman.
- **Aturan lalu lintas**: lampu lalu lintas (dengan deteksi menerobos lampu merah), **zebra cross**, **polisi tidur** (dengan efek guncangan), serta deteksi **melawan arah** dan **keluar jalur**.
- **Sistem pelanggaran & skor**: tiap pelanggaran (menabrak objek/kendaraan/pejalan kaki, melawan arah, keluar jalur, menerobos lampu merah) dicatat dengan bobot poin dan peringatan visual — dapat menjadi metrik perilaku berkendara yang dikaitkan dengan tingkat kelelahan.
- **Navigasi checkpoint**: rute multi-checkpoint dengan panah penunjuk arah dan estimasi jarak.

**Kontrol & Kendaraan**
- Tiga mode kemudi: **keyboard**, **mouse**, dan **setir balap fisik** — setir diintegrasikan lewat browser Gamepad API (mode **X-Input**) dengan kalibrasi sumbu/pedal (gas, rem, paddle pemindah gigi).
- Model fisika kendaraan **kinematik berbasis momentum** dengan transmisi otomatis/manual, rasio kemudi realistis (setir hingga ~540° = ~15:1 terhadap sudut roda), speedometer, dan indikator gigi.

**Kualitas Grafis & Performa**
- Tiga preset grafis (**Low / Medium / High**) yang dapat dipilih pengguna untuk menyeimbangkan kualitas visual dan performa, dengan bayangan, *tone mapping* HDR, serta optimasi (penggabungan mesh, pembekuan mesh statis, dan **pemuatan bertahap** agar tidak nge-*lag*).

### Arsitektur Integrasi Sistem (Current Condition)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S COMPUTER                              │
│                                                                   │
│  ┌────────────────┐                                              │
│  │  EEG Device    │ (Muse, OpenBCI, dll.)                        │
│  │  (LSL Stream)  │                                              │
│  └───────┬────────┘                                              │
│          │ LSL Protocol                                          │
│          ▼                                                        │
│  ┌──────────────────────────────────────────┐                   │
│  │  PYTHON LSL MIDDLEWARE APP               │                   │
│  │  - Pemrosesan sinyal & ekstraksi fitur    │                   │
│  │  - WebSocket server                       │                   │
│  └───────────────────┬──────────────────────┘                   │
│                      │ WebSocket                                 │
│                      ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         BROWSER (Chrome/Firefox/Edge)                     │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  REACT APP (Frontend)                               │ │  │
│  │  │  - WebSocket client & State management (Zustand)    │ │  │
│  │  │  - TensorFlow.js face recognition                   │ │  │
│  │  └──────────────────┬──────────────────────────────────┘ │  │
│  │                     │ Kombinasi EEG + Face data          │  │
│  │  ┌─────────────────▼──────────────────────────────────┐  │  │
│  │  │  BABYLON.JS GAME                                    │  │  │
│  │  │  - Driving simulation & Physics engine              │  │  │
│  │  │  - Efek visual berdasarkan skor kelelahan           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └────────────────────┬───────────────────────────────────────┘  │
│                       │ HTTPS/WSS                                │
└───────────────────────┼──────────────────────────────────────────┘
                        ▼
         ┌──────────────────────────────────────┐
         │   BACKEND SERVER                     │
         │   - FastAPI                          │
         │   - PostgreSQL + TimescaleDB         │
         │   - Redis cache & MinIO storage      │
         └──────────────────────────────────────┘
```

**Aliran Data (Data Flow):**
1. **Perangkat EEG** mengirim data via protokol pylsl ke **Aplikasi Python LSL Middleware**.
2. **Middleware Python** memproses sinyal secara langsung dan mengirimkannya ke **Browser** melalui WebSocket.
3. **Kamera (Webcam)** diproses secara lokal di **Frontend** menggunakan TensorFlow.js untuk mendeteksi fitur wajah.
4. **Browser** menggabungkan data EEG dan Wajah melalui algoritma **Multimodal Fusion**.
5. **Hasil Fusion** digunakan oleh **Babylon.js Game** untuk memberikan umpan balik dan efek visual.
6. **Seluruh Data Sesi** dikirimkan ke **Backend** untuk disimpan dalam **Database**.

### (4) Kepemilikan Inovasi Teknologi

Inovasi teknologi Fumorive merupakan hasil pengembangan kolaboratif oleh tim startup Brainova yang terdiri dari:

1. **Front End Web Developer** — Pengembang antarmuka pengguna, integrasi Babylon.js, dan implementasi face recognition di browser
2. **Back End Web Developer** — Pengembang arsitektur server, API, database, dan sistem autentikasi
3. **Game Logic Developer** — Pengembang mekanika simulator mengemudi 3D, fisika kendaraan, dan sistem lingkungan
4. **Asset & UI Developer** — Desainer antarmuka, aset 3D, dan pengalaman pengguna
5. **Data Analyst & EEG Engineer** — Pengembang pipeline pemrosesan sinyal EEG, algoritma deteksi kognitif, dan model machine learning

Seluruh kode sumber, desain arsitektur, dan algoritma deteksi kelelahan multimodal dikembangkan secara independen oleh tim dan belum pernah dikomersialisasikan sebelumnya. Kepemilikan kekayaan intelektual akan didaftarkan atas nama tim Brainova.

**Keunggulan Utama Fumorive:**
1. **Akurasi Lebih Tinggi** — Pendekatan multimodal (EEG + Face) memberikan deteksi yang lebih komprehensif dibandingkan sistem unimodal
2. **Deteksi Dini** — Perubahan pola EEG dapat mendeteksi kelelahan kognitif sebelum muncul tanda-tanda fisik yang terlihat
3. **Berbasis Web** — Dapat diakses melalui browser tanpa instalasi perangkat lunak tambahan, meningkatkan aksesibilitas
4. **Privasi Terjaga** — Pemrosesan wajah dilakukan sepenuhnya di browser, tidak ada data video yang dikirim ke server
5. **Biaya Terjangkau** — Menggunakan perangkat EEG konsumer (Muse 2) yang jauh lebih murah dibanding perangkat EEG medis
6. **Modular dan Extensible** — Arsitektur dirancang untuk mudah diperluas dengan perangkat keras tambahan (steering wheel, pedal, sensor IoT)

**Kelemahan yang Diidentifikasi:**
1. **Ketergantungan pada Muse 2** — Kualitas sinyal EEG dari perangkat konsumer tidak setinggi perangkat EEG medis
2. **Kebutuhan Internet** — Arsitektur web-based memerlukan koneksi jaringan untuk komunikasi antar komponen (meskipun face detection berjalan offline)
3. **Kenyamanan Pemakaian** — Penggunaan headband EEG dalam jangka panjang perlu evaluasi kenyamanan lebih lanjut
4. **Sebagian Fitur Lanjutan Belum Lengkap** — Integrasi IoT (mikrokontroler & aktuator) dan *force feedback* pada setir masih dalam tahap rencana pengembangan (input setir, pedal, dan pemindah gigi sudah berjalan via Gamepad API)

### Keterbaruan Produk Inovasi

Fumorive merupakan inovasi pertama yang mengintegrasikan **tiga sistem** dalam satu platform terpadu:
1. **Monitoring neurofisiologis (EEG)** untuk deteksi kelelahan kognitif
2. **Computer vision (face recognition)** untuk deteksi tanda-tanda fisik kelelahan
3. **Simulator mengemudi 3D** sebagai lingkungan pengujian dan pelatihan dengan umpan balik adaptif

Keterbaruan utama terletak pada pendekatan **multimodal fusion** yang menggabungkan sinyal otak dan data visual wajah dengan pembobotan adaptif, serta rencana integrasi komponen IoT (mikrokontroler Arduino/ESP32, aktuator haptic) untuk memberikan umpan balik fisik yang lebih imersif kepada pengemudi.

### Fungsi, Manfaat, dan Keterkaitan dengan SDGs

**Fungsi Utama:**
- Mendeteksi tingkat kelelahan pengemudi secara *real-time* melalui analisis gelombang otak dan ekspresi wajah
- Memberikan peringatan dini sebelum kelelahan mencapai tingkat berbahaya
- Menyediakan lingkungan simulasi untuk evaluasi dan pelatihan kesadaran kelelahan

**Manfaat:**
- **Bagi Pengemudi**: Mendapatkan peringatan dini yang dapat menyelamatkan nyawa
- **Bagi Perusahaan Transportasi**: Mengurangi risiko kecelakaan, menurunkan biaya asuransi, dan meningkatkan keselamatan armada
- **Bagi Peneliti**: Menyediakan platform pengumpulan data neurofisiologis dan perilaku pengemudi untuk riset keselamatan transportasi
- **Bagi Masyarakat**: Menurunkan angka kecelakaan lalu lintas yang disebabkan oleh faktor kelelahan

**Keterkaitan dengan Sustainable Development Goals (SDGs):**

| SDG | Keterkaitan |
|-----|-------------|
| **SDG 3 — Good Health and Well-being** | Fumorive secara langsung berkontribusi pada keselamatan pengemudi dengan mendeteksi kelelahan dini, mencegah kecelakaan yang dapat menyebabkan cedera atau kematian. Target 3.6: mengurangi separuh jumlah kematian dan cedera akibat kecelakaan lalu lintas. |
| **SDG 9 — Industry, Innovation and Infrastructure** | Fumorive merupakan inovasi teknologi yang mengintegrasikan EEG, computer vision, dan IoT untuk meningkatkan keselamatan infrastruktur transportasi. Mendorong inovasi industri transportasi Indonesia menuju sistem yang lebih cerdas dan aman. |
| **SDG 11 — Sustainable Cities and Communities** | Dengan mengurangi kecelakaan akibat kelelahan pengemudi, Fumorive berkontribusi pada sistem transportasi yang lebih aman dan berkelanjutan di perkotaan maupun antar kota. Target 11.2: menyediakan akses ke sistem transportasi yang aman. |
| **SDG 17 — Partnerships for the Goals** | Pengembangan Fumorive melibatkan kolaborasi multidisiplin (informatika, teknik elektro, neurosains, psikologi) dan berpotensi menjalin kemitraan dengan industri transportasi dan instansi keselamatan jalan. |
