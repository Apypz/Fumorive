/**
 * NpcSoundSystem
 * ==============
 * Manages all NPC-related ambient audio in the Ngawi City game session.
 *
 *  1. ENGINE NOISE  — positional looping engine sounds per nearby NPC car.
 *                     Terdengar jelas saat dekat, memudar saat jauh.
 *
 *  2. HORN — hanya dipicu oleh dua kondisi:
 *     a. COLLISION    — NPC yang ditabrak player langsung klakson.
 *     b. FACE-OFF     — NPC yang berhadapan lurus dengan player dalam jarak
 *                       dekat (head-on approach) memberi peringatan klakson.
 *
 *  Klakson TIDAK dipicu saat menyalip / green-light.
 */

import type { NgawiGrid } from '../components/NgawiCityGenerator'

// ── constants ───────────────────────────────────────────────────────────────
const ENGINE_AUDIBLE_DIST   = 55    // metres — di luar ini engine tidak terdengar
const ENGINE_POOL           = 8     // maks NPC dengan suara engine aktif sekaligus
const ENGINE_VOLUME_SCALE   = 1.1   // volume dasar engine
const MASTER_VOLUME         = 1.2

// Horn
const HORN_VOLUME_COLLISION = 0.85  // volume klakson saat tabrakan
const HORN_VOLUME_FACEOF    = 1.0   // volume klakson head-on (diberi jarak falloff)
const HORN_MAX_DIST         = 55    // metres — di luar ini klakson tidak terdengar

// Collision box NPC (oriented bounding box, world space)
const NPC_BOX_HALF_LEN      = 3.3   // ≈ CAR_HALF_LENGTH × NPC_SCALE
const NPC_BOX_HALF_WID      = 1.42  // ≈ CAR_HALF_WIDTH  × NPC_SCALE
const COLLISION_MARGIN       = 1.1   // margin tambahan agar tabrakan dari belakang terdeteksi

// Face-off (head-on)
/** Jarak maksimum (m) agar face-off terdeteksi. */
const FACE_OFF_DIST         = 15
/** Dot product minimum antara heading NPC dan heading player (harus berlawanan). */
const FACE_OFF_DOT_FWD      = 0.65
/** Dot product minimum "saling mendekat". */
const FACE_OFF_DOT_APPROACH = 0.5

// Cooldowns
const HORN_COOLDOWN_COLLISION = 4.0  // setelah collision, cooldown sebelum bisa honk lagi
const HORN_COOLDOWN_FACEOF    = 5.0  // setelah face-off honk
const HORN_COOLDOWN_RAND      = 1.5  // random jitter

// ── NPC state snapshot ──────────────────────────────────────────────────────
export interface NpcSnapshot {
  id: number      // stable index
  x: number
  z: number
  heading: number // radians — forward = (sin h, 0, cos h)
  speed: number   // m/s
  toNode: number  // current target grid node id
}

// ── internal per-NPC audio state ────────────────────────────────────────────
interface NpcAudio {
  engineSrc:  AudioBufferSourceNode | null
  engineGain: GainNode | null
  hornCooldown: number  // detik sebelum bisa honk lagi
}

