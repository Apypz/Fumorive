/**
 * NpcSoundSystem
 * ==============
 * Manages all NPC-related ambient audio in the Ngawi City game session.
 *
 *  1. ENGINE NOISE  — positional looping engine sounds per nearby NPC car.
 *
 *  2. HORN — triggered on two events:
 *     a. Player COLLISION — NPC that is hit honks INSTANTLY at full volume,
 *        cooldown reset to 0, plays simultaneously with crash SFX.
 *     b. GREEN LIGHT transition — when a traffic light flips red→green,
 *        NPCs that are queued BEHIND the player (blocking them) honk.
 *        A random subset (50%) honks to keep it realistic.
 *
 *  3. FACE-OFF — kept for immersion: NPC approaching head-on honks as warning.
 */

import type { NgawiGrid } from '../components/NgawiCityGenerator'

// ── constants ───────────────────────────────────────────────────────────────
const ENGINE_AUDIBLE_DIST    = 50    // metres
const ENGINE_POOL            = 8
const ENGINE_VOLUME_SCALE    = 0.8
const MASTER_VOLUME          = 1.4

// Horn volumes
const HORN_VOLUME_COLLISION  = 1.8   // full blast on collision (no distance falloff)
const HORN_VOLUME_SCALE      = 1.6   // distance-based horn scale
const HORN_MAX_DIST          = 60    // metres — beyond this: no horn

// Green-light honk
/** Radius around the intersection node to look for waiting NPCs. */
const GREEN_WAIT_RADIUS      = 28    // metres
/** Radius behind the player within which waiting NPC should honk. */
const GREEN_BEHIND_PLAYER_DIST = 20  // metres
/** Chance (0-1) that a waiting NPC honks on green. */
const GREEN_HONK_CHANCE      = 0.55
/** Min speed (m/s) — NPC must be nearly stopped to be "waiting". */
const GREEN_WAITING_SPEED    = 2.5

// Face-off
const FACE_OFF_DIST          = 18
const FACE_OFF_DOT_FWD       = 0.6
const FACE_OFF_DOT_APPROACH  = 0.4

// Cooldowns
const HORN_COOLDOWN_NORMAL   = 3.5   // seconds after a normal honk
const HORN_COOLDOWN_RAND     = 2.0

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
  engineSrc: AudioBufferSourceNode | null
  engineGain: GainNode | null
  hornCooldown: number  // seconds remaining before can honk again
}

export class NpcSoundSystem {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null

  private engineBuffer: AudioBuffer | null = null
  private hornBuffer: AudioBuffer | null = null

  private engineReady = false
  private hornReady   = false
  private unlocked    = false

