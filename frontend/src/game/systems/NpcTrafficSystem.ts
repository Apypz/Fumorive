/**
 * NpcTrafficSystem
 * ================
 * Script-built NPC cars that drive the procedural Ngawi City road grid with a
 * lightweight *vehicle* model (steering toward a look-ahead point), so motion is
 * smooth and car-like instead of rigid grid-snapping.
 *
 * Motion model (kinematic, car-like):
 * - Each car steers toward a **look-ahead point** kept a fixed distance ahead
 *   along the route (in the LEFT lane). Because the target is never close, the
 *   heading is stable — no jitter/stutter — and it flows smoothly onto the next
 *   street, turning through corners on a real arc.
 * - It slows for sharp turns and accelerates on straights (momentum/feel like the
 *   player's car).
 *
 * Traffic behaviour:
 * - **Keep left** (Indonesian left-hand traffic).
 * - **Car-following**: brakes/stops for the nearest obstacle ahead — never rams.
 * - **Overtaking**: pulls into the right lane to pass a stuck obstacle, then merges.
 * - **Solid & immovable**: kinematic (AI drives the position); still a dynamic
 *   collider so the player bumps it and the collision → violation fires.
 */

import {
  Scene,
  TransformNode,
  MeshBuilder,
  Mesh,
  Vector3,
  Color3,
  PBRMaterial,
} from '@babylonjs/core'
import type { NgawiGrid } from '../components/NgawiCityGenerator'
import { makeRng, randFloat } from '../utils/prng'
import type { NpcSnapshot } from './NpcSoundSystem'

interface AABB {
  min: Vector3
  max: Vector3
}

interface Obstacle {
  x: number
  z: number
  r: number
  self: NpcCar | null // null = the player
}

interface NpcCar {
  root: TransformNode
  type: VehicleType
  halfLength: number
  halfWidth: number
  radius: number
  x: number
  z: number
  heading: number
  speed: number
  cruise: number
  fromNode: number
  toNode: number
  nextNode: number // one node further, for the look-ahead across corners
  progress: number // 0..1 carrot progress along the current edge (monotonic)
  laneOffset: number // signed lateral offset from centreline (+ = left), lerps
  targetLaneOffset: number
  blockedTime: number
  overtakeTime: number
  overtakeCar: NpcCar | null
  overtakePlayer: boolean
}

// --- Vehicle types (varied silhouettes & sizes, built at real-world metres) ---
export type VehicleType = 'sedan' | 'hatchback' | 'suv' | 'van' | 'bus' | 'truck'

interface VehicleSpec {
  halfLength: number
  halfWidth: number
  radius: number // circular extent for lateral sensing & car-following spacing
  weight: number // random selection weight (sum ≈ 1)
}

// halfLength matches each model's furthest body/bumper extent (the truck model
// is recentred on the root so this symmetric box fits it without phantom volume).
const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  sedan: { halfLength: 2.4, halfWidth: 0.95, radius: 1.6, weight: 0.26 },
  hatchback: { halfLength: 2.13, halfWidth: 0.92, radius: 1.5, weight: 0.2 },
  suv: { halfLength: 2.6, halfWidth: 1.0, radius: 1.7, weight: 0.18 },
  van: { halfLength: 2.82, halfWidth: 1.0, radius: 1.8, weight: 0.12 },
  bus: { halfLength: 4.85, halfWidth: 1.25, radius: 2.3, weight: 0.1 },
  truck: { halfLength: 3.9, halfWidth: 1.2, radius: 2.3, weight: 0.14 },
}

const VEHICLE_TYPES = Object.keys(VEHICLE_SPECS) as VehicleType[]

// --- Lane / road ---
const LANE_OFFSET = 3.4 // left-lane distance from centreline (road ~16m wide)
const LOOKAHEAD = 9 // how far ahead the steering target sits (m) — key to smoothness

