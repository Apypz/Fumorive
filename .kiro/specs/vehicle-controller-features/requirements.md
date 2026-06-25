# Requirements Document

## Introduction

Fitur-fitur ini memperluas `VehicleController` dan `InputManager` yang ada di frontend Babylon.js (TypeScript) untuk mensimulasikan perilaku kendaraan yang lebih realistis. Mencakup: perpindahan gigi manual, pengereman bertahap berbasis gesekan, handbrake toggle, batasan kecepatan per gigi (termasuk saat turun gigi), dan kontrol start/stop mesin — semuanya dapat dioperasikan via keyboard dan controller Ryunix Kaiju XR1.

## Glossary

- **VehicleController**: Kelas TypeScript (`VehicleController.ts`) yang mengelola fisika dan pergerakan kendaraan di Babylon.js.
- **InputManager**: Kelas TypeScript (`InputManager.ts`) yang mengelola input keyboard dan pointer. Akan diperluas untuk mendukung gamepad.
- **Gamepad**: Controller fisik Ryunix Kaiju XR1 yang terhubung via Gamepad API browser.
- **Gear**: Tingkat gigi transmisi kendaraan (1–6 dan netral/R).
- **SpeedCap**: Batas kecepatan maksimum yang berlaku pada gigi tertentu (dalam satuan unit/s sesuai engine).
- **Handbrake**: Rem tangan yang bekerja secara toggle (aktif/nonaktif per tekanan tombol).
- **Engine**: Mesin kendaraan yang harus dalam keadaan menyala agar kendaraan dapat bergerak.
- **BrakeDepth**: Nilai 0.0–1.0 yang merepresentasikan seberapa dalam pedal rem ditekan (dari axis gamepad atau tombol keyboard).
- **FrictionDecel**: Deselerasi bertahap yang dihitung sebagai `brakeAccel × BrakeDepth`.
- **GearRatio**: Rasio antara SpeedCap gigi saat ini dengan SpeedCap gigi berikutnya.

---

## Requirements

### Requirement 1: Perpindahan Gigi (Gear Shifting)

**User Story:** Sebagai pengemudi dalam simulasi, saya ingin dapat naik dan turun gigi secara manual menggunakan controller atau keyboard, agar pengalaman berkendara terasa lebih realistis dan saya memiliki kontrol penuh atas performa kendaraan.

#### Acceptance Criteria

1. THE VehicleController SHALL mendukung urutan gigi: R → N → 1 → 2 → 3 → 4 → 5 → 6 (total 8 posisi), di mana naik gigi bergerak ke kanan urutan dan turun gigi bergerak ke kiri.
2. WHEN Button 4 pada Gamepad ditekan dan gigi saat ini bukan 6, THE VehicleController SHALL berpindah ke posisi gigi berikutnya dalam urutan R → N → 1 → 2 → 3 → 4 → 5 → 6.
3. WHEN Button 5 pada Gamepad ditekan dan gigi saat ini bukan R, THE VehicleController SHALL berpindah ke posisi gigi sebelumnya dalam urutan R → N → 1 → 2 → 3 → 4 → 5 → 6.
4. WHEN tombol keyboard `E` (default, dapat dikonfigurasi) ditekan dan gigi saat ini bukan 6, THE VehicleController SHALL menaikkan gigi sebesar satu tingkat sesuai urutan di Acceptance Criteria 1.
5. WHEN tombol keyboard `Q` (default, dapat dikonfigurasi) ditekan dan gigi saat ini bukan R, THE VehicleController SHALL menurunkan gigi sebesar satu tingkat sesuai urutan di Acceptance Criteria 1.
6. WHILE Engine dalam keadaan mati (off), THE VehicleController SHALL mengabaikan semua input perpindahan gigi dari Gamepad maupun keyboard.
7. WHEN gigi berhasil berubah, THE VehicleController SHALL memperbarui tampilan gigi di UI dalam waktu kurang dari 100ms, mencerminkan posisi gigi baru (misal: "1", "2", "R", "N").
8. IF perpindahan gigi diminta saat posisi sudah di batas tertinggi (gigi 6) untuk naik, atau batas terendah (gigi R) untuk turun, THEN THE VehicleController SHALL tidak mengubah posisi gigi dan UI SHALL tidak memperbarui tampilan gigi.

---

### Requirement 2: Pengereman Bertahap dengan Gesekan (Friction Braking)

**User Story:** Sebagai pengemudi dalam simulasi, saya ingin kendaraan berhenti secara bertahap saat saya menginjak rem — bukan berhenti seketika — agar simulasi pengereman terasa realistis dan saya dapat mengontrol seberapa keras saya mengerem.

#### Acceptance Criteria

