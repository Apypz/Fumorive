# Implementation Plan: Vehicle Controller Features

## Overview

Implementasi fitur-fitur kendaraan secara bertahap mengikuti urutan dependensi:
fondasi tipe → perluasan InputManager → perluasan VehicleController → integrasi dan pengujian.
Setiap langkah membangun di atas langkah sebelumnya agar tidak ada kode yang menggantung.
Bahasa implementasi: **TypeScript**.

---

## Tasks

- [x] 1. Perluasan Tipe — Fondasi
  - [x] 1.1 Perluas `InputState` di `frontend/src/game/types/game.types.ts`
    - Tambahkan field baru ke interface `InputState` yang sudah ada: `throttleAxis: number`, `brakeAxis: number`, `gearUp: boolean`, `gearDown: boolean`, `handbrakeToggle: boolean`, `engineToggle: boolean`
    - Pastikan semua consumer `InputState` yang sudah ada tetap kompatibel (field baru bersifat aditif)
    - _Requirements: 1.4, 1.5, 2.1, 3.2, 5.2, 6.3, 6.4_

  - [x] 1.2 Tambahkan tipe dan konstanta kendaraan baru di `frontend/src/game/types/game.types.ts`
    - Definisikan `GEAR_SEQUENCE` sebagai array `const` literal: `['R', 'N', '1', '2', '3', '4', '5', '6']`
    - Definisikan `GearPosition` sebagai `typeof GEAR_SEQUENCE[number]`
    - Definisikan `GEAR_SPEED_CAPS: Record<GearPosition, number>` sesuai tabel R4.1 (R=10, N=0, 1=29, dst.)
    - Definisikan interface payload event: `GearChangedPayload`, `HandbrakeChangedPayload`, `EngineStateChangedPayload`
    - Definisikan interface `VehicleState` untuk keperluan debug/serialisasi
    - _Requirements: 1.1, 4.1, 5.6_

  - [x] 1.3 Perluas `VehicleOptions` di `frontend/src/game/engine/VehicleController.ts`
    - Tambahkan field opsional: `gearSpeedCaps?: Partial<Record<GearPosition, number>>`, `gearDownDecelFactor?: number`, `handbrakeMultiplier?: number`
    - Perbarui `DEFAULT_OPTS` dengan nilai default: `gearSpeedCaps = GEAR_SPEED_CAPS`, `gearDownDecelFactor = 5.0`, `handbrakeMultiplier = 1.5`
    - _Requirements: 4.1, 4.3, 2.6_

  - [ ]* 1.4 Tulis unit test untuk tipe dan konstanta baru
    - Verifikasi `GEAR_SEQUENCE` memiliki panjang 8 dan urutan yang benar (R → 6)
    - Verifikasi semua nilai `GEAR_SPEED_CAPS` sesuai spesifikasi R4.1
    - Verifikasi `DEFAULT_OPTS` memiliki nilai fallback yang benar
    - _Requirements: 1.1, 4.1_