// --- Car-following ---
const SENSE_DIST = 17
const STOP_GAP = 4.5
const LANE_HALF = 1.9
const GAP_SPEED_K = 1.0
const ACCEL = 7
const BRAKE = 16

// --- Steering / turning feel ---
const CORNER_SPEED = 4 // speed cap mid-corner (m/s)
const CORNER_ALPHA = 0.7 // rad: heading error at/above which we're at corner speed
const MIN_YAW = 0.9 // rad/s
const MAX_YAW = 2.2 // rad/s
const YAW_PER_SPEED = 0.18

// --- Overtaking ---
const LANE_CHANGE_RATE = 4
const OVERTAKE_DELAY = 1.8
const OVERTAKE_OFFSET = 3.0
const OVERTAKE_DURATION = 3.0

export class NpcTrafficSystem {
  private scene: Scene
  private grid: NgawiGrid
  private rng: () => number
  private cars: NpcCar[] = []
  private materials: PBRMaterial[] = []

  /** NPC ids that overlapped the player car in the most recent update(). */
  lastCollisionIds: Set<number> = new Set()

  constructor(scene: Scene, grid: NgawiGrid, count: number, seed: number, avoidNodeId?: number) {
    this.scene = scene
    this.grid = grid
    this.rng = makeRng((seed ^ 0x5bd1e995) >>> 0)
    this.spawn(count, avoidNodeId)
  }

  private makeMaterial(name: string, color: Color3, metallic: number, roughness: number): PBRMaterial {
    const m = new PBRMaterial(name, this.scene)
    m.albedoColor = color
    m.metallic = metallic
    m.roughness = roughness
    this.materials.push(m)
    return m
  }

  private makeEmissive(name: string, color: Color3): PBRMaterial {
    const m = new PBRMaterial(name, this.scene)
    m.albedoColor = color.scale(0.3)
    m.emissiveColor = color
    m.emissiveIntensity = 1.0
    m.metallic = 0
    m.roughness = 0.4
    this.materials.push(m)
    return m
  }

  private pickNext(nodeId: number, avoidId: number): number {
    const neighbors = Array.from(this.grid.adj.get(nodeId) ?? [])
    if (neighbors.length === 0) return nodeId
    const forward = neighbors.filter((n) => n !== avoidId)
    const choices = forward.length > 0 ? forward : neighbors
    return choices[Math.floor(this.rng() * choices.length)]
  }