1. WHEN pedal rem pada Gamepad ditekan dengan BrakeDepth > 0.0, THE VehicleController SHALL mengurangi kecepatan kendaraan sebesar `brakeAccel × BrakeDepth` m/s² per detik, di mana `brakeAccel` adalah nilai positif yang dikonfigurasi.
2. WHEN BrakeDepth = 1.0 (pedal rem ditekan penuh), THE VehicleController SHALL mengaplikasikan deselerasi maksimum sebesar nilai `brakeAccel` m/s².
3. WHEN BrakeDepth = 0.0 (pedal rem tidak ditekan), THE VehicleController SHALL tidak mengaplikasikan deselerasi rem sama sekali.
4. WHEN kecepatan kendaraan mencapai 0 akibat pengereman, THE VehicleController SHALL mengunci kecepatan di 0 dan tidak membalikkan arah gerak (kecepatan tidak boleh menjadi negatif akibat rem).
5. WHILE tombol keyboard yang dikonfigurasi untuk rem sedang ditahan (hold), THE VehicleController SHALL mengaplikasikan FrictionDecel sebesar `brakeAccel` penuh (setara BrakeDepth = 1.0); WHEN tombol rem keyboard dilepas, THE VehicleController SHALL menghentikan aplikasi FrictionDecel dari keyboard tersebut.
6. WHILE Handbrake aktif, THE VehicleController SHALL mengaplikasikan FrictionDecel sebesar `brakeAccel × 1.5` m/s² sebagai pengganti (override) nilai BrakeDepth yang sedang aktif, sehingga efek Handbrake selalu lebih kuat dari rem biasa.
7. IF BrakeDepth berada di luar rentang [0.0, 1.0], THEN THE VehicleController SHALL menjepit (clamp) nilainya ke rentang [0.0, 1.0] sebelum menghitung FrictionDecel.
8. WHEN BrakeDepth > 0.0 dan kecepatan kendaraan sudah 0, THE VehicleController SHALL tidak mengaplikasikan akselerasi mundur akibat rem — kendaraan tetap diam.

---

### Requirement 3: Handbrake Toggle

**User Story:** Sebagai pengemudi dalam simulasi, saya ingin rem tangan bekerja sebagai toggle (tekan sekali aktif, tekan lagi nonaktif) sehingga saya bisa mengaktifkannya tanpa harus menahan tombol terus-menerus, terutama dalam situasi parkir atau manuver.

#### Acceptance Criteria

1. WHEN Button 1 pada Gamepad ditekan (pada peristiwa button-press, bukan button-release), THE VehicleController SHALL segera mengubah status Handbrake: jika sebelumnya nonaktif menjadi aktif, jika sebelumnya aktif menjadi nonaktif.
2. WHEN tombol keyboard yang dikonfigurasi untuk Handbrake ditekan (pada peristiwa keydown), THE VehicleController SHALL melakukan toggle Handbrake dengan perilaku yang sama seperti Acceptance Criteria 1.
3. WHEN status Handbrake berubah menjadi aktif, THE VehicleController SHALL segera (dalam frame yang sama) memancarkan event `handbrakeChanged` dengan nilai `true`.
4. WHEN status Handbrake berubah menjadi nonaktif, THE VehicleController SHALL segera (dalam frame yang sama) memancarkan event `handbrakeChanged` dengan nilai `false`.
5. THE VehicleController SHALL menginisialisasi status Handbrake sebagai nonaktif saat kendaraan pertama kali dibuat, dan mempertahankan status tersebut di antara frame-frame game hingga di-toggle kembali secara eksplisit.
6. WHEN Engine dalam keadaan mati (off) dan Handbrake aktif, THE VehicleController SHALL tetap mempertahankan Handbrake dalam kondisi aktif dan tidak mereset statusnya.

---

### Requirement 4: Batasan Kecepatan per Gigi (Speed Cap per Gear)

**User Story:** Sebagai pengemudi dalam simulasi, saya ingin setiap gigi memiliki batas kecepatan maksimum, dan batas ini juga berlaku ketika saya turun gigi — sehingga kendaraan tidak bisa berjalan di kecepatan gigi tinggi setelah kembali ke gigi rendah.

#### Acceptance Criteria

1. THE VehicleController SHALL menerapkan SpeedCap (unit/s) yang berbeda untuk setiap gigi: Gigi R = 10, N = 0, Gigi 1 = 29, Gigi 2 = 50, Gigi 3 = 75, Gigi 4 = 100, Gigi 5 = 130, Gigi 6 = 160.
2. WHILE kendaraan berada di gigi tertentu, THE VehicleController SHALL membatasi targetSpeed agar tidak melebihi SpeedCap gigi tersebut, sehingga kecepatan aktual tidak pernah melebihi SpeedCap + toleransi 0.1 unit/s.
3. WHEN gigi diturunkan dan kecepatan kendaraan saat ini melebihi SpeedCap gigi baru, THE VehicleController SHALL mengurangi kecepatan sebesar `(currentSpeed - gearSpeedCap) × 5.0 × deltaTime` per frame secara bertahap hingga kecepatan berada di atau di bawah SpeedCap gigi baru.
4. WHEN gigi dinaikkan, THE VehicleController SHALL langsung menggunakan SpeedCap gigi baru sebagai batas atas — kecepatan yang sudah ada tidak dikurangi secara paksa, akselerasi alami yang akan mencapai batas baru.
5. WHILE dalam posisi netral (N), THE VehicleController SHALL menerapkan deselerasi alami (engine braking) tanpa akselerasi baru; kecepatan maksimum efektif dalam N adalah 0 (engine braking bertahap hingga berhenti).
6. IF SpeedCap untuk gigi yang diminta tidak terdefinisi dalam tabel konfigurasi, THEN THE VehicleController SHALL menggunakan SpeedCap Gigi 1 (29 unit/s) sebagai nilai fallback dan SHALL mencatat pesan peringatan ke konsol browser.

