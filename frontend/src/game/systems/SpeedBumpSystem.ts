/**
 * SpeedBumpSystem
 * ===============
 * Polisi tidur (speed bumps / road humps) yang ditempatkan di beberapa ruas
 * jalan Ngawi City. Efek:
 *
 * 1. VISUAL  — mesh tonjolan melintang di jalan (warna kuning-hitam).
 * 2. PLAYER  — jika melintas terlalu cepat (> threshold), kamera berguncang
 *              (shake) dan kecepatan dikurangi mendadak.
 * 3. NPC     — NPC yang mendekati speed bump otomatis pelan (dikontrol lewat
 *              getSpeedLimit() yang dibaca oleh NpcTrafficSystem melalui
 *              callback trafficStop yang sudah ada).
 * 4. SUARA   — bump sound effect saat player melintasi (via AudioContext).
 */

import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  Mesh,
} from '@babylonjs/core'
import type { NgawiGrid } from '../components/NgawiCityGenerator'
import { makeRng } from '../utils/prng'

export interface SpeedBump {
  x: number
  z: number
  horizontal: boolean // true = bump melintang di arah Z (jalan horizontal)
  width: number       // lebar road (untuk sizing mesh)
}

const BUMP_HEIGHT   = 0.10   // tinggi tonjolan (m)
const BUMP_DEPTH    = 0.55   // tebal bump (m) dalam arah perjalanan
const BUMP_SPEED_LIMIT = 4.5 // m/s ≈ 16 km/h — di atas ini player kena penalti
const BUMP_DETECT_R = 1.8   // radius deteksi player (m)
const BUMP_COOLDOWN = 1.5   // detik antara dua bump event berturutan
const NPC_SLOW_DIST = 8.0   // jarak NPC mulai pelan sebelum bump
const NPC_SLOW_SPEED = 3.5  // kecepatan target NPC saat melewati bump

export interface BumpCrossEvent {
  impactSpeed: number  // kecepatan player saat melintas (m/s)
}

export class SpeedBumpSystem {
  private scene: Scene
  private bumps: SpeedBump[] = []
  private meshes: Mesh[] = []
  private materials: PBRMaterial[] = []
  private rng: () => number

  // Per-bump cooldown (index → detik sisa)
  private cooldowns: number[] = []

  // Audio
  private ctx: AudioContext | null = null
  private bumpBuffer: AudioBuffer | null = null
  private audioReady = false

  // Callback ke DemoScene untuk kamera shake + speed penalty
  private onBumpCross: ((event: BumpCrossEvent) => void) | null = null

  constructor(scene: Scene, grid: NgawiGrid, seed: number) {
    this.scene = scene
    this.rng   = makeRng((seed ^ 0xc0ffee) >>> 0)
    this.placeBumps(grid)
    this.initAudio()
  }

  setOnBumpCross(cb: (event: BumpCrossEvent) => void): void {
    this.onBumpCross = cb
  }

  getBumps(): SpeedBump[] { return this.bumps }