  private spawn(count: number, avoidNodeId?: number): void {
    const bodyColors = [
      new Color3(0.85, 0.2, 0.2),
      new Color3(0.2, 0.45, 0.85),
      new Color3(0.9, 0.75, 0.15),
      new Color3(0.2, 0.7, 0.35),
      new Color3(0.92, 0.92, 0.94),
      new Color3(0.88, 0.45, 0.1),
    ]
    const bodyMats = bodyColors.map((c, i) => this.makeMaterial(`npcBody_${i}`, c, 0.4, 0.4))
    const wheelMat = this.makeMaterial('npcWheel', new Color3(0.04, 0.04, 0.05), 0.1, 0.85)
    const glassMat = this.makeMaterial('npcGlass', new Color3(0.08, 0.11, 0.18), 0.3, 0.15)
    const trimMat = this.makeMaterial('npcTrim', new Color3(0.28, 0.28, 0.3), 0.3, 0.6)
    const headMat = this.makeEmissive('npcHeadlight', new Color3(1, 0.96, 0.82))
    const tailMat = this.makeEmissive('npcTaillight', new Color3(0.95, 0.12, 0.12))

    const candidates = this.grid.nodes.filter(
      (n) => (this.grid.adj.get(n.id)?.size ?? 0) > 0 && n.id !== avoidNodeId
    )

    for (let i = 0; i < count; i++) {
      if (candidates.length === 0) break
      const start = candidates[Math.floor(this.rng() * candidates.length)]
      const neighbors = Array.from(this.grid.adj.get(start.id) ?? [])
      if (neighbors.length === 0) continue
      const to = neighbors[Math.floor(this.rng() * neighbors.length)]
      const toNode = this.grid.nodes[to]

      let edx = toNode.x - start.x
      let edz = toNode.z - start.z
      const elen = Math.hypot(edx, edz) || 1
      edx /= elen
      edz /= elen
      const heading = Math.atan2(edx, edz)
      const x = start.x + -edz * LANE_OFFSET // start in the left lane
      const z = start.z + edx * LANE_OFFSET

      const type = this.pickType()
      const spec = VEHICLE_SPECS[type]
      const root = this.buildCar(type, bodyMats[i % bodyMats.length], wheelMat, glassMat, headMat, tailMat, trimMat, i)
      root.position = new Vector3(x, 0, z)
      root.rotation.y = heading

      // Wide spread so some cars are clearly slow and others fast. Big vehicles
      // (bus/truck) cruise a little slower.
      const speedScale = type === 'bus' || type === 'truck' ? 0.8 : 1
      const cruise = randFloat(this.rng, 6, 15) * speedScale
      this.cars.push({
        root,
        type,
        halfLength: spec.halfLength,
        halfWidth: spec.halfWidth,
        radius: spec.radius,
        x,
        z,
        heading,
        speed: cruise * randFloat(this.rng, 0.4, 0.8),
        cruise,
        fromNode: start.id,
        toNode: to,
        nextNode: this.pickNext(to, start.id),
        progress: this.rng() * 0.3,
        laneOffset: LANE_OFFSET,
        targetLaneOffset: LANE_OFFSET,
        blockedTime: 0,
        overtakeTime: 0,
        overtakeCar: null,
        overtakePlayer: false,
      })
    }
  }

  /** Weighted-random vehicle type. */
  private pickType(): VehicleType {
    let r = this.rng()
    for (const t of VEHICLE_TYPES) {
      r -= VEHICLE_SPECS[t].weight
      if (r <= 0) return t
    }
    return 'sedan'
  }