- [x] 2. Perluasan `InputManager` — Dukungan Gamepad
  - [x] 2.1 Perluas `KeyBindings` dan tambahkan state gamepad di `frontend/src/game/engine/InputManager.ts`
    - Tambahkan field baru ke interface `KeyBindings`: `gearUp: string[]`, `gearDown: string[]`, `handbrake: string[]`, `engineToggle: string[]`, `brake: string[]`
    - Perbarui `DEFAULT_KEY_BINDINGS` dengan nilai default: `gearUp: ['KeyE']`, `gearDown: ['KeyQ']`, `handbrake: ['Space']`, `engineToggle: ['KeyR']`, `brake: ['KeyS', 'ArrowDown']`
    - Tambahkan field private: `activeGamepadIndex: number | null = null`, `gamepadButtonPrev: boolean[] = []`
    - Inisialisasi field `throttleAxis`, `brakeAxis`, `gearUp`, `gearDown`, `handbrakeToggle`, `engineToggle` ke nilai default di `state`
    - _Requirements: 6.1, 6.3, 6.4, 1.4, 1.5, 3.2, 5.2_

  - [x] 2.2 Implementasi `setupGamepadListeners()` di `InputManager`
    - Daftarkan listener `gamepadconnected` di `window`: simpan `e.gamepad.index` ke `activeGamepadIndex`, inisialisasi `gamepadButtonPrev`
    - Daftarkan listener `gamepaddisconnected` di `window`: reset `activeGamepadIndex` ke `null`, reset semua field gamepad di `state` ke default, log pesan ke konsol
    - Panggil `setupGamepadListeners()` di constructor setelah `setupPointerLock()`
    - _Requirements: 6.1, 6.2_

  - [x] 2.3 Implementasi `normalizeTriggerAxis()` dan `getGamepadAxisValue()` di `InputManager`
    - `normalizeTriggerAxis(raw: number): number` — transformasi `[-1, 1]` → `[0, 1]` dengan rumus `(raw + 1) / 2`, clamp ke `[0, 1]`
    - `getGamepadAxisValue(axisIndex: number): number` — baca axis dari `navigator.getGamepads()[activeGamepadIndex]`, clamp ke `[-1, 1]`, kembalikan `0` jika tidak ada gamepad aktif
    - _Requirements: 6.3, 6.7_

  - [x] 2.4 Implementasi `pollGamepad()` di `InputManager`
    - Panggil `navigator.getGamepads()`, baca `axes[5]` (R2/throttle) dan `axes[2]` (L2/brake)
    - Normalkan axis dengan `normalizeTriggerAxis()`, gabungkan (OR/max) dengan input keyboard `forward`/`backward`
    - Terapkan edge detection rising edge untuk button 0, 1, 3, 4: `btnPressed AND NOT gamepadButtonPrev[i]`
    - Gabungkan (OR) dengan `isKeyJustPressed()` untuk `handbrakeToggle`, `engineToggle`, `gearUp`, `gearDown`
    - Simpan state button saat ini ke `gamepadButtonPrev` untuk frame berikutnya
    - Tambahkan helper privat `isKeyJustPressed(keys: string[]): boolean` yang mendeteksi rising edge keyboard
    - Panggil `pollGamepad()` di method `updateState()` sebelum memperbarui field boolean
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 5.1, 5.2_

  - [ ]* 2.5 Tulis unit test untuk `InputManager` — gamepad polling
    - Test `normalizeTriggerAxis`: input `-1.0` → `0.0`, input `1.0` → `1.0`, input `0.0` → `0.5`, nilai di luar range di-clamp
    - Test `getGamepadAxisValue` mengembalikan `0` saat tidak ada gamepad aktif
    - Test `pollGamepad` edge detection: toggle hanya dipancarkan sekali per tekanan (bukan setiap frame)
    - Test reset saat gamepad disconnect: semua field gamepad kembali ke default
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7_

  - [ ]* 2.6 Tulis property test untuk `InputManager` — kombinasi input
    - **Property 7: Idempoten toggle per input tunggal** — satu rising edge menghasilkan tepat satu toggle
    - **Validates: Requirements 3.1, 5.1**
    - Gunakan `fast-check` dengan arbitrary boolean array untuk mensimulasikan urutan button pressed/released
    - Verifikasi bahwa jumlah toggle sama dengan jumlah rising edge yang terdeteksi

- [x] 3. Checkpoint — Fondasi Stabil
  - Pastikan semua test pada Task 1 dan 2 lulus, tidak ada error kompilasi TypeScript. Tanyakan ke pengguna jika ada pertanyaan sebelum melanjutkan.