  /**
   * Untuk NpcTrafficSystem: jarak ke bump terdekat di depan NPC.
   * Kembalikan kecepatan limit di sana, atau Infinity kalau tidak ada bump.
   */
  getNpcSpeedLimit(x: number, z: number, fx: number, fz: number): number {
    for (const bump of this.bumps) {
      const dx = bump.x - x
      const dz = bump.z - z
      const fwd = dx * fx + dz * fz
      if (fwd < 0 || fwd > NPC_SLOW_DIST) continue
      const lat = Math.abs(dx * fz - dz * fx)
      if (lat > bump.width / 2 + 1.5) continue
      // Lerp: semakin dekat, semakin pelan
      const t = Math.max(0, 1 - fwd / NPC_SLOW_DIST)
      return NPC_SLOW_SPEED + (1 - t) * 8
    }
    return Infinity
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  private placeBumps(grid: NgawiGrid): void {
    const nodes = grid.nodes
    const maxBumps = 10
    let count = 0

    for (const [aId, neighbors] of grid.adj) {
      if (count >= maxBumps) break
      for (const bId of neighbors) {
        if (bId <= aId) continue
        if (count >= maxBumps) break
        // Hanya ~40% edge dapat bump
        if (this.rng() > 0.40) continue

        const na = nodes[aId]
        const nb = nodes[bId]
        const dist = Math.hypot(nb.x - na.x, nb.z - na.z)
        if (dist < grid.cellSize * 0.4) continue

        const mx = (na.x + nb.x) / 2
        const mz = (na.z + nb.z) / 2
        const horizontal = na.r === nb.r

        const bump: SpeedBump = { x: mx, z: mz, horizontal, width: grid.roadWidth }
        this.bumps.push(bump)
        this.cooldowns.push(0)
        this.buildBumpMesh(bump, count)
        count++
      }
    }

    console.log(`[SpeedBumpSystem] Placed ${count} speed bumps`)
  }

  private buildBumpMesh(bump: SpeedBump, idx: number): void {
    // Material: kuning-hitam bergantian
    const yellowMat = new PBRMaterial(`bumpYellow_${idx}`, this.scene)
    yellowMat.albedoColor = new Color3(0.95, 0.82, 0.05)
    yellowMat.metallic = 0.1
    yellowMat.roughness = 0.7
    this.materials.push(yellowMat)

    const blackMat = new PBRMaterial(`bumpBlack_${idx}`, this.scene)
    blackMat.albedoColor = new Color3(0.08, 0.08, 0.08)
    blackMat.metallic = 0.1
    blackMat.roughness = 0.8
    this.materials.push(blackMat)

    // Buat beberapa segmen melintang (5 strip: alternating kuning/hitam)
    const stripes = 5
    const stripeW = bump.width / stripes

    for (let s = 0; s < stripes; s++) {
      const offset = (s - (stripes - 1) / 2) * stripeW
      const mat = s % 2 === 0 ? yellowMat : blackMat

      const mesh = MeshBuilder.CreateBox(`speedBump_${idx}_${s}`, {
        width:  bump.horizontal ? stripeW : BUMP_DEPTH,
        height: BUMP_HEIGHT * 2,
        depth:  bump.horizontal ? BUMP_DEPTH : stripeW,
      }, this.scene)

      mesh.position = new Vector3(
        bump.x + (bump.horizontal ? offset : 0),
        BUMP_HEIGHT,
        bump.z + (bump.horizontal ? 0 : offset)
      )
      mesh.material = mat
      mesh.receiveShadows = true
      mesh.freezeWorldMatrix()
      this.meshes.push(mesh)
    }
  }

  private async initAudio(): Promise<void> {
    try {
      this.ctx = new AudioContext()
      // Buat suara bump sintetis (low-frequency thud)
      this.bumpBuffer = this.generateBumpSound()
      this.audioReady = true
    } catch (_) {}
  }

  /** Generate suara "dug" / bump sintetis pakai Web Audio API. */
  private generateBumpSound(): AudioBuffer | null {
    if (!this.ctx) return null
    const dur = 0.25
    const rate = this.ctx.sampleRate
    const buf  = this.ctx.createBuffer(1, Math.floor(rate * dur), rate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      const t   = i / rate
      const env = Math.exp(-t * 18)       // fast decay
      const osc = Math.sin(2 * Math.PI * 55 * t)  // 55 Hz thud
      const nz  = (Math.random() * 2 - 1) * 0.25  // a bit of noise
      data[i] = (osc + nz) * env * 0.8
    }
    return buf
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(
    dt: number,
    playerPos: { x: number; z: number } | null,
    playerSpeed: number
  ): void {
    for (let i = 0; i < this.bumps.length; i++) {
      this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt)

      if (!playerPos || this.cooldowns[i] > 0) continue

      const bump = this.bumps[i]
      const dist = Math.hypot(playerPos.x - bump.x, playerPos.z - bump.z)

      if (dist < BUMP_DETECT_R) {
        this.cooldowns[i] = BUMP_COOLDOWN
        this.onBumpCross?.({ impactSpeed: playerSpeed })

        // Suara bump
        if (this.audioReady && this.ctx && this.bumpBuffer) {
          try {
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
            const src  = this.ctx.createBufferSource()
            src.buffer = this.bumpBuffer
            const gain = this.ctx.createGain()
            // Volume proporsional kecepatan (lebih keras makin kencang)
            gain.gain.value = Math.min(1.0, 0.3 + (playerSpeed / 15) * 0.7)
            src.connect(gain)
            gain.connect(this.ctx.destination)
            src.start()
            src.onended = () => { try { src.disconnect(); gain.disconnect() } catch (_) {} }
          } catch (_) {}
        }
      }
    }
  }

  dispose(): void {
    this.meshes.forEach((m) => m.dispose())
    this.materials.forEach((m) => m.dispose())
    try { this.ctx?.close() } catch (_) {}
    this.meshes = []
    this.materials = []
    this.bumps = []
  }
}