  /**
   * Build a detailed procedural model for the given type. Parts are grouped by
   * material and each group is merged into ONE mesh parented to the car root, so
   * a whole car is only a handful of draw calls even with the extra detail.
   * Local frame: forward = +Z, width = X, up = Y; ground at y = 0.
   */
  private buildCar(
    type: VehicleType,
    bodyMat: PBRMaterial,
    wheelMat: PBRMaterial,
    glassMat: PBRMaterial,
    headMat: PBRMaterial,
    tailMat: PBRMaterial,
    trimMat: PBRMaterial,
    idx: number
  ): TransformNode {
    const root = new TransformNode(`npcCar_${idx}`, this.scene)

    const body: Mesh[] = []
    const glass: Mesh[] = []
    const wheels: Mesh[] = []
    const heads: Mesh[] = []
    const tails: Mesh[] = []
    const trim: Mesh[] = []
    let pid = 0

    const box = (arr: Mesh[], w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = MeshBuilder.CreateBox(`np_${idx}_${pid++}`, { width: w, height: h, depth: d }, this.scene)
      m.position = new Vector3(x, y, z)
      arr.push(m)
    }
    const wheel = (x: number, z: number, dia: number) => {
      const m = MeshBuilder.CreateCylinder(`nw_${idx}_${pid++}`, { diameter: dia, height: 0.42, tessellation: 10 }, this.scene)
      m.rotation.z = Math.PI / 2
      m.position = new Vector3(x, dia / 2, z)
      wheels.push(m)
    }
    const headlights = (x: number, z: number) => [x, -x].forEach((hx) => box(heads, 0.36, 0.24, 0.12, hx, 0.6, z))
    const taillights = (x: number, z: number) => [x, -x].forEach((tx) => box(tails, 0.42, 0.28, 0.12, tx, 0.6, z))

    switch (type) {
      case 'sedan': {
        box(body, 1.9, 0.55, 4.5, 0, 0.5, 0)
        box(glass, 1.74, 0.62, 2.0, 0, 1.02, -0.15)
        box(body, 1.82, 0.12, 1.75, 0, 1.4, -0.15)
        box(trim, 1.92, 0.22, 0.4, 0, 0.32, 2.2)
        box(trim, 1.92, 0.22, 0.4, 0, 0.32, -2.2)
        headlights(0.62, 2.27)
        taillights(0.7, -2.27)
        wheel(0.92, 1.45, 0.72); wheel(-0.92, 1.45, 0.72); wheel(0.92, -1.45, 0.72); wheel(-0.92, -1.45, 0.72)
        break
      }
      case 'hatchback': {
        box(body, 1.84, 0.55, 4.0, 0, 0.5, 0)
        box(glass, 1.7, 0.64, 2.2, 0, 1.0, -0.2)
        box(body, 1.78, 0.12, 2.0, 0, 1.38, -0.25)
        box(trim, 1.86, 0.22, 0.35, 0, 0.32, 1.95)
        box(trim, 1.86, 0.22, 0.35, 0, 0.32, -1.95)
        headlights(0.58, 2.0)
        taillights(0.66, -2.0)
        wheel(0.9, 1.3, 0.7); wheel(-0.9, 1.3, 0.7); wheel(0.9, -1.3, 0.7); wheel(-0.9, -1.3, 0.7)
        break
      }
      case 'suv': {
        box(body, 2.0, 0.85, 4.9, 0, 0.62, 0)
        box(glass, 1.85, 0.72, 2.3, 0, 1.32, -0.1)
        box(body, 1.95, 0.14, 2.4, 0, 1.75, -0.1)
        box(body, 0.08, 0.1, 1.8, 0.82, 1.86, -0.1) // roof rails
        box(body, 0.08, 0.1, 1.8, -0.82, 1.86, -0.1)
        box(trim, 2.02, 0.3, 0.4, 0, 0.4, 2.4)
        box(trim, 2.02, 0.3, 0.4, 0, 0.4, -2.4)
        headlights(0.7, 2.47)
        taillights(0.78, -2.47)
        wheel(0.95, 1.6, 0.86); wheel(-0.95, 1.6, 0.86); wheel(0.95, -1.6, 0.86); wheel(-0.95, -1.6, 0.86)
        break
      }
      case 'van': {
        box(body, 2.0, 1.5, 5.3, 0, 0.95, 0)
        box(glass, 1.86, 0.55, 0.9, 0, 1.45, 2.0) // windshield
        box(glass, 0.08, 0.5, 2.6, 0.98, 1.45, 0.2) // side glass
        box(glass, 0.08, 0.5, 2.6, -0.98, 1.45, 0.2)
        box(trim, 2.02, 0.3, 0.4, 0, 0.45, 2.62)
        box(trim, 2.02, 0.3, 0.4, 0, 0.45, -2.62)
        headlights(0.72, 2.65)
        taillights(0.8, -2.65)
        wheel(0.95, 1.7, 0.8); wheel(-0.95, 1.7, 0.8); wheel(0.95, -1.7, 0.8); wheel(-0.95, -1.7, 0.8)
        break
      }
      case 'bus': {
        box(body, 2.5, 2.0, 9.4, 0, 1.25, 0)
        box(glass, 0.08, 0.7, 8.2, 1.23, 1.7, 0) // side window strips
        box(glass, 0.08, 0.7, 8.2, -1.23, 1.7, 0)
        box(glass, 2.3, 0.85, 0.1, 0, 1.7, 4.66) // windshield
        box(trim, 2.52, 0.4, 0.4, 0, 0.5, 4.65)
        box(trim, 2.52, 0.4, 0.4, 0, 0.5, -4.65)
        headlights(0.85, 4.68)
        taillights(0.95, -4.68)
        wheel(1.18, 3.3, 0.96); wheel(-1.18, 3.3, 0.96)
        wheel(1.18, -2.6, 0.96); wheel(-1.18, -2.6, 0.96)
        wheel(1.18, -3.75, 0.96); wheel(-1.18, -3.75, 0.96)
        break
      }
      case 'truck':
      default: {
        // Coloured cab up front, grey cargo box behind — recentred on the root
        // (body spans z ±3.8) so the symmetric collider has no phantom volume.
        box(body, 2.3, 1.7, 2.4, 0, 1.0, 2.6)
        box(glass, 2.1, 0.7, 0.1, 0, 1.45, 3.76) // windshield
        box(glass, 0.08, 0.6, 1.6, 1.13, 1.45, 2.6) // cab sides
        box(glass, 0.08, 0.6, 1.6, -1.13, 1.45, 2.6)
        box(trim, 2.4, 2.1, 5.2, 0, 1.4, -1.2) // cargo box
        box(trim, 2.42, 0.32, 0.35, 0, 0.42, 3.92) // bumper
        headlights(0.8, 3.85)
        taillights(0.9, -3.8)
        wheel(1.12, 2.6, 0.96); wheel(-1.12, 2.6, 0.96)
        wheel(1.12, -2.0, 0.96); wheel(-1.12, -2.0, 0.96)
        wheel(1.12, -3.2, 0.96); wheel(-1.12, -3.2, 0.96)
        break
      }
    }

    const mergeTo = (arr: Mesh[], name: string, mat: PBRMaterial) => {
      if (arr.length === 0) return
      const m = Mesh.MergeMeshes(arr, true, true, undefined, false, false)
      if (m) {
        m.name = `${name}_${idx}`
        m.material = mat
        m.isPickable = false
        m.parent = root
      }
    }
    mergeTo(body, 'npcBody', bodyMat)
    mergeTo(glass, 'npcGlass', glassMat)
    mergeTo(wheels, 'npcWheels', wheelMat)
    mergeTo(heads, 'npcHead', headMat)
    mergeTo(tails, 'npcTail', tailMat)
    mergeTo(trim, 'npcTrim', trimMat)

    return root
  }