- [x] 4. Perluasan `VehicleController` — State dan Event Emitter
  - [x] 4.1 Tambahkan state internal baru dan event emitter di `VehicleController`
    - Tambahkan field private: `currentGearIndex = 1` (default N), `engineRunning = false`, `handbrakeActive = false`
    - Tambahkan field `listeners` dengan tipe map untuk event `gearChanged`, `handbrakeChanged`, `engineStateChanged`
    - Implementasi method publik `on(event, callback): () => void` — daftarkan callback dan kembalikan fungsi unsubscribe
    - Implementasi method private `emit(event, payload): void` — iterasi dan panggil semua listener terdaftar
    - _Requirements: 1.7, 3.3, 3.4, 3.5, 5.6_

  - [x] 4.2 Implementasi `processEngineToggle()` di `VehicleController`
    - Method menerima `engineToggle: boolean` dari state input
    - Jika `engineToggle` true: flip `engineRunning`, pancarkan `engineStateChanged({ running: engineRunning })`
    - Pastikan toggle hanya terjadi pada rising edge (input sudah diproses di `InputManager`)
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 4.3 Implementasi `processHandbrake()` di `VehicleController`
    - Method menerima `handbrakeToggle: boolean` dari state input
    - Jika `handbrakeToggle` true: flip `handbrakeActive`, pancarkan `handbrakeChanged({ active: handbrakeActive })`
    - Verifikasi: Handbrake diinisialisasi `false` saat spawn (R3.5), engine mati tidak mereset handbrake (R3.6)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.4 Implementasi `processGearShift()` di `VehicleController`
    - Method menerima `{ gearUp, gearDown }: Pick<InputState, 'gearUp' | 'gearDown'>`
    - Guard: jika `engineRunning === false`, return tanpa mengubah gigi (R1.6)
    - Naik gigi: jika `gearUp && currentGearIndex < GEAR_SEQUENCE.length - 1`, increment indeks, emit `gearChanged`
    - Turun gigi: jika `gearDown && currentGearIndex > 0`, decrement indeks, emit `gearChanged`
    - Tidak mengubah gigi jika sudah di batas (R1.8)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 4.5 Tulis unit test untuk `processGearShift()`
    - Test tidak bisa naik gigi saat engine mati
    - Test naik gigi dari N → 1 saat engine menyala
    - Test tidak bisa melewati batas atas (gigi 6)
    - Test tidak bisa melewati batas bawah (gigi R)
    - Test event `gearChanged` dipancarkan saat gigi berhasil berubah
    - Test event tidak dipancarkan saat gigi sudah di batas
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 4.6 Tulis property test untuk `processGearShift()` — batas indeks gigi
    - **Property 3: currentGearIndex selalu dalam batas array [0, 7]**
    - **Validates: Requirements 1.1, 1.8**
    - Gunakan `fast-check` dengan array boolean sembarang untuk mensimulasikan urutan gearUp/gearDown
    - Verifikasi `currentGearIndex ∈ [0, GEAR_SEQUENCE.length - 1]` setelah setiap aksi