  private npcAudio: Map<number, NpcAudio> = new Map()
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
    try {
      this.engineBuffer = await this.loadBuffer('/assets/sfx/car_engine2.mp3')
      this.engineReady = true
      console.log('[NpcSoundSystem] ✓ Engine buffer ready')
    } catch (e) { console.warn('[NpcSoundSystem] ✗ Engine buffer failed:', e) }
    try {
      this.hornBuffer = await this.loadBuffer('/assets/sfx/horn.mp3')
      this.hornReady = true
      console.log('[NpcSoundSystem] ✓ Horn buffer ready')
    } catch (e) { console.warn('[NpcSoundSystem] ✗ Horn buffer failed:', e) }
  }

  /**
   * Per-frame update.
   *
   * @param dt              Delta time (seconds).
   * @param npcs            NPC snapshots (from NpcTrafficSystem.getSnapshots()).
   * @param player          Player state or null.
   * @param playerRadius    Player collision radius (metres).
   * @param collisionIds    NPC ids that overlap the player this frame.
   * @param greenTransitions Intersection positions that just turned green this frame.
   */
  update(
    dt: number,
    npcs: NpcSnapshot[],
    player: { x: number; z: number; heading: number; speed: number } | null,
    playerRadius: number,
    collisionIds: Set<number>,
    greenTransitions: Array<{ x: number; z: number }>
  ): void {
    this.ensureContext()
    if (!this.ctx || !this.unlocked) return
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
      return
    }

    // ── 1. Engine loop sounds ─────────────────────────────────────────────
    if (this.engineReady) this.updateEngines(npcs, player)

    // ── 2. Horn triggers ─────────────────────────────────────────────────
    if (!this.hornReady) return

    for (const npc of npcs) {
      const audio = this.getOrCreateAudio(npc.id)
      audio.hornCooldown = Math.max(0, audio.hornCooldown - dt)

      // ── 2a. COLLISION — always play, skip cooldown check ──────────────
      if (collisionIds.has(npc.id)) {
        // Force-play: reset cooldown first so it always fires
        audio.hornCooldown = 0
        console.log(`[NpcSoundSystem] NPC ${npc.id} → COLLISION HONK`)
        this.playHornCollision(npc.x, npc.z, player)
        audio.hornCooldown = HORN_COOLDOWN_NORMAL
        continue // skip other checks this frame for this NPC
      }

      if (audio.hornCooldown > 0) continue

      // ── 2b. GREEN LIGHT — NPC waiting behind player honks ─────────────
      let honkReason = ''
      if (greenTransitions.length > 0) {
        for (const gt of greenTransitions) {
          const dToLight = Math.hypot(npc.x - gt.x, npc.z - gt.z)
          if (dToLight < GREEN_WAIT_RADIUS && npc.speed < GREEN_WAITING_SPEED) {
            // Is this NPC behind the player (player is blocking them)?
            if (player) {
              const dx = npc.x - player.x
              const dz = npc.z - player.z
              const distToPlayer = Math.hypot(dx, dz)
              if (distToPlayer < GREEN_BEHIND_PLAYER_DIST) {
                // NPC is behind player: their heading should point toward player
                const nfx = Math.sin(npc.heading)
                const nfz = Math.cos(npc.heading)
                const toPlayerX = -dx / (distToPlayer || 1)
                const toPlayerZ = -dz / (distToPlayer || 1)
                const dotApproach = nfx * toPlayerX + nfz * toPlayerZ
                if (dotApproach > 0.3 && Math.random() < GREEN_HONK_CHANCE) {
                  honkReason = `GREEN_LIGHT light=(${gt.x.toFixed(0)},${gt.z.toFixed(0)}) dist=${distToPlayer.toFixed(1)}m`
                }
              }
            } else {
              // No player — just honk with random chance if near intersection
              if (Math.random() < GREEN_HONK_CHANCE * 0.4) {
                honkReason = `GREEN_LIGHT (no player) light=(${gt.x.toFixed(0)},${gt.z.toFixed(0)})`
              }
            }
          }
          if (honkReason) break
        }
      }

      // ── 2c. FACE-OFF warning (head-on approach) ────────────────────────
      if (!honkReason && player) {
        const dx = npc.x - player.x
        const dz = npc.z - player.z
        const dist = Math.hypot(dx, dz)
        if (dist < FACE_OFF_DIST && dist > 0.5) {
          const toNpcX = dx / dist
          const toNpcZ = dz / dist
          const nfx = Math.sin(npc.heading)
          const nfz = Math.cos(npc.heading)
          const pfx = Math.sin(player.heading)
          const pfz = Math.cos(player.heading)
          const dotFwd         = nfx * pfx + nfz * pfz
          const dotNpcApproach = -(nfx * toNpcX + nfz * toNpcZ)
          const dotPlayerApproach = pfx * toNpcX + pfz * toNpcZ
          if (
            dotFwd < -FACE_OFF_DOT_FWD &&
            dotNpcApproach > FACE_OFF_DOT_APPROACH &&
            dotPlayerApproach > FACE_OFF_DOT_APPROACH &&
            (npc.speed > 1 || player.speed > 2)
          ) {
            honkReason = `FACE-OFF dist=${dist.toFixed(1)}m`
          }
        }
      }

      if (honkReason) {
        console.log(`[NpcSoundSystem] NPC ${npc.id} → HONK (${honkReason})`)
        this.playHornNormal(npc.x, npc.z, player)
        audio.hornCooldown = HORN_COOLDOWN_NORMAL + Math.random() * HORN_COOLDOWN_RAND
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
      if (!this.hornBuffer) {
        this.loadBuffer('/assets/sfx/horn.mp3').then((buf) => {
          this.hornBuffer = buf; this.hornReady = true
          this.playHornNormal(0, 0, null)
          console.log('[NpcSoundSystem] Test horn played!')
        }).catch(console.warn)
      } else {
        this.playHornNormal(0, 0, null)
        console.log('[NpcSoundSystem] Test horn played!')
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
        }).catch(() => {})
      } else {
        this.unlocked = true
      }
    }
    this.unlockHandler = handler
    document.addEventListener('click', handler)
    document.addEventListener('keydown', handler)
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
      }
    } catch (e) { console.warn('[NpcSoundSystem] AudioContext error:', e) }
  }

  private getOrCreateAudio(id: number): NpcAudio {
    if (!this.npcAudio.has(id)) {
      this.npcAudio.set(id, { engineSrc: null, engineGain: null, hornCooldown: Math.random() * 2 })
    }
    return this.npcAudio.get(id)!
  }

  private updateEngines(npcs: NpcSnapshot[], player: { x: number; z: number } | null): void {
    if (!this.ctx || !this.masterGain || !this.engineBuffer) return

    const sorted = npcs
      .map((npc) => ({ npc, dist: player ? Math.hypot(npc.x - player.x, npc.z - player.z) : Infinity }))
      .sort((a, b) => a.dist - b.dist)

    const inPool = new Set(
      sorted.filter((d) => d.dist < ENGINE_AUDIBLE_DIST).slice(0, ENGINE_POOL).map((d) => d.npc.id)
    )

    for (const [id, audio] of this.npcAudio) {
      if (!inPool.has(id) && audio.engineSrc) this.stopEngine(audio)
    }

    for (const { npc, dist } of sorted) {
      if (!inPool.has(npc.id)) break
      const audio = this.getOrCreateAudio(npc.id)
      const vol  = Math.pow(Math.max(0, 1 - dist / ENGINE_AUDIBLE_DIST), 1.5) * ENGINE_VOLUME_SCALE
      const rate = 0.55 + Math.min(1, npc.speed / 14) * 0.8

      if (!audio.engineSrc) {
        const src = this.ctx.createBufferSource()
        src.buffer = this.engineBuffer!
        src.loop = true
        src.playbackRate.value = rate
        const gain = this.ctx.createGain()
        gain.gain.value = vol
        src.connect(gain)
        gain.connect(this.masterGain)
        src.start()
        audio.engineSrc = src
        audio.engineGain = gain
      } else {
        audio.engineSrc.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.12)
        audio.engineGain!.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.2)
      }
    }
  }

  private stopEngine(audio: NpcAudio): void {
    if (audio.engineSrc) {
      try { audio.engineSrc.stop(); audio.engineSrc.disconnect() } catch (_) {}
      audio.engineSrc = null
    }
    if (audio.engineGain) {
      try { audio.engineGain.disconnect() } catch (_) {}
      audio.engineGain = null
    }
  }

  /**
   * Play horn at full volume for collision — no distance falloff.
   * Played simultaneously with the crash sound.
   */
  private playHornCollision(
    npcX: number,
    npcZ: number,
    player: { x: number; z: number } | null
  ): void {
    if (!this.ctx || !this.masterGain || !this.hornBuffer) return

    // Even at max distance, still play at reduced volume (don't cut it)
    const dist  = player ? Math.hypot(npcX - player.x, npcZ - player.z) : 0
    const vol   = Math.max(0.5, 1 - dist / HORN_MAX_DIST) * HORN_VOLUME_COLLISION

    const src = this.ctx.createBufferSource()
    src.buffer = this.hornBuffer!
    src.loop   = false
    src.playbackRate.value = 1.0  // exact pitch for collision (urgent)

    const gain = this.ctx.createGain()
    gain.gain.value = vol
    src.connect(gain)
    gain.connect(this.masterGain)
    src.start()
    src.onended = () => { try { src.disconnect(); gain.disconnect() } catch (_) {} }
  }

  /**
   * Play horn with normal spatial falloff (green-light, face-off).
   */
  private playHornNormal(
    npcX: number,
    npcZ: number,
    player: { x: number; z: number } | null
  ): void {
    if (!this.ctx || !this.masterGain || !this.hornBuffer) return

    const dist  = player ? Math.hypot(npcX - player.x, npcZ - player.z) : 15
    const vol   = Math.max(0, 1 - dist / HORN_MAX_DIST) * HORN_VOLUME_SCALE
    if (vol < 0.04) return

    const src = this.ctx.createBufferSource()
    src.buffer = this.hornBuffer!
    src.loop   = false
    src.playbackRate.value = 0.9 + Math.random() * 0.2

    const gain = this.ctx.createGain()
    gain.gain.value = vol
    src.connect(gain)
    gain.connect(this.masterGain)
    src.start()
    src.onended = () => { try { src.disconnect(); gain.disconnect() } catch (_) {} }
  }

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    if (!this.ctx) throw new Error('No AudioContext')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return this.ctx.decodeAudioData(await res.arrayBuffer())
  }
}