  /** Nearest obstacle ahead of (sx,sz) along (ex,ez) within the lane. */
  private nearestAhead(
    sx: number,
    sz: number,
    ex: number,
    ez: number,
    obstacles: Obstacle[],
    minFwd: number,
    maxFwd: number,
    excludeCar: NpcCar | null,
    excludePlayer: boolean,
    selfHalfLength: number
  ): { gap: number; ob: Obstacle | null } {
    const perpX = ez
    const perpZ = -ex
    let minGap = Infinity
    let nearest: Obstacle | null = null
    for (const o of obstacles) {
      if (o.self === null && excludePlayer) continue
      if (o.self !== null && o.self === excludeCar) continue
      const dx = o.x - sx
      const dz = o.z - sz
      const fwd = dx * ex + dz * ez
      if (fwd < minFwd || fwd > maxFwd) continue
      const lat = dx * perpX + dz * perpZ
      if (Math.abs(lat) > LANE_HALF + o.r) continue
      const gap = fwd - o.r - selfHalfLength
      if (gap < minGap) {
        minGap = gap
        nearest = o
      }
    }
    return { gap: minGap, ob: nearest }
  }

  /**
   * Advance all NPCs one frame.
   * @param player player car position (or null) — treated as a hard obstacle.
   * @param playerRadius collision radius to keep clear of the player.
   */
  /** Return lightweight snapshots of all NPC cars for the sound system. */
  getSnapshots(): NpcSnapshot[] {
    return this.cars.map((c, i) => ({
      id: i,
      x: c.x,
      z: c.z,
      heading: c.heading,
      speed: c.speed,
      toNode: c.toNode,
    }))
  }