- [x] 5. Perluasan `VehicleController` — Logika Fisika
  - [x] 5.1 Implementasi `applyFrictionBrake()` di `VehicleController`
    - Method menerima `brakeDepth: number` dan `deltaTime: number`
    - Clamp `brakeDepth` ke `[0.0, 1.0]` (R2.7)
    - Jika `handbrakeActive`: `frictionDecel = brakeAccel × handbrakeMultiplier` (R2.6)
    - Jika tidak: `frictionDecel = brakeAccel × brakeDepth`
    - Jika `frictionDecel > 0 && speed > 0`: kurangi `speed`, jangan biarkan turun di bawah 0 (R2.4, R2.8)
    - Jika `frictionDecel > 0 && speed < 0`: tambah `speed` ke arah 0, jangan biarkan naik di atas 0
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 5.2 Implementasi `enforceSpeedCap()` di `VehicleController`
    - Method menerima `deltaTime: number`
    - Ambil `speedCap` dari `this.opts.gearSpeedCaps[currentGear]`, dengan fallback ke `GEAR_SPEED_CAPS['1']` jika tidak terdefinisi dan log warning (R4.6)
    - Jika `speed > speedCap`: terapkan deselerasi bertahap `(speed - speedCap) × gearDownDecelFactor × deltaTime` (R4.3)
    - Gunakan `Math.max(speedCap, speed - reduction)` agar tidak under-shoot
    - Untuk gigi N: set `targetSpeed = 0` (engine braking alami, R4.5)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.3 Tulis unit test untuk `applyFrictionBrake()`
    - Test BrakeDepth 0.0 tidak mengubah speed
    - Test BrakeDepth 1.0 mengaplikasikan deselerasi penuh `brakeAccel`
    - Test kecepatan tidak pernah negatif setelah pengereman
    - Test handbrake override: frictionDecel = `brakeAccel × 1.5`
    - Test nilai BrakeDepth di luar `[0,1]` di-clamp sebelum digunakan
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8_

  - [ ]* 5.4 Tulis property test untuk `applyFrictionBrake()` — kecepatan tidak negatif
    - **Property 3: ∀ frame saat brakeDepth > 0: speed ≥ 0**
    - **Validates: Requirements 2.4, 2.8**
    - Gunakan `fast-check` dengan `initSpeed` sembarang `[0, 160]`, `brakeDepth` sembarang `[0, 1]`, `deltaTime` `[0.016, 0.05]`

  - [ ]* 5.5 Tulis unit test untuk `enforceSpeedCap()`
    - Test kecepatan di bawah SpeedCap tidak berubah
    - Test kecepatan di atas SpeedCap berkurang bertahap (bukan langsung dipotong)
    - Test fallback ke SpeedCap gigi 1 jika gigi tidak terdefinisi, beserta log warning
    - Test gigi N menghasilkan `targetSpeed = 0` (engine braking)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.6 Tulis property test untuk `enforceSpeedCap()` — SpeedCap tidak pernah dilanggar
    - **Property 2: ∀ frame: speed ≤ GEAR_SPEED_CAPS[currentGear] + 0.1**
    - **Validates: Requirements 4.2**
    - Gunakan `fast-check` dengan `initSpeed` sembarang `[0, 300]`, `gear` sembarang dari `GEAR_SEQUENCE`, `deltaTime` `[0.016, 0.05]`

- [x] 6. Checkpoint — Logika Fisika Stabil
  - Pastikan semua test pada Task 4 dan 5 lulus, verifikasi tidak ada error kompilasi TypeScript. Tanyakan ke pengguna jika ada pertanyaan.

- [x] 7. Refaktor `update()` — Integrasi Semua Logika Baru
  - [x] 7.1 Refaktor method `update()` di `VehicleController`
    - Tambahkan panggilan berurutan: `processEngineToggle()`, `processHandbrake()`, `processGearShift()`, `applyFrictionBrake()`, `enforceSpeedCap()`
    - Ganti logika akselerasi lama: jika `engineRunning === false`, set `targetSpeed = 0`; jika gigi N, set `targetSpeed = 0`; jika gigi R dan `throttleAxis > 0`, set `targetSpeed` mundur (R5.3, R5.4, R4.5)
    - Gunakan `st.throttleAxis` untuk akselerasi maju (bukan `st.forward` boolean langsung)
    - Gunakan `st.brakeAxis` sebagai `brakeDepth` untuk `applyFrictionBrake()`
    - Pertahankan logika kemudi (steering) agar tetap berjalan meski engine mati (R5.7)
    - Panggil `input.pollGamepad()` di awal `update()` sebelum `input.getState()` — atau pastikan `pollGamepad` dipanggil melalui mekanisme frame tick yang tepat
    - _Requirements: 1.6, 2.1, 4.4, 4.5, 5.3, 5.4, 5.5, 5.7_

  - [x] 7.2 Tambahkan method publik `getVehicleState(): VehicleState` di `VehicleController`
    - Kembalikan snapshot state saat ini: `{ currentGear, engineRunning, handbrakeActive, speed, brakeDepth }`
    - Berguna untuk UI subscriber dan debugging
    - _Requirements: 1.7, 3.3, 3.4, 5.6_

  - [ ]* 7.3 Tulis unit test integrasi untuk `update()` loop penuh
    - Test engine mati: tidak ada akselerasi, kemudi tetap bekerja
    - Test engine mati saat bergerak: kendaraan melambat alami ke 0 (R5.3)
    - Test engine menyala: kendaraan merespons `throttleAxis`
    - Test event `engineStateChanged` dipancarkan saat toggle
    - Test event `handbrakeChanged` dipancarkan saat toggle
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 7.4 Tulis property test untuk integrasi `update()` — engine mati menjamin targetSpeed = 0
    - **Property 5: Saat engine mati: targetSpeed = 0 selalu berlaku**
    - **Validates: Requirements 5.4**
    - Jalankan `update()` dengan berbagai kombinasi input saat `engineRunning = false`
    - Verifikasi `targetSpeed` selalu `0` selepas pemanggilan `update()`

