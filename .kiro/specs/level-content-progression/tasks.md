# Implementation Plan: Level Content Progression

## Overview

Refaktor blok `if (this.mapType === 'ngawi-city')` di `DemoScene.init()` sehingga `TrafficLightSystem` selalu aktif, sedangkan `NpcTrafficSystem` + `NpcSoundSystem` hanya aktif di level ≥ 2, dan `PedestrianSystem` hanya aktif di level ≥ 3.

## Tasks

- [ ] 1. Refaktor instansiasi sistem di `DemoScene.init()`
  - [ ] 1.1 Pindahkan instansiasi `TrafficLightSystem` ke sebelum guard block level
    - Di dalam blok `if (this.mapType === 'ngawi-city')`, pastikan `this.trafficLights = new TrafficLightSystem(...)` ditempatkan sebelum blok `if (this.level >= 2)`, agar aktif di semua level
    - Argumen konstruktor tidak berubah: `this.scene`, `this.ngawiPlan.grid`, `this.ngawiPlan.trafficLights`, `this.seed`
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 6.2_

  - [ ] 1.2 Bungkus instansiasi `NpcTrafficSystem` dan `NpcSoundSystem` dalam `if (this.level >= 2)`
    - Pindahkan blok `this.npcTraffic = new NpcTrafficSystem(...)` dan `this.npcSound = new NpcSoundSystem()` (beserta `setGrid` dan `preload`) ke dalam guard `if (this.level >= 2)`
    - Jika level 1, kedua field tetap `null`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 5.1_

  - [ ] 1.3 Bungkus instansiasi `PedestrianSystem` dalam `if (this.level >= 3)`
    - Pindahkan blok `this.pedestrians = new PedestrianSystem(...)` ke dalam guard `if (this.level >= 3)`
    - Jika level 1 atau 2, field tetap `null`
    - _Requirements: 3.1, 3.2, 4.1, 5.2_

- [ ] 2. Verifikasi safety optional chaining di `update()` dan `dispose()`
  - [ ] 2.1 Konfirmasi `update()` sudah menggunakan optional chaining (`?.`) untuk semua sistem yang bisa `null`
    - Periksa `this.npcTraffic?.update(...)`, `this.npcSound?.update(...)`, `this.pedestrians?.update(...)` — tidak ada perubahan kode yang diperlukan jika sudah aman
    - _Requirements: 2.3, 3.4_

  - [ ] 2.2 Konfirmasi `dispose()` sudah menggunakan optional chaining untuk semua sistem
    - Periksa `this.npcTraffic?.dispose()`, `this.npcSound?.dispose()`, `this.pedestrians?.dispose()` — tidak ada perubahan kode yang diperlukan jika sudah aman
    - _Requirements: 5.3_

  - [ ]* 2.3 Tulis unit test untuk `getPedestrianHits()` saat `this.pedestrians === null`
    - Harus mengembalikan `0` tanpa exception
    - _Requirements: 3.3_

- [ ] 3. Checkpoint — Pastikan semua tes lolos
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks `1.1`, `1.2`, `1.3` adalah satu-satunya perubahan kode nyata; semuanya berlokasi di method `DemoScene.init()` dalam satu blok `if (this.mapType === 'ngawi-city')`
- `update()` dan `dispose()` sudah menggunakan optional chaining — task 2.1 dan 2.2 hanya verifikasi inspeksi, bukan perubahan
- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP
- Default fallback (level selain 1–3) memperlakukan sama dengan level 2 sesuai Requirement 4.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] }
  ]
}
```
