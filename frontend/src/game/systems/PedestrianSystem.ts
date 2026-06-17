/**
 * PedestrianSystem
 * ================
 * Manages pedestrians that walk across zebra crossings in Ngawi City.
 *
 * Behaviour:
 * - Pejalan kaki berdiri di tepi jalan (sidewalk) menunggu giliran menyebrang.
 * - Saat phase "jalan" datang, mereka menyebrang (berjalan dari satu sisi ke sisi lain).
 * - Pejalan kaki peka terhadap mobil — jika mobil terlalu dekat saat mereka menyebrang,
 *   mereka berhenti atau lari (speed up).
 * - Setiap zebra cross bisa punya beberapa pejalan kaki.
 */

import {
  Scene,
  TransformNode,
  MeshBuilder,
  Vector3,
  Color3,
  PBRMaterial,
  Mesh,
} from '@babylonjs/core'
import type { NgawiGrid } from '../components/NgawiCityGenerator'
import { makeRng, randFloat, randInt } from '../utils/prng'

export interface ZebraCross {
  x: number
  z: number
  horizontal: boolean // true = orang menyebrang di arah Z, false = di arah X
  width: number       // lebar zebra cross (sesuai lebar jalan)
}

interface Pedestrian {
  root: TransformNode
  x: number
  z: number
  startX: number
  startZ: number
  endX: number
  endZ: number
  heading: number     // arah menyebrang (radian)
  speed: number       // m/s normal
  state: 'waiting' | 'crossing' | 'done'
  waitTimer: number   // countdown sebelum mulai menyebrang
  crossIndex: number  // zebra cross yang dipakai
  sideIndex: number   // 0 = mulai dari sisi kiri/bawah, 1 = dari kanan/atas
  bodyMat: PBRMaterial
}

// Skinny pedestrian body proportions
const PED_HEIGHT       = 1.7
const PED_WIDTH        = 0.45

const CROSSING_DIST    = 16.5  // lebar jalan yang diseberangi (meter)
const WAIT_TIME_MIN    = 2.0
const WAIT_TIME_MAX    = 8.0
const WALK_SPEED_MIN   = 1.2
const WALK_SPEED_MAX   = 2.0
const CAR_DANGER_DIST  = 7.0   // jarak mobil yang bikin pejalan takut
const SCARED_SPEED_MUL = 2.5   // kecepatan lari saat takut

const PEDESTRIANS_PER_CROSS = 2

const HIT_RADIUS   = 1.8   // jarak pusat mobil ↔ pejalan untuk dihitung tabrakan (m)
const HIT_COOLDOWN = 2.5   // detik sebelum pejalan yang sama bisa terhitung lagi

export class PedestrianSystem {
  private scene: Scene
  private grid: NgawiGrid
  private rng: () => number
  private pedestrians: Pedestrian[] = []
  private crossings: ZebraCross[] = []
  private materials: PBRMaterial[] = []
  private crossMeshes: Mesh[] = []

  // Deteksi tabrakan pejalan kaki (per-pejalan cooldown + counter event baru)
  private hitCooldowns: number[] = []
  private pendingHits = 0

  // Snapshot zebra cross positions untuk deteksi violasi oleh DemoScene
  getZebraCrossings(): ZebraCross[] { return this.crossings }

  /** Jumlah pejalan kaki yang baru tertabrak sejak terakhir dibaca (auto-reset). */
  consumePedestrianHits(): number {
    const n = this.pendingHits
    this.pendingHits = 0
    return n
  }

  /** True jika player sedang menghalangi pejalan kaki yang menyebrang. */
  isBlockingPedestrian(playerX: number, playerZ: number, playerRadius: number): boolean {
    for (const ped of this.pedestrians) {
      if (ped.state !== 'crossing') continue
      const dist = Math.hypot(ped.x - playerX, ped.z - playerZ)
      if (dist < playerRadius + PED_WIDTH * 2) return true
    }
    return false
  }