  update(
    dt: number,
    player: { x: number; z: number } | null,
    playerRadius: number,
    trafficStop?: (x: number, z: number, fx: number, fz: number) => number,
    speedBumpLimit?: (x: number, z: number, fx: number, fz: number) => number
  ): void {
    const nodes = this.grid.nodes

    this.lastCollisionIds.clear()

    const obstacles: Obstacle[] = []
    if (player) obstacles.push({ x: player.x, z: player.z, r: playerRadius, self: null })
    for (const c of this.cars) obstacles.push({ x: c.x, z: c.z, r: c.radius, self: c })

    // Detect which NPC cars overlap the player (collision) using each car's
    // oriented box — accurate for long vehicles like buses/trucks.
    if (player) {
      for (let i = 0; i < this.cars.length; i++) {
        const c = this.cars[i]
        const dx = player.x - c.x
        const dz = player.z - c.z
        const fwd = Math.abs(dx * Math.sin(c.heading) + dz * Math.cos(c.heading))
        const lat = Math.abs(dx * Math.cos(c.heading) - dz * Math.sin(c.heading))
        if (fwd < c.halfLength + playerRadius && lat < c.halfWidth + playerRadius) {
          this.lastCollisionIds.add(i)
        }
      }
    }

    const edgeLen = this.grid.cellSize

    for (const car of this.cars) {
      const from = nodes[car.fromNode]
      const to = nodes[car.toNode]
      let edx = to.x - from.x
      let edz = to.z - from.z
      const elen = Math.hypot(edx, edz) || edgeLen
      edx /= elen
      edz /= elen
      const leftPerpX = -edz
      const leftPerpZ = edx
      // Carrot arc-length along this edge. Advanced monotonically at the bottom of
      // the loop so the route always progresses — the car can never orbit a node.
      const s = car.progress * elen

      // --- Overtake lane state ---
      const overtaking = car.overtakeTime > 0
      if (overtaking) {
        car.overtakeTime -= dt
        car.targetLaneOffset = -OVERTAKE_OFFSET
        if (car.overtakeTime <= 0) {
          car.targetLaneOffset = LANE_OFFSET
          car.blockedTime = 0
          car.overtakeCar = null
          car.overtakePlayer = false
        }
      } else {
        car.targetLaneOffset = LANE_OFFSET
      }
      const dlo = car.targetLaneOffset - car.laneOffset
      const maxDlo = LANE_CHANGE_RATE * dt
      car.laneOffset += Math.max(-maxDlo, Math.min(maxDlo, dlo))

      // --- Look-ahead target: a point LOOKAHEAD metres along the route, in-lane ---
      let tx: number
      let tz: number
      const aheadS = s + LOOKAHEAD
      if (aheadS <= elen) {
        tx = from.x + edx * aheadS + leftPerpX * car.laneOffset
        tz = from.z + edz * aheadS + leftPerpZ * car.laneOffset
      } else {
        // Spill onto the next edge so the target flows smoothly around the corner.
        const nx = nodes[car.toNode]
        const nn = nodes[car.nextNode]
        let ndx = nn.x - nx.x
        let ndz = nn.z - nx.z
        const nlen = Math.hypot(ndx, ndz) || 1
        ndx /= nlen
        ndz /= nlen
        const over = Math.min(aheadS - elen, nlen)
        tx = nx.x + ndx * over + -ndz * car.laneOffset
        tz = nx.z + ndz * over + ndx * car.laneOffset
      }

      let alpha = Math.atan2(tx - car.x, tz - car.z) - car.heading
      while (alpha > Math.PI) alpha -= 2 * Math.PI
      while (alpha < -Math.PI) alpha += 2 * Math.PI

      // --- Sense ahead (ignore the car we're actively overtaking) ---
      const fx = Math.sin(car.heading)
      const fz = Math.cos(car.heading)
      const sense = this.nearestAhead(
        car.x,
        car.z,
        fx,
        fz,
        obstacles,
        0.2,
        SENSE_DIST,
        overtaking ? car.overtakeCar : car,
        overtaking ? car.overtakePlayer : false,
        car.halfLength
      )

      // --- Decide to start an overtake ---
      if (!overtaking) {
        if (sense.ob && sense.gap < 6 && car.speed < 2.5) {
          car.blockedTime += dt
        } else {
          car.blockedTime = Math.max(0, car.blockedTime - dt * 2)
        }
        if (car.blockedTime > OVERTAKE_DELAY && sense.ob) {
          const rightX = car.x + edz * (OVERTAKE_OFFSET + LANE_OFFSET)
          const rightZ = car.z - edx * (OVERTAKE_OFFSET + LANE_OFFSET)
          const laneCheck = this.nearestAhead(rightX, rightZ, fx, fz, obstacles, -6, 14, car, false, car.halfLength)
          if (laneCheck.gap >= 9) {
            car.overtakeTime = OVERTAKE_DURATION
            car.overtakeCar = sense.ob.self
            car.overtakePlayer = sense.ob.self === null
          } else {
            car.blockedTime = OVERTAKE_DELAY * 0.5
          }
        }
      }

      // --- Desired speed: cruise, slowed for corners and traffic ---
      const turnCap =
        CORNER_SPEED + (car.cruise - CORNER_SPEED) * (1 - Math.min(1, Math.abs(alpha) / CORNER_ALPHA))
      let desired = Math.min(car.cruise, turnCap)
      if (sense.gap < SENSE_DIST) {
        const gapSpeed = sense.gap <= STOP_GAP ? 0 : (sense.gap - STOP_GAP) * GAP_SPEED_K
        desired = Math.min(desired, gapSpeed)
      }
      // Obey red lights: brake to a stop at the stop line ahead.
      if (trafficStop) {
        const stop = trafficStop(car.x, car.z, fx, fz)
        if (stop !== Infinity && stop >= 0) {
          const stopSpeed = stop <= 1.5 ? 0 : (stop - 1.5) * GAP_SPEED_K
          desired = Math.min(desired, stopSpeed)
        }
      }
      // Slow for speed bumps.
      if (speedBumpLimit) {
        const bumpSpd = speedBumpLimit(car.x, car.z, fx, fz)
        if (bumpSpd !== Infinity) desired = Math.min(desired, bumpSpd)
      }

      // --- Integrate speed ---
      const dv = desired - car.speed
      car.speed += Math.max(-BRAKE * dt, Math.min(ACCEL * dt, dv))
      if (car.speed < 0) car.speed = 0

      // --- Steer toward the look-ahead point, rate-limited (turning radius) ---
      const maxYaw = Math.min(MAX_YAW, Math.max(MIN_YAW, car.speed * YAW_PER_SPEED))
      car.heading += Math.max(-maxYaw * dt, Math.min(maxYaw * dt, alpha))

      // --- Move ---
      car.x += Math.sin(car.heading) * car.speed * dt
      car.z += Math.cos(car.heading) * car.speed * dt

      // --- Advance the carrot (monotonic → node always steps forward) ---
      car.progress += (car.speed * dt) / elen
      let guard = 0
      while (car.progress >= 1 && guard++ < 4) {
        car.progress -= 1
        car.fromNode = car.toNode
        car.toNode = car.nextNode
        car.nextNode = this.pickNext(car.toNode, car.fromNode)
      }

      car.root.position.x = car.x
      car.root.position.z = car.z
      car.root.rotation.y = car.heading
    }
  }

  /** One axis-aligned box per car for this frame (tight AABB of the oriented car). */
  getColliders(): AABB[] {
    return this.cars.map((car) => {
      const s = Math.abs(Math.sin(car.heading))
      const c = Math.abs(Math.cos(car.heading))
      const halfX = car.halfLength * s + car.halfWidth * c
      const halfZ = car.halfLength * c + car.halfWidth * s
      return {
        min: new Vector3(car.x - halfX, 0, car.z - halfZ),
        max: new Vector3(car.x + halfX, 2.5, car.z + halfZ),
      }
    })
  }

  dispose(): void {
    this.cars.forEach((car) => car.root.dispose())
    this.materials.forEach((m) => m.dispose())
    this.cars = []
    this.materials = []
  }
}
