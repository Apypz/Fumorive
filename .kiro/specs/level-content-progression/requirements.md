# Requirements Document

## Introduction

Fitur ini mengatur konten simulasi yang aktif per level pada peta `ngawi-city` dalam game simulasi berkendara berbasis Babylon.js / TypeScript. Saat ini ketiga sistem (`TrafficLightSystem`, `NpcTrafficSystem`, `PedestrianSystem`) selalu diinstansiasi di semua level; perbedaan hanya pada jumlah (count). Fitur ini memperkenalkan logika hard-disable berbasis level di `DemoScene.init()` sehingga sistem yang tidak relevan dengan level tertentu tidak pernah diinstansiasi sama sekali, memberikan performa optimal dan kurva kesulitan yang terdefinisi dengan jelas.

Aturan konten per level:
- **Level 1** — Lampu lalu lintas saja (`TrafficLightSystem`)
- **Level 2** — Lampu lalu lintas + mobil NPC (`TrafficLightSystem` + `NpcTrafficSystem`)
- **Level 3** — Lampu lalu lintas + mobil NPC + pejalan kaki (`TrafficLightSystem` + `NpcTrafficSystem` + `PedestrianSystem`)

## Glossary

- **DemoScene**: Kelas scene utama game (`DemoScene.ts`) yang mengorkestrasi inisialisasi semua sub-sistem.
- **TrafficLightSystem**: Sistem lampu lalu lintas yang mengontrol fase hijau/kuning/merah di setiap persimpangan peta Ngawi City.
- **NpcTrafficSystem**: Sistem mobil NPC yang bergerak di jaringan jalan, mematuhi lampu lalu lintas dan polisi tidur.
- **PedestrianSystem**: Sistem pejalan kaki yang berjalan di zebra crossing dan dapat ditabrak oleh pemain.
- **SpeedBumpSystem**: Sistem polisi tidur; selalu aktif di semua level, tidak termasuk dalam scope fitur ini.
- **Level**: Nilai integer (1, 2, atau 3) yang dikirim ke konstruktor `DemoScene` sebagai parameter `level` dan menentukan set konten yang diinstansiasi.
- **Hard-disable**: Kondisi di mana sebuah sistem tidak pernah diinstansiasi (nilai field tetap `null`), sehingga tidak menggunakan CPU, GPU, maupun memori.
- **ngawi-city**: Nilai `mapType` yang mengaktifkan peta prosedural Ngawi City; fitur ini hanya berlaku untuk `mapType === 'ngawi-city'`.
- **Guard block**: Blok `if`-`else` di `DemoScene.init()` yang memeriksa nilai `this.level` sebelum menginstansiasi setiap sistem.

## Requirements

### Requirement 1 — TrafficLightSystem Selalu Aktif di Ngawi City

**User Story:** Sebagai pemain, saya ingin lampu lalu lintas selalu hadir di setiap level Ngawi City, sehingga aturan lalu lintas dasar selalu diterapkan dan sesi simulasi memiliki konsistensi minimal.

#### Acceptance Criteria

1. WHILE `mapType` bernilai `ngawi-city` DAN `level` bernilai 1, 2, ATAU 3, THE `DemoScene` SHALL menginstansiasi `TrafficLightSystem` dan menetapkan referensinya ke `this.trafficLights`.
2. WHEN `DemoScene.init()` selesai dijalankan pada `mapType` `ngawi-city`, THE `DemoScene` SHALL memastikan `this.trafficLights` tidak bernilai `null` untuk level 1, 2, dan 3.
3. THE `TrafficLightSystem` SHALL menerima `this.ngawiPlan.grid`, `this.ngawiPlan.trafficLights`, dan `this.seed` sebagai argumen konstruktor, identik dengan implementasi yang sudah ada.

---

### Requirement 2 — NpcTrafficSystem Hanya Aktif di Level 2 dan 3

**User Story:** Sebagai pemain level 1, saya ingin bermain tanpa gangguan mobil NPC, sehingga saya dapat fokus belajar aturan lampu lalu lintas dasar tanpa tekanan dari lalu lintas.

#### Acceptance Criteria

1. WHILE `mapType` bernilai `ngawi-city` DAN `level` bernilai 2 ATAU 3, THE `DemoScene` SHALL menginstansiasi `NpcTrafficSystem` dan menetapkan referensinya ke `this.npcTraffic`.
2. WHILE `mapType` bernilai `ngawi-city` DAN `level` bernilai 1, THE `DemoScene` SHALL membiarkan `this.npcTraffic` bernilai `null` dan tidak memanggil konstruktor `NpcTrafficSystem`.
3. IF `this.npcTraffic` bernilai `null` pada saat `DemoScene.update()` dipanggil, THEN THE `DemoScene` SHALL melewati semua blok update dan kolisi yang bergantung pada `this.npcTraffic` tanpa melempar exception.
4. WHILE `mapType` bernilai `ngawi-city` DAN `level` bernilai 1, THE `DemoScene` SHALL membiarkan `this.npcSound` bernilai `null` karena `NpcSoundSystem` bergantung pada `NpcTrafficSystem`.

