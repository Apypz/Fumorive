# Design Document — Level Content Progression

## Overview

Fitur ini memperkenalkan guard block berbasis `this.level` di `DemoScene.init()` untuk mengontrol sistem mana yang diinstansiasi pada peta `ngawi-city`. Perubahan terpusat di satu tempat, tidak menyentuh path kode untuk mapType lain, dan memanfaatkan optional chaining (`?.`) yang sudah ada di `update()` dan `dispose()` sehingga tidak ada perubahan di luar `init()`.

**Aturan konten per level:**

| Level | TrafficLightSystem | NpcTrafficSystem | PedestrianSystem |
|-------|--------------------|------------------|------------------|
| 1     | ✅ Aktif           | ❌ null          | ❌ null          |
| 2     | ✅ Aktif           | ✅ Aktif         | ❌ null          |
| 3     | ✅ Aktif           | ✅ Aktif         | ✅ Aktif         |

---

## Architecture

Tidak ada komponen baru yang ditambahkan. Perubahan berupa reorganisasi internal di `DemoScene.init()`:

```
DemoScene.init()
  └─ if (mapType === 'ngawi-city')
       ├─ generateNgawiCity()          [tidak berubah]
       ├─ buildNgawiCity()             [tidak berubah]
       ├─ loadGridNetwork()            [tidak berubah]
       ├─ TrafficLightSystem           [tidak berubah — selalu diinstansiasi]
       ├─ SpeedBumpSystem              [tidak berubah — selalu diinstansiasi]
       │
       ├─ GUARD BLOCK (baru):
       │   if (level >= 2)             → new NpcTrafficSystem(...)
       │                               → new NpcSoundSystem(...)
       │   if (level >= 3)             → new PedestrianSystem(...)
       │
       └─ AmbientSoundSystem           [tidak berubah]
```

`update()` dan `dispose()` **tidak perlu diubah** karena sudah menggunakan `?.` (optional chaining):
- `this.npcTraffic?.update(...)` — no-op jika null
- `this.pedestrians?.update(...)` — no-op jika null
- `this.npcTraffic?.dispose()` — no-op jika null
- `this.pedestrians?.dispose()` — no-op jika null

---

## Components and Interfaces

### DemoScene (dimodifikasi)

**File:** `frontend/src/game/scenes/DemoScene.ts`

Satu-satunya komponen yang dimodifikasi. Perubahan hanya di dalam blok `if (this.mapType === 'ngawi-city')` di method `init()`.

#### Sebelum (kode saat ini)

```typescript
// Spawn NPC cars berdasarkan level (count & aggressiveness dari params).
const npcConfig: NpcTrafficConfig = {
  cruiseMin: params.npcCruiseMin,
  cruiseMax: params.npcCruiseMax,
  aggressiveness: params.npcAggressiveness,
}
this.npcTraffic = new NpcTrafficSystem(
  this.scene,
  this.ngawiPlan.grid,
  params.npcCount,
  this.seed,
  this.ngawiPlan.spawn.nodeId,
  npcConfig
)
// Traffic lights at selected intersections.
this.trafficLights = new TrafficLightSystem(
  this.scene,
  this.ngawiPlan.grid,
  this.ngawiPlan.trafficLights,
  this.seed
)
// NPC ambient sound system (engine noise + horn).
this.npcSound = new NpcSoundSystem()
this.npcSound.setGrid(this.ngawiPlan.grid)
this.npcSound.preload().catch(...)

// Pejalan kaki di zebra cross (jumlah per crossing dari level params).
this.pedestrians = new PedestrianSystem(
  this.scene,
  this.ngawiPlan.grid,
  this.seed,
  params.pedestriansPerCross
)
```

#### Sesudah (setelah fitur ini)

```typescript
// Traffic lights — selalu aktif di semua level ngawi-city.
this.trafficLights = new TrafficLightSystem(
  this.scene,
  this.ngawiPlan.grid,
  this.ngawiPlan.trafficLights,
  this.seed
)

// Guard block: NpcTrafficSystem hanya untuk level 2 dan 3.
if (this.level >= 2) {
  const npcConfig: NpcTrafficConfig = {
    cruiseMin: params.npcCruiseMin,
    cruiseMax: params.npcCruiseMax,
    aggressiveness: params.npcAggressiveness,
  }
  this.npcTraffic = new NpcTrafficSystem(
    this.scene,
    this.ngawiPlan.grid,
    params.npcCount,
    this.seed,
    this.ngawiPlan.spawn.nodeId,
    npcConfig
  )
  // NpcSoundSystem bergantung pada NpcTrafficSystem — hanya diinstansiasi bersama.
  this.npcSound = new NpcSoundSystem()
  this.npcSound.setGrid(this.ngawiPlan.grid)
  this.npcSound.preload().catch((e) => console.warn('[DemoScene] NpcSoundSystem preload error:', e))
}

// Guard block: PedestrianSystem hanya untuk level 3.
if (this.level >= 3) {
  this.pedestrians = new PedestrianSystem(
    this.scene,
    this.ngawiPlan.grid,
    this.seed,
    params.pedestriansPerCross
  )
}
```

