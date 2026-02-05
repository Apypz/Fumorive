# Camera Fatigue Detection - Game Session Integration

## Overview

Sistem kamera dan deteksi kelelahan (fatigue detection) telah terintegrasi ke dalam game session. Fitur ini memungkinkan pemain untuk:

1. ✅ Menampilkan camera feed secara real-time di pojok kanan bawah
2. ✅ Menganalisis tingkat kelelahan berdasarkan face recognition
3. ✅ Menyalakan/mematikan kamera sesuai kebutuhan
4. ✅ Menerima peringatan otomatis jika terdeteksi gejala kelelahan

## Fitur Utama

### 1. **Camera Feed Kecil (Pojok Kanan Bawah)**
- Tampilan camera berukuran 320x240 pixel
- Responsif dan tidak menggangu gameplay utama
- Overlay wajah dengan detail mata dan mulut
- Dapat dinonaktifkan dengan mudah

### 2. **Real-Time Fatigue Analysis**
Sistem menganalisis beberapa metrik:

- **Eye Aspect Ratio (EAR)**: Tingkat keterbukaan mata
- **Mouth Aspect Ratio (MAR)**: Deteksi menguap
- **PERCLOS**: Persentase waktu mata tertutup (Percentage Eye Closure)
- **Blink Rate**: Kecepatan kedipan mata (blinks per minute)
- **Fatigue Score**: Skor kelelahan gabungan (0-100)

### 3. **Fatigue Level Indicator**
Indikator visual menunjukkan level kelelahan:

```
Score  | Level           | Kondisi
-------|-----------------|------------------
0-25   | 😊 Terjaga      | Normal, waspada
26-50  | 😐 Mulai Lelah  | Perlu perhatian
51-74  | 😴 Lelah        | Risiko tinggi
75-100 | 🚨 Sangat Lelah | Istirahat sekarang!
```

Warna indikator:
- 🟢 Hijau: Terjaga (0-25)
- 🟡 Kuning: Mulai lelah (26-50)
- 🟠 Orange: Lelah (51-74)
- 🔴 Merah: Sangat lelah (75-100)

### 4. **Smart Alert System**
- Alert otomatis saat mendeteksi gejala kelelahan
- Cooldown 10 detik antar alert (tidak mengganggu)
- Pesan dalam bahasa Indonesia
- Auto-hide setelah 3 detik

Alert Triggers:
- Fatigue Score ≥ 75: "SANGAT MENGANTUK! Istirahat sekarang!"
- Fatigue Score ≥ 50: "Anda terlihat lelah!"
- PERCLOS > 30%: "Mata sering tertutup!"

### 5. **Quick Stats Display**
Statistik ringkas yang ditampilkan:
- **Blink Rate**: Kecepatan kedipan (blinks/min)
- **PERCLOS**: Persentase penutupan mata

## Cara Menggunakan

### Saat Game Dimulai

1. **Loading Map**: Button kamera muncul di pojok kanan bawah (disabled state)
2. **Game Playing**: 
   - Klik button kamera biru untuk **NYALAKAN** kamera
   - Camera feed akan muncul dengan overlay detail wajah
   - Data otomatis dikirim ke backend setiap 1 detik

3. **Untuk Matikan Kamera**:
   - Klik tombol X merah kecil di sudut atas kanan camera monitor
   - Atau klik button kamera disabled di pojok

### Keyboard Shortcuts

Dalam game:
- **ESC**: Pause/Resume (camera tetap aktif)
- **F12**: Toggle Inspector
- **F3**: Toggle Debug Info

## Integrasi Backend

### Session Management
Setiap kali camera dimulai/dihentikan:
- Otomatis membuat session baru di backend
- Session ID disimpan untuk tracking
- Data face events dikirim ke endpoint: `POST /api/v1/face/events`
- Session ditutup saat camera dimatikan

### Data yang Dikirim
```json
{
    "session_id": "xxx-xxx-xxx",
    "timestamp": "2026-02-04T10:30:00Z",
    "eye_aspect_ratio": 0.35,
    "mouth_aspect_ratio": 0.25,
    "eyes_closed": false,
    "yawning": false,
    "blink_count": 45,
    "blink_rate": 18.5,
    "head_yaw": 5.2,
    "head_pitch": -2.1,
    "head_roll": 1.5,
    "face_fatigue_score": 42.5
}
```

## Technical Details

### Dependencies
- `@mediapipe/face_mesh`: Face landmark detection
- `@mediapipe/camera_utils`: Camera stream handling
- Face utilities dari `src/utils/faceUtils.ts`
- Session API dari `src/api/session.ts`
- Face API dari `src/api/face.ts`

### Component Structure

```
Session.tsx (Parent)
├── GameCanvas
├── MapSelection
├── GraphicsSettings
├── ControlsHUD, SpeedometerHUD, etc.
└── CameraFatigueMonitor (New)
    ├── Camera Feed (320x240)
    ├── Face Mesh Overlay
    ├── Fatigue Indicator
    ├── Quick Stats
    └── Alert System
```

### State Management
- `cameraEnabled`: Boolean untuk kontrol camera on/off
- Real-time metrics (EAR, MAR, PERCLOS, etc.)
- Alert tracking dengan cooldown

## Styling & UI

### Responsif
- Desktop: 320px width
- Tablet: 280px width
- Mobile: 240px width

### Dark Theme
- Menggunakan Slate/Blue color scheme
- Glassmorphism effect (backdrop blur)
- Sesuai dengan styling game yang ada

### Visual Hierarchy
1. Camera feed (utama)
2. Fatigue indicator (prominent)
3. Quick stats (secondary)
4. Alerts (overlay)

## File Structure

```
frontend/src/components/
├── CameraFatigueMonitor.tsx (NEW)
├── CameraFatigueMonitor.css (NEW)
├── page/
│   └── Session.tsx (UPDATED)
├── GameCanvas.tsx
├── ControlsHUD.tsx
└── ...
```

## Troubleshooting

### Camera tidak menyala
1. Cek browser permissions untuk camera
2. Cek console untuk error messages
3. Pastikan tidak ada tab lain yang menggunakan camera

### Face detection tidak bekerja
1. Pastikan wajah visible di depan camera
2. Cek lighting (cahaya cukup)
3. Jarak camera 30-60cm optimal

### Latency/Lag tinggi
1. Reduce canvas resolution (sudah 320x240)
2. Check browser performance
3. Close background apps

### Alert terlalu sering
- Cooldown sudah diatur 10 detik (dapat diubah di line 51)

## Future Improvements

Potential enhancements:
- [ ] Configuration panel untuk adjust sensitivity
- [ ] Historical data visualization
- [ ] Sound alerts dengan volume control
- [ ] Integration dengan game performance metrics
- [ ] Recording/replay dengan face overlay
- [ ] Multi-face detection
- [ ] Posture analysis
- [ ] Emotion detection

## Testing

Untuk test feature:
1. Mulai game dan pilih map
2. Klik camera button saat game loading
3. Izinkan akses camera browser
4. Coba berbagai expressions (blink, yawn, close eyes)
5. Verifikasi metrics berubah sesuai expression
6. Cek console untuk session creation/termination logs

---

**Created**: February 4, 2026
**Component**: CameraFatigueMonitor v1.0
**Status**: Ready for deployment