---

### Requirement 3 — PedestrianSystem Hanya Aktif di Level 3

**User Story:** Sebagai pemain level 1 atau 2, saya ingin bermain tanpa pejalan kaki, sehingga tingkat kesulitan meningkat secara bertahap dan saya tidak terkena penalti tabrak pejalan kaki sebelum siap.

#### Acceptance Criteria

1. WHILE `mapType` bernilai `ngawi-city` DAN `level` bernilai 3, THE `DemoScene` SHALL menginstansiasi `PedestrianSystem` dan menetapkan referensinya ke `this.pedestrians`.
2. WHILE `mapType` bernilai `ngawi-city` DAN `level` bernilai 1 ATAU 2, THE `DemoScene` SHALL membiarkan `this.pedestrians` bernilai `null` dan tidak memanggil konstruktor `PedestrianSystem`.
3. IF `this.pedestrians` bernilai `null` pada saat `DemoScene.getPedestrianHits()` dipanggil, THEN THE `DemoScene` SHALL mengembalikan nilai `0`.
4. IF `this.pedestrians` bernilai `null` pada saat `DemoScene.update()` dipanggil, THEN THE `DemoScene` SHALL melewati blok update pejalan kaki tanpa melempar exception.

---

### Requirement 4 — Guard Block di DemoScene.init()

**User Story:** Sebagai developer, saya ingin logika pemilihan sistem per level terpusat dalam satu guard block di `DemoScene.init()`, sehingga perubahan aturan level di masa depan hanya memerlukan modifikasi di satu tempat.

#### Acceptance Criteria

1. THE `DemoScene.init()` SHALL menggunakan guard `if`-`else` yang memeriksa nilai `this.level` sebelum setiap blok instansiasi sistem (`NpcTrafficSystem`, `PedestrianSystem`) di dalam blok `ngawi-city`.
2. THE guard block SHALL ditempatkan setelah `this.ngawiPlan` diinisialisasi dan `this.simpleMap.buildNgawiCity()` dipanggil, karena instansiasi sistem membutuhkan `this.ngawiPlan.grid`.
3. WHEN level bukan 1, 2, atau 3, THE `DemoScene` SHALL menerapkan perilaku yang identik dengan level 2 (default fallback) untuk menjaga kompatibilitas mundur.

---

### Requirement 5 — Tidak Ada Perubahan pada Perilaku Level yang Sudah Aktif

**User Story:** Sebagai pemain level 2 atau 3, saya ingin sistem yang seharusnya aktif di level saya berjalan persis seperti sebelumnya, sehingga fitur ini tidak merusak perilaku yang sudah ada.

#### Acceptance Criteria

1. WHILE `level` bernilai 2, THE `DemoScene` SHALL menginstansiasi `TrafficLightSystem` DAN `NpcTrafficSystem` dengan argumen dan urutan instansiasi yang identik dengan implementasi sebelum fitur ini diterapkan.
2. WHILE `level` bernilai 3, THE `DemoScene` SHALL menginstansiasi `TrafficLightSystem`, `NpcTrafficSystem`, DAN `PedestrianSystem` dengan argumen dan urutan instansiasi yang identik dengan implementasi sebelum fitur ini diterapkan.
3. THE `DemoScene.dispose()` SHALL memanggil `.dispose()` dan menetapkan `null` hanya pada sistem yang sebenarnya diinstansiasi; sistem yang bernilai `null` SHALL diabaikan tanpa error.

---

### Requirement 6 — Kompatibilitas dengan mapType Non-ngawi-city

**User Story:** Sebagai developer, saya ingin guard block level-content hanya berlaku untuk `ngawi-city`, sehingga peta lain (`solo-city`, `sriwedari-park`) tidak terpengaruh oleh perubahan ini.

#### Acceptance Criteria

1. WHILE `mapType` bernilai `solo-city` ATAU `sriwedari-park`, THE `DemoScene` SHALL tidak menginstansiasi `TrafficLightSystem`, `NpcTrafficSystem`, maupun `PedestrianSystem`, identik dengan perilaku yang sudah ada sebelum fitur ini.
2. THE guard block level-content SHALL ditempatkan eksklusif di dalam blok `if (this.mapType === 'ngawi-city')` yang sudah ada di `DemoScene.init()`.