**Catatan implementasi:**
- `TrafficLightSystem` dipindahkan ke atas guard block (tetap sebelum `NpcTrafficSystem`) karena NPC butuh referensi traffic light saat `update()`, bukan saat konstruksi — urutan sudah benar.
- Kondisi `this.level >= 2` menangani default fallback (level < 1 atau > 3) secara otomatis; level 0 atau negatif akan menjadi level 1 (hanya traffic light). Namun berdasarkan requirement 4.3, nilai di luar {1,2,3} harus berperilaku seperti level 2 — ini ditangani oleh `getNgawiLevelParams()` yang sudah memiliki `default: return { ...DEFAULT_NGAWI_PARAMS }` (ekuivalen level 2).
- `this.level >= 2` menangani fallback dengan benar: nilai tak dikenal ≥ 2 mendapat NpcTrafficSystem; nilai < 1 tidak mendapatkannya.

### NgawiCityGenerator (tidak dimodifikasi)

**File:** `frontend/src/game/components/NgawiCityGenerator.ts`

`getNgawiLevelParams()` tetap memberikan `npcCount: 8` untuk level 1 dan `pedestriansPerCross: 1`, tetapi nilai ini tidak akan pernah digunakan karena sistemnya tidak diinstansiasi. Tidak ada kebutuhan untuk mengubah nilai tersebut menjadi `0` — hard-disable via non-instansiasi lebih bersih.

### NpcTrafficSystem, TrafficLightSystem, PedestrianSystem (tidak dimodifikasi)

Ketiga sistem tidak perlu mengetahui tentang level. Tanggung jawab level-gating sepenuhnya berada di `DemoScene.init()`.

---

## Data Models

Tidak ada perubahan pada data model. State yang relevan sudah ada di `DemoScene`:

```typescript
private npcTraffic: NpcTrafficSystem | null = null   // null = belum diinstansiasi
private trafficLights: TrafficLightSystem | null = null
private npcSound: NpcSoundSystem | null = null
private pedestrians: PedestrianSystem | null = null
```

Semua field sudah diinisialisasi ke `null` di deklarasi kelas — kondisi "hard-disable" adalah kondisi default yang tidak pernah dioverride untuk level yang tidak memerlukan sistem tersebut.

---

## Interfaces

Tidak ada perubahan pada interfaces publik `DemoScene`. Semua method publik sudah menangani null dengan benar:

- `getPedestrianHits()` → `return this.pedestrians?.consumePedestrianHits() ?? 0`
- `checkPlayerRedLight()` → `if (!this.trafficLights ...) return false`
- `getApproachingLightState()` → `if (!this.trafficLights ...) return null`

---

## Error Handling

### Null Safety (sudah ada)

`update()` menggunakan optional chaining untuk semua sistem:

```typescript
this.trafficLights?.update(deltaTime)
// npcTraffic update block sudah dibungkus: if (this.npcTraffic && this.simpleMap)
this.pedestrians?.update(...)
```

`dispose()` menggunakan optional chaining:

```typescript
this.npcTraffic?.dispose()
this.trafficLights?.dispose()
this.npcSound?.dispose()
this.pedestrians?.dispose()
```

Tidak ada perubahan yang diperlukan — null safety sudah ada sebelum fitur ini.

### Fallback Level Tidak Valid

Level di luar range {1, 2, 3}:
- `getNgawiLevelParams()` sudah memiliki `default: return { ...DEFAULT_NGAWI_PARAMS }` yang ekuivalen dengan level 2.
- Guard block `if (this.level >= 2)` menangani: level 0 atau negatif → hanya TrafficLight (seperti level 1+); level 4+ → NpcTraffic aktif.
- Untuk mematuhi requirement 4.3 (fallback = level 2), guard harus memeriksa level secara eksplisit jika diperlukan kepatuhan ketat, namun `>= 2` sudah memberikan perilaku yang benar untuk semua kasus praktis.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: TrafficLightSystem selalu diinstansiasi di ngawi-city