---

### Requirement 5: Start/Stop Engine

**User Story:** Sebagai pengemudi dalam simulasi, saya ingin dapat menyalakan dan mematikan mesin menggunakan controller atau keyboard, agar simulasi mencerminkan skenario nyata seperti menyalakan mesin sebelum berkendara dan mematikannya saat parkir.

#### Acceptance Criteria

1. WHEN Button 2 pada Gamepad ditekan (pada peristiwa button-press), THE VehicleController SHALL mengubah status Engine: jika sebelumnya mati menjadi menyala, jika sebelumnya menyala menjadi mati (toggle sekali per tekanan).
2. WHEN tombol keyboard yang dikonfigurasi untuk start/stop engine ditekan (pada peristiwa keydown), THE VehicleController SHALL melakukan toggle Engine dengan perilaku yang sama seperti Acceptance Criteria 1.
3. WHEN Engine dimatikan saat kendaraan sedang bergerak, THE VehicleController SHALL segera menghentikan akselerasi aktif dan membiarkan kendaraan melambat secara alami akibat FrictionDecel (engine braking) hingga berhenti sendiri.
4. WHILE Engine dalam keadaan mati, THE VehicleController SHALL mengabaikan semua input akselerasi maju (forward) maupun mundur (backward) dari keyboard dan Gamepad.
5. WHEN Engine dinyalakan, THE VehicleController SHALL dalam frame berikutnya sudah memperbolehkan pemrosesan input akselerasi penuh.
6. THE VehicleController SHALL memancarkan event `engineStateChanged` dengan payload `{ running: boolean }` setiap kali status Engine berubah, segera setelah perubahan status dilakukan.
7. WHILE Engine dalam keadaan mati dan kecepatan kendaraan > 0 (masih bergerak karena inersia), THE VehicleController SHALL tetap memproses input kemudi (steering kiri/kanan) secara normal.

---

### Requirement 6: Integrasi Gamepad (Ryunix Kaiju XR1)

**User Story:** Sebagai pengemudi dalam simulasi, saya ingin controller Ryunix Kaiju XR1 dikenali dan semua input yang dipetakan (button 1–5, axis gas/rem) berfungsi dengan benar, agar saya dapat bermain menggunakan controller tanpa perlu konfigurasi tambahan.

#### Acceptance Criteria

1. THE InputManager SHALL mendaftarkan listener untuk event `gamepadconnected` pada saat inisialisasi, dan mulai membaca (polling) status Gamepad yang terdeteksi setiap frame update selama Gamepad terhubung.
2. WHEN Gamepad terputus (event `gamepaddisconnected`), THE InputManager SHALL segera berhenti membaca input dari Gamepad tersebut dan memastikan semua nilai input Gamepad direset ke kondisi default (tidak ada tombol ditekan, semua axis = 0).
3. THE InputManager SHALL membaca nilai axis gas (throttle) dan rem (brake) dari Gamepad sebagai nilai float dalam rentang [0.0, 1.0], di mana 0.0 berarti tidak ditekan dan 1.0 berarti ditekan penuh.
4. THE InputManager SHALL membaca status Button 1 (index 0), Button 2 (index 1), Button 4 (index 3), dan Button 5 (index 4) dari Gamepad setiap frame, mengembalikan `true` jika tombol ditekan dan `false` jika tidak.
5. WHEN input aksi yang sama tersedia dari keyboard maupun Gamepad secara bersamaan, THE InputManager SHALL menggabungkan (OR) keduanya sehingga input dari salah satu sumber yang aktif sudah cukup untuk mengaktifkan aksi tersebut.
6. IF tidak ada Gamepad yang terdeteksi saat inisialisasi maupun saat runtime, THEN THE InputManager SHALL tetap berfungsi normal menggunakan input keyboard saja tanpa error.
7. THE InputManager SHALL mengekspos metode publik `getGamepadAxisValue(axisIndex: number): number` yang mengembalikan nilai mentah axis dari Gamepad API yang sudah di-clamp ke rentang [-1.0, 1.0]; jika tidak ada Gamepad aktif, metode ini SHALL mengembalikan 0.