- [x] 8. Perluasan `KeyBindings` — Backward Compatibility
  - [x] 8.1 Pastikan perluasan `KeyBindings` tidak memecah konfigurasi lama
    - Ubah `DEFAULT_KEY_BINDINGS` di `InputManager` untuk menyertakan field baru: `gearUp`, `gearDown`, `handbrake`, `engineToggle`, `brake`
    - Pastikan konstruktor `InputManager` tetap menerima `Partial<KeyBindings>` — field baru tidak wajib disuplai pengguna
    - Tambahkan `isKeyJustPressed` tracking: simpan set `justPressedKeys` yang dibersihkan setiap akhir frame (di `resetMouseDelta()` atau method `resetFrame()` baru)
    - _Requirements: 6.5, 6.6_

  - [ ]* 8.2 Tulis unit test untuk backward compatibility `KeyBindings`
    - Test `InputManager` dapat dibuat tanpa menyuplai field `KeyBindings` baru
    - Test nilai default `gearUp`, `gearDown`, `handbrake`, `engineToggle` sesuai spesifikasi
    - Test OR/merge: keyboard dan gamepad sama-sama aktif → aksi terpicu
    - _Requirements: 6.5, 6.6_

- [x] 9. Checkpoint Akhir — Verifikasi Menyeluruh
  - Pastikan semua test (unit, property, integrasi) lulus. Verifikasi tidak ada error atau warning TypeScript. Tanyakan ke pengguna jika ada pertanyaan sebelum menyelesaikan implementasi.

---

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat.
- Setiap task mereferensikan requirement spesifik untuk keterlacakan.
- Checkpoint memastikan validasi bertahap sebelum melanjutkan ke tahap berikutnya.
- Property test menggunakan `fast-check` (perlu ditambahkan sebagai dev dependency jika belum ada).
- Unit test menggunakan Vitest sesuai konfigurasi project yang sudah ada.
- `pollGamepad()` harus dipanggil sekali per frame, sebelum `VehicleController.update()` membaca state input.
- `isKeyJustPressed` membutuhkan set terpisah yang dilacak per frame untuk mendeteksi rising edge keyboard, mirip dengan edge detection gamepad button.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5", "2.6", "4.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 7, "tasks": ["4.5", "4.6", "5.1"] },
    { "id": 8, "tasks": ["5.2", "5.3"] },
    { "id": 9, "tasks": ["5.4", "5.5"] },
    { "id": 10, "tasks": ["5.6", "7.1"] },
    { "id": 11, "tasks": ["7.2", "7.3"] },
    { "id": 12, "tasks": ["7.4", "8.1"] },
    { "id": 13, "tasks": ["8.2"] }
  ]
}
```