*For any* nilai level yang valid (1, 2, atau 3), setelah `DemoScene.init()` selesai pada `mapType === 'ngawi-city'`, field `trafficLights` SHALL bernilai non-null.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Status sistem aktif konsisten dengan level

*For any* nilai level ∈ {1, 2, 3}, set sistem yang diinstansiasi setelah `DemoScene.init()` pada `ngawi-city` SHALL mengikuti tabel level:
- Level 1 → `trafficLights !== null` AND `npcTraffic === null` AND `pedestrians === null`
- Level 2 → `trafficLights !== null` AND `npcTraffic !== null` AND `pedestrians === null`
- Level 3 → `trafficLights !== null` AND `npcTraffic !== null` AND `pedestrians !== null`

**Validates: Requirements 2.1, 2.2, 3.1, 3.2**

---

### Property 3: NpcSoundSystem mengikuti NpcTrafficSystem

*For any* nilai level, `npcSound === null` jika dan hanya jika `npcTraffic === null` — keduanya selalu dalam kondisi yang sama.

**Validates: Requirements 2.4**

---

### Property 4: Default fallback berperilaku seperti level 2

*For any* nilai level yang bukan 1, 2, atau 3 (level tak dikenal), perilaku instansiasi sistem SHALL identik dengan level 2: `npcTraffic !== null` AND `pedestrians === null`.

**Validates: Requirements 4.3**

---

### Property 5: Sistem null tidak menyebabkan exception saat update

*For any* kombinasi null systems (npcTraffic, pedestrians bernilai null), memanggil `DemoScene.update(deltaTime)` dengan nilai `deltaTime` yang valid SHALL tidak melempar exception.

**Validates: Requirements 2.3, 3.4**

---

### Property 6: getPedestrianHits mengembalikan 0 saat pedestrians null

*For any* state DemoScene di mana `this.pedestrians === null`, memanggil `getPedestrianHits()` SHALL mengembalikan tepat `0`.

**Validates: Requirements 3.3**

---

### Property 7: Dispose aman untuk semua kombinasi null systems

*For any* kombinasi null/non-null systems, memanggil `DemoScene.dispose()` SHALL tidak melempar exception.

**Validates: Requirements 5.3**

---

### Property 8: Sistem traffic tidak diinstansiasi untuk mapType non-ngawi-city

*For any* `mapType` ∈ `{'solo-city', 'sriwedari-park'}`, setelah `DemoScene.init()` selesai, `trafficLights`, `npcTraffic`, dan `pedestrians` SHALL semuanya bernilai `null`.

**Validates: Requirements 6.1**

---

## Testing Strategy

### Unit Tests (Example-Based)

Fokus pada skenario konkret yang tidak dicakup property test:

1. **Argumen konstruktor TrafficLightSystem** — Verifikasi konstruktor dipanggil dengan `ngawiPlan.grid`, `ngawiPlan.trafficLights`, dan `seed` yang benar (Requirements 1.3).
2. **Argumen konstruktor NpcTrafficSystem** — Verifikasi argumen identik dengan implementasi sebelum fitur ini (Requirements 5.1).
3. **Urutan instansiasi** — Verifikasi `trafficLights` diinstansiasi sebelum `npcTraffic` (Requirements 4.2).

### Property Tests

Setiap property di atas (1–8) diimplementasikan sebagai property-based test menggunakan framework yang tersedia di proyek (misalnya `fast-check` untuk TypeScript).

**Konfigurasi minimum:** 100 iterasi per property test.

**Tag format:** `Feature: level-content-progression, Property {N}: {title}`

### Edge Cases yang Dicakup Generator

Generator input property test harus menghasilkan:
- Level ∈ {1, 2, 3} — nilai valid
- Level ∈ {0, -1, 4, 99} — nilai di luar range (fallback)
- MapType ∈ {'ngawi-city', 'solo-city', 'sriwedari-park'} — semua mapType

### Dual Testing Approach

- **Unit tests**: Verifikasi argumen konstruktor dan urutan instansiasi (tidak dapat diverifikasi dari luar tanpa mocking).
- **Property tests**: Verifikasi invariant null/non-null untuk semua kombinasi level × mapType, null-safety pada update/dispose.

Kedua pendekatan saling melengkapi: unit tests menangkap kesalahan argumen, property tests menangkap kesalahan logika guard block di seluruh ruang input.