  constructor(scene: Scene, grid: NgawiGrid, seed: number) {
    this.scene = scene
    this.grid = grid
    this.rng   = makeRng((seed ^ 0xdeadbeef) >>> 0)
    this.placeCrossings()
    this.spawnPedestrians()
    this.hitCooldowns = this.pedestrians.map(() => 0)
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  private placeCrossings(): void {
    // Taruh zebra cross di beberapa persimpangan / tengah ruas jalan.
    // Kita ambil sebagian edge dari grid, lalu taruh crossing di tengah-tengah edge.
    const nodes = this.grid.nodes
    const cellSize = this.grid.cellSize
    const roadWidth = this.grid.roadWidth

    let count = 0
    const maxCrossings = 14

    for (const [aId, neighbors] of this.grid.adj) {
      if (count >= maxCrossings) break
      for (const bId of neighbors) {
        if (bId <= aId) continue // hindari duplikat
        if (count >= maxCrossings) break
        if (this.rng() > 0.55) continue // hanya beberapa edge

        const na = nodes[aId]
        const nb = nodes[bId]
        const mx = (na.x + nb.x) / 2
        const mz = (na.z + nb.z) / 2
        const horizontal = na.r === nb.r // berjalan di sepanjang baris = arah X

        // Pastikan cukup jauh dari tepi jalan / persimpangan (setidaknya 1/4 cell)
        const dist = Math.hypot(nb.x - na.x, nb.z - na.z)
        if (dist < cellSize * 0.5) continue

        this.crossings.push({
          x: mx,
          z: mz,
          horizontal,
          width: roadWidth,
        })
        this.buildZebraMesh(mx, mz, horizontal, roadWidth, count)
        count++
      }
    }
  }

  private buildZebraMesh(x: number, z: number, horizontal: boolean, width: number, idx: number): void {
    const stripMat = new PBRMaterial(`zebraStripMat_${idx}`, this.scene)
    stripMat.albedoColor = new Color3(0.92, 0.92, 0.92)
    stripMat.metallic = 0
    stripMat.roughness = 0.85
    this.materials.push(stripMat)

    // Buat 5 strip putih zebra cross
    const stripes = 5
    const stripeW = width / (stripes * 2 - 1) // lebar satu strip
    const crossLength = 4.5 // panjang strip (tegak lurus arah jalan)

    for (let s = 0; s < stripes; s++) {
      const offset = (s - (stripes - 1) / 2) * stripeW * 2
      const stripe = MeshBuilder.CreateGround(`zebraStripe_${idx}_${s}`, {
        width: horizontal ? crossLength : stripeW,
        height: horizontal ? stripeW : crossLength,
      }, this.scene)

      stripe.position = new Vector3(
        x + (horizontal ? 0 : offset),
        0.025,
        z + (horizontal ? offset : 0)
      )
      stripe.material = stripMat
      stripe.receiveShadows = true
      stripe.freezeWorldMatrix()
      this.crossMeshes.push(stripe)
    }
  }

  private spawnPedestrians(): void {
    const skinColors = [
      new Color3(0.85, 0.65, 0.45),
      new Color3(0.55, 0.38, 0.28),
      new Color3(0.95, 0.82, 0.72),
      new Color3(0.72, 0.52, 0.38),
    ]
    const shirtColors = [
      new Color3(0.85, 0.25, 0.25),
      new Color3(0.25, 0.45, 0.85),
      new Color3(0.25, 0.7, 0.35),
      new Color3(0.85, 0.75, 0.2),
      new Color3(0.55, 0.2, 0.7),
      new Color3(0.9, 0.9, 0.9),
    ]

    for (let ci = 0; ci < this.crossings.length; ci++) {
      const cross = this.crossings[ci]
      for (let pi = 0; pi < PEDESTRIANS_PER_CROSS; pi++) {
        const sideIndex = pi % 2
        const skinMat = new PBRMaterial(`pedSkin_${ci}_${pi}`, this.scene)
        skinMat.albedoColor = skinColors[Math.floor(this.rng() * skinColors.length)]
        skinMat.metallic = 0; skinMat.roughness = 0.8
        const shirtMat = new PBRMaterial(`pedShirt_${ci}_${pi}`, this.scene)
        shirtMat.albedoColor = shirtColors[Math.floor(this.rng() * shirtColors.length)]
        shirtMat.metallic = 0; shirtMat.roughness = 0.8
        const pantsMat = new PBRMaterial(`pedPants_${ci}_${pi}`, this.scene)
        pantsMat.albedoColor = new Color3(0.18, 0.18, 0.35)
        pantsMat.metallic = 0; pantsMat.roughness = 0.9
        this.materials.push(skinMat, shirtMat, pantsMat)

        const root = this.buildPedMesh(`ped_${ci}_${pi}`, skinMat, shirtMat, pantsMat)

        // Posisi awal: di tepi zebra cross
        const { sx, sz, ex, ez, heading } = this.getCrossingEndpoints(cross, sideIndex)

        // Scatter lateral sedikit agar tidak tumpuk
        const lateralOffset = randFloat(this.rng, -0.8, 0.8)
        const perpX = -Math.sin(heading) * lateralOffset
        const perpZ =  Math.cos(heading) * lateralOffset

        root.position = new Vector3(sx + perpX, 0, sz + perpZ)
        root.rotation.y = heading

        this.pedestrians.push({
          root,
          x: sx + perpX,
          z: sz + perpZ,
          startX: sx + perpX,
          startZ: sz + perpZ,
          endX: ex + perpX,
          endZ: ez + perpZ,
          heading,
          speed: randFloat(this.rng, WALK_SPEED_MIN, WALK_SPEED_MAX),
          state: 'waiting',
          waitTimer: randFloat(this.rng, WAIT_TIME_MIN, WAIT_TIME_MAX),
          crossIndex: ci,
          sideIndex,
          bodyMat: shirtMat,
        })
      }
    }
  }

  private getCrossingEndpoints(cross: ZebraCross, sideIndex: number) {
    const halfDist = CROSSING_DIST / 2 + 1.5
    let sx: number, sz: number, ex: number, ez: number, heading: number

    if (cross.horizontal) {
      // Jalan horizontal (arah X) → pejalan menyebrang di arah Z
      sz = cross.z + (sideIndex === 0 ? -halfDist : halfDist)
      ez = cross.z + (sideIndex === 0 ?  halfDist : -halfDist)
      sx = ex = cross.x + randFloat(this.rng, -1.5, 1.5)
      heading = sideIndex === 0 ? 0 : Math.PI // ke arah Z+ atau Z-
    } else {
      // Jalan vertikal (arah Z) → pejalan menyebrang di arah X
      sx = cross.x + (sideIndex === 0 ? -halfDist : halfDist)
      ex = cross.x + (sideIndex === 0 ?  halfDist : -halfDist)
      sz = ez = cross.z + randFloat(this.rng, -1.5, 1.5)
      heading = sideIndex === 0 ? Math.PI / 2 : -Math.PI / 2 // ke arah X+ atau X-
    }

    return { sx, sz, ex, ez, heading }
  }

  private buildPedMesh(
    name: string,
    skinMat: PBRMaterial,
    shirtMat: PBRMaterial,
    pantsMat: PBRMaterial
  ): TransformNode {
    const root = new TransformNode(name, this.scene)

    // Kepala
    const head = MeshBuilder.CreateSphere(`${name}_head`, { diameter: 0.38, segments: 6 }, this.scene)
    head.position = new Vector3(0, PED_HEIGHT - 0.18, 0)
    head.material = skinMat
    head.parent = root

    // Badan (torso)
    const torso = MeshBuilder.CreateBox(`${name}_torso`, { width: PED_WIDTH, height: 0.6, depth: 0.22 }, this.scene)
    torso.position = new Vector3(0, PED_HEIGHT * 0.6, 0)
    torso.material = shirtMat
    torso.parent = root

    // Kaki (lower body)
    const legs = MeshBuilder.CreateBox(`${name}_legs`, { width: PED_WIDTH * 0.85, height: 0.65, depth: 0.2 }, this.scene)
    legs.position = new Vector3(0, PED_HEIGHT * 0.25, 0)
    legs.material = pantsMat
    legs.parent = root

    return root
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(
    dt: number,
    playerPos: { x: number; z: number } | null
  ): void {
    // Deteksi tabrakan: mobil menumpuk pejalan kaki yang sedang menyebrang.
    // Hanya pejalan ber-state 'crossing' (berada di badan jalan) yang dihitung,
    // jadi melewati orang yang menunggu di trotoar tidak kena pelanggaran.
    for (let i = 0; i < this.pedestrians.length; i++) {
      if (this.hitCooldowns[i] > 0) this.hitCooldowns[i] -= dt
      const p = this.pedestrians[i]
      if (!playerPos || p.state !== 'crossing' || this.hitCooldowns[i] > 0) continue
      if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) < HIT_RADIUS) {
        this.pendingHits++
        this.hitCooldowns[i] = HIT_COOLDOWN
      }
    }

    for (const ped of this.pedestrians) {
      // Tick animasi (bob kepala sederhana)
      this.animatePed(ped, dt)

      switch (ped.state) {
        case 'waiting':
          ped.waitTimer -= dt
          if (ped.waitTimer <= 0) {
            // Cek apakah aman untuk menyebrang (tidak ada mobil dekat)
            if (!playerPos || Math.hypot(ped.x - playerPos.x, ped.z - playerPos.z) > CAR_DANGER_DIST * 1.5) {
              ped.state = 'crossing'
            } else {
              ped.waitTimer = 1.5 // tunggu lagi
            }
          }
          break

        case 'crossing': {
          const scared = playerPos && Math.hypot(ped.x - playerPos.x, ped.z - playerPos.z) < CAR_DANGER_DIST
          const spd = scared ? ped.speed * SCARED_SPEED_MUL : ped.speed

          ped.x += Math.sin(ped.heading) * spd * dt
          ped.z += Math.cos(ped.heading) * spd * dt
          ped.root.position.x = ped.x
          ped.root.position.z = ped.z

          // Cek apakah sudah sampai sisi lain
          const dx = ped.endX - ped.x
          const dz = ped.endZ - ped.z
          const remaining = Math.hypot(dx, dz)
          if (remaining < 0.8) {
            ped.state = 'done'
          }
          break
        }

        case 'done':
          // Reset: balik ke posisi awal setelah istirahat
          ped.state = 'waiting'
          ped.waitTimer = randFloat(this.rng, WAIT_TIME_MIN * 1.5, WAIT_TIME_MAX * 2)
          // Balik arah
          const tmp = { x: ped.startX, z: ped.startZ }
          ped.startX = ped.endX
          ped.startZ = ped.endZ
          ped.endX = tmp.x
          ped.endZ = tmp.z
          ped.x = ped.startX
          ped.z = ped.startZ
          ped.heading = (ped.heading + Math.PI) % (2 * Math.PI)
          ped.root.position.x = ped.x
          ped.root.position.z = ped.z
          ped.root.rotation.y = ped.heading
          break
      }
    }
  }

  private _walkPhase = 0

  private animatePed(ped: Pedestrian, dt: number): void {
    if (ped.state === 'crossing') {
      this._walkPhase += dt * 5
      // Bob naik-turun sederhana
      ped.root.position.y = Math.abs(Math.sin(this._walkPhase + ped.crossIndex)) * 0.06
    } else {
      ped.root.position.y = 0
    }
  }

  dispose(): void {
    this.pedestrians.forEach((p) => p.root.dispose())
    this.crossMeshes.forEach((m) => m.dispose())
    this.materials.forEach((m) => m.dispose())
    this.pedestrians = []
    this.crossMeshes = []
    this.materials = []
  }
}