export class NpcSoundSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null

  private engineBuffer: AudioBuffer | null = null
  private hornBuffer:   AudioBuffer | null = null

  private engineReady = false
  private hornReady   = false
  private unlocked    = false

  private npcAudio: Map<number, NpcAudio> = new Map()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private grid: NgawiGrid | null = null

  private unlockHandler: (() => void) | null = null

  constructor() {
    this.attachUnlockListeners()
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setGrid(grid: NgawiGrid): void {
    this.grid = grid
  }

  async preload(): Promise<void> {
    this.ensureContext()
    if (!this.ctx) return
    console.log('[NpcSoundSystem] Preloading audio…')

    // Engine sound
    try {
      this.engineBuffer = await this.loadBuffer('/assets/sfx/car_engine2.mp3')
      this.engineReady = true
      console.log('[NpcSoundSystem] ✓ Engine buffer ready')
    } catch (e) {
      console.warn('[NpcSoundSystem] ✗ Engine buffer failed:', e)
    }

    // Horn sound
    try {
      this.hornBuffer = await this.loadBuffer('/assets/sfx/horn.mp3')
      this.hornReady = true
      console.log('[NpcSoundSystem] ✓ Horn buffer ready')
    } catch (e) {
      console.warn('[NpcSoundSystem] ✗ Horn buffer failed:', e)
    }
  }

  /**
   * Per-frame update.
   *
   * @param dt           Delta time (seconds).
   * @param npcs         NPC snapshots.
   * @param player       Player state atau null.
   * @param playerRadius Player collision radius (metres).
   * @param collisionIds NPC ids yang overlap player frame ini.
   * @param _greenTransitions  Diabaikan (green-light honk dihapus).
   */
  update(
    dt: number,
    npcs: NpcSnapshot[],
    player: { x: number; z: number; heading: number; speed: number } | null,
    playerRadius: number,
    collisionIds: Set<number>,
    _greenTransitions: Array<{ x: number; z: number }>
  ): void {
    this.ensureContext()
    if (!this.ctx) return

    // Jika AudioContext masih suspended, coba resume setiap frame
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.unlocked = true
      }).catch(() => {})
      // Tetap lanjutkan — engine sound perlu di-start setelah unlocked
    }

    // ── 1. Engine loop sounds ─────────────────────────────────────────────
    if (this.engineReady && this.unlocked) {
      this.updateEngines(npcs, player)
    }

    // ── 2. Horn triggers ─────────────────────────────────────────────────
    if (!this.hornReady || !this.unlocked) return

    for (const npc of npcs) {
      const audio = this.getOrCreateAudio(npc.id)
      audio.hornCooldown = Math.max(0, audio.hornCooldown - dt)

      // ── 2a. COLLISION — box-oriented, termasuk tabrakan dari belakang ──
      const boxCollide = player ? this.npcBoxOverlapsPlayer(npc, player, playerRadius) : false
      if (collisionIds.has(npc.id) || boxCollide) {
        if (audio.hornCooldown <= 0) {
          console.log(`[NpcSoundSystem] NPC ${npc.id} → COLLISION HONK`)
          this.playHorn(npc.x, npc.z, player, HORN_VOLUME_COLLISION, 1.0)
          audio.hornCooldown = HORN_COOLDOWN_COLLISION + Math.random() * HORN_COOLDOWN_RAND
        }
        continue // skip face-off check jika sedang collision
      }

      if (audio.hornCooldown > 0) continue

      // ── 2b. FACE-OFF (berhadapan lurus / head-on) ─────────────────────
      if (player) {
        const dx   = npc.x - player.x
        const dz   = npc.z - player.z
        const dist = Math.hypot(dx, dz)

        if (dist < FACE_OFF_DIST && dist > 0.5) {
          const toNpcX = dx / dist
          const toNpcZ = dz / dist

          const nfx = Math.sin(npc.heading)
          const nfz = Math.cos(npc.heading)
          const pfx = Math.sin(player.heading)
          const pfz = Math.cos(player.heading)

          // Saling berlawanan arah?
          const dotFwd = nfx * pfx + nfz * pfz
          // NPC bergerak menuju player?
          const dotNpcApproach    = -(nfx * toNpcX + nfz * toNpcZ)
          // Player bergerak menuju NPC?
          const dotPlayerApproach = pfx * toNpcX + pfz * toNpcZ

          if (
            dotFwd < -FACE_OFF_DOT_FWD &&
            dotNpcApproach > FACE_OFF_DOT_APPROACH &&
            dotPlayerApproach > FACE_OFF_DOT_APPROACH &&
            (npc.speed > 1 || player.speed > 2)
          ) {
            console.log(`[NpcSoundSystem] NPC ${npc.id} → FACE-OFF HONK dist=${dist.toFixed(1)}m`)
            this.playHorn(npc.x, npc.z, player, HORN_VOLUME_FACEOF, 0.9 + Math.random() * 0.15)
            audio.hornCooldown = HORN_COOLDOWN_FACEOF + Math.random() * HORN_COOLDOWN_RAND
          }
        }
      }
    }
  }

  /** Browser console debug: window.__npcSound.testHorn() */
  testHorn(): void {
    this.ensureContext()
    if (!this.ctx) { console.warn('[NpcSoundSystem] No AudioContext'); return }
    const resume = this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve()
    resume.then(() => {
      this.unlocked = true
      const play = () => {
        this.playHorn(0, 0, null, HORN_VOLUME_FACEOF, 1.0)
        console.log('[NpcSoundSystem] Test horn played!')
      }
      if (!this.hornBuffer) {
        this.loadBuffer('/assets/sfx/horn.mp3').then((buf) => {
          this.hornBuffer = buf; this.hornReady = true; play()
        }).catch(console.warn)
      } else {
        play()
      }
    })
  }

  /** Browser console debug: window.__npcSound.testEngine() */
  testEngine(): void {
    this.ensureContext()
    if (!this.ctx) { console.warn('[NpcSoundSystem] No AudioContext'); return }
    const resume = this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve()
    resume.then(() => {
      this.unlocked = true
      const play = () => {
        if (!this.ctx || !this.masterGain || !this.engineBuffer) return
        const src = this.ctx.createBufferSource()
        src.buffer = this.engineBuffer
        src.loop = true
        src.playbackRate.value = 0.9
        const gain = this.ctx.createGain()
        gain.gain.value = 0.8
        src.connect(gain)
        gain.connect(this.masterGain)
        src.start()
        console.log('[NpcSoundSystem] Test engine started! (will loop)')
      }
      if (!this.engineBuffer) {
        this.loadBuffer('/assets/sfx/car_engine2.mp3').then((buf) => {
          this.engineBuffer = buf; this.engineReady = true; play()
        }).catch(console.warn)
      } else {
        play()
      }
    })
  }

  dispose(): void {
    if (this.unlockHandler) {
      document.removeEventListener('click', this.unlockHandler)
      document.removeEventListener('keydown', this.unlockHandler)
      this.unlockHandler = null
    }
    for (const audio of this.npcAudio.values()) this.stopEngine(audio)
    this.npcAudio.clear()
    try { this.ctx?.close() } catch (_) {}
    this.ctx = null; this.masterGain = null
    this.engineReady = false; this.hornReady = false; this.unlocked = false
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private attachUnlockListeners(): void {
    const handler = () => {
      this.ensureContext()
      if (!this.ctx) return
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.unlocked = true
          console.log('[NpcSoundSystem] AudioContext unlocked via user gesture')
          // Trigger engine sound start setelah unlock
        }).catch(() => {})
      } else {
        this.unlocked = true
        console.log('[NpcSoundSystem] AudioContext already running, unlocked')
      }
    }
    this.unlockHandler = handler
    document.addEventListener('click',   handler, { once: false })
    document.addEventListener('keydown', handler, { once: false })
    document.addEventListener('touchstart', handler, { once: false })
  }

  private ensureContext(): void {
    if (this.ctx) return
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = MASTER_VOLUME
      this.masterGain.connect(this.ctx.destination)
      if (this.ctx.state === 'running') {
        this.unlocked = true
        console.log('[NpcSoundSystem] AudioContext running immediately')
      } else {
        console.log('[NpcSoundSystem] AudioContext state:', this.ctx.state, '— waiting for user gesture')
      }
    } catch (e) { console.warn('[NpcSoundSystem] AudioContext error:', e) }
  }

  private getOrCreateAudio(id: number): NpcAudio {
    if (!this.npcAudio.has(id)) {
      this.npcAudio.set(id, {
        engineSrc:    null,
        engineGain:   null,
        hornCooldown: Math.random() * 2,
      })
    }
    return this.npcAudio.get(id)!
  }

  // ── Engine sounds ──────────────────────────────────────────────────────────

  private updateEngines(
    npcs: NpcSnapshot[],
    player: { x: number; z: number } | null
  ): void {
    if (!this.ctx || !this.masterGain || !this.engineBuffer) return

    // Sort NPC berdasarkan jarak ke player
    const sorted = npcs
      .map((npc) => ({
        npc,
        dist: player ? Math.hypot(npc.x - player.x, npc.z - player.z) : Infinity,
      }))
      .sort((a, b) => a.dist - b.dist)

    // Pool: NPC terdekat yang masih dalam jangkauan
    const inPool = new Set(
      sorted
        .filter((d) => d.dist < ENGINE_AUDIBLE_DIST)
        .slice(0, ENGINE_POOL)
        .map((d) => d.npc.id)
    )

    // Stop engine sounds untuk NPC yang keluar pool
    for (const [id, audio] of this.npcAudio) {
      if (!inPool.has(id) && audio.engineSrc) {
        this.stopEngine(audio)
      }
    }

    // Update / mulai engine sounds untuk NPC dalam pool
    for (const { npc, dist } of sorted) {
      if (!inPool.has(npc.id)) break

      const audio = this.getOrCreateAudio(npc.id)

      // Volume: falloff linear² — terdengar jelas dekat, memudar halus
      const t   = Math.max(0, 1 - dist / ENGINE_AUDIBLE_DIST)
      const vol = t * t * ENGINE_VOLUME_SCALE

      // Playback rate: idle ≈ 0.6, kecepatan penuh ≈ 1.4
      const rate = 0.6 + Math.min(1.0, npc.speed / 14) * 0.8

      if (!audio.engineSrc) {
        // Buat AudioBufferSourceNode baru
        const src = this.ctx.createBufferSource()
        src.buffer          = this.engineBuffer!
        src.loop            = true
        src.playbackRate.value = rate

        const gain = this.ctx.createGain()
        gain.gain.value = vol

        src.connect(gain)
        gain.connect(this.masterGain)
        src.start()

        audio.engineSrc  = src
        audio.engineGain = gain

        // Jika source berhenti sendiri (edge case), hapus referensi
        src.onended = () => {
          if (audio.engineSrc === src) {
            audio.engineSrc  = null
            audio.engineGain = null
          }
        }
      } else {
        // Update playback rate dan volume secara smooth
        audio.engineSrc.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.15)
        audio.engineGain!.gain.setTargetAtTime(vol,  this.ctx.currentTime, 0.25)
      }
    }
  }

  private stopEngine(audio: NpcAudio): void {
    if (audio.engineSrc) {
      try {
        audio.engineSrc.stop()
        audio.engineSrc.disconnect()
      } catch (_) {}
      audio.engineSrc = null
    }
    if (audio.engineGain) {
      try { audio.engineGain.disconnect() } catch (_) {}
      audio.engineGain = null
    }
  }

  // ── Collision helper ───────────────────────────────────────────────────────

  /**
   * Oriented bounding box NPC vs lingkaran player.
   * Mendeteksi overlap dari semua arah: depan, belakang, samping.
   */
  private npcBoxOverlapsPlayer(
    npc: NpcSnapshot,
    player: { x: number; z: number },
    playerRadius: number
  ): boolean {
    const dx  = player.x - npc.x
    const dz  = player.z - npc.z
    const sin = Math.sin(npc.heading)
    const cos = Math.cos(npc.heading)

    // Proyeksikan posisi player ke local space NPC
    const localFwd = dx * sin + dz * cos   // sumbu maju NPC
    const localLat = dx * cos - dz * sin   // sumbu samping NPC

    const halfLen = NPC_BOX_HALF_LEN + playerRadius + COLLISION_MARGIN
    const halfWid = NPC_BOX_HALF_WID + playerRadius + COLLISION_MARGIN

    return Math.abs(localFwd) < halfLen && Math.abs(localLat) < halfWid
  }

  // ── Horn playback ──────────────────────────────────────────────────────────

  /**
   * Putar klakson dengan volume dan pitch yang diberikan.
   * Volume di-scale berdasarkan jarak ke player.
   */
  private playHorn(
    npcX: number,
    npcZ: number,
    player: { x: number; z: number } | null,
    baseVolume: number,
    pitch: number
  ): void {
    if (!this.ctx || !this.masterGain || !this.hornBuffer) return

    const dist = player ? Math.hypot(npcX - player.x, npcZ - player.z) : 0
    const vol  = Math.max(0.15, 1 - dist / HORN_MAX_DIST) * baseVolume
    if (vol < 0.05) return

    const src = this.ctx.createBufferSource()
    src.buffer             = this.hornBuffer!
    src.loop               = false
    src.playbackRate.value = pitch

    const gain = this.ctx.createGain()
    gain.gain.value = vol

    src.connect(gain)
    gain.connect(this.masterGain)
    src.start()
    src.onended = () => {
      try { src.disconnect(); gain.disconnect() } catch (_) {}
    }
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    if (!this.ctx) throw new Error('No AudioContext')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return this.ctx.decodeAudioData(await res.arrayBuffer())
  }
}
