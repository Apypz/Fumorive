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
  Vector3,
  Color3,
  PBRMaterial,
} from '@babylonjs/core'
import type { NgawiGrid } from '../components/NgawiCityGenerator'
import { makeRng, randFloat } from '../utils/prng'

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

// --- Car geometry ---
const NPC_SCALE = 1.35 // uniform scale of the whole car model
const CAR_HALF_LENGTH = 2.45 * NPC_SCALE
const CAR_HALF_WIDTH = 1.05 * NPC_SCALE
const NPC_RADIUS = 1.7 * NPC_SCALE

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

      const root = this.buildCar(bodyMats[i % bodyMats.length], wheelMat, glassMat, headMat, tailMat, i)
      root.position = new Vector3(x, 0, z)
      root.rotation.y = heading

      // Wide spread so some cars are clearly slow and others fast.
      const cruise = randFloat(this.rng, 6, 15)
      this.cars.push({
        root,
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

  private buildCar(
    bodyMat: PBRMaterial,
    wheelMat: PBRMaterial,
    glassMat: PBRMaterial,
    headMat: PBRMaterial,
    tailMat: PBRMaterial,
    idx: number
  ): TransformNode {
    const root = new TransformNode(`npcCar_${idx}`, this.scene)
    root.scaling = new Vector3(NPC_SCALE, NPC_SCALE, NPC_SCALE)

    // Lower body (forward = +Z).
    const body = MeshBuilder.CreateBox(`npcBody_${idx}`, { width: 2.1, height: 0.6, depth: 4.8 }, this.scene)
    body.position.y = 0.5
    body.material = bodyMat
    body.parent = root

    // Glass cabin.
    const cabin = MeshBuilder.CreateBox(`npcCabin_${idx}`, { width: 1.85, height: 0.7, depth: 2.4 }, this.scene)
    cabin.position = new Vector3(0, 1.15, -0.15)
    cabin.material = glassMat
    cabin.parent = root

    // Body-coloured roof cap on top of the glass.
    const roof = MeshBuilder.CreateBox(`npcRoof_${idx}`, { width: 1.9, height: 0.14, depth: 2.05 }, this.scene)
    roof.position = new Vector3(0, 1.53, -0.15)
    roof.material = bodyMat
    roof.parent = root

    // Wheels.
    const wheelSpots = [
      { x: 0.97, z: 1.55 },
      { x: -0.97, z: 1.55 },
      { x: 0.97, z: -1.55 },
      { x: -0.97, z: -1.55 },
    ]
    wheelSpots.forEach((w, j) => {
      const wheel = MeshBuilder.CreateCylinder(
        `npcWheel_${idx}_${j}`,
        { diameter: 0.92, height: 0.4, tessellation: 10 },
        this.scene
      )
      wheel.rotation.z = Math.PI / 2
      wheel.position = new Vector3(w.x, 0.44, w.z)
      wheel.material = wheelMat
      wheel.parent = root
    })

    // Headlights (front).
    ;[0.72, -0.72].forEach((hx, j) => {
      const hl = MeshBuilder.CreateBox(`npcHL_${idx}_${j}`, { width: 0.36, height: 0.26, depth: 0.12 }, this.scene)
      hl.position = new Vector3(hx, 0.58, 2.42)
      hl.material = headMat
      hl.parent = root
    })

    // Taillights (rear).
    ;[0.78, -0.78].forEach((tx, j) => {
      const tl = MeshBuilder.CreateBox(`npcTL_${idx}_${j}`, { width: 0.42, height: 0.3, depth: 0.12 }, this.scene)
      tl.position = new Vector3(tx, 0.58, -2.42)
      tl.material = tailMat
      tl.parent = root
    })

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
    excludePlayer: boolean
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
      const gap = fwd - o.r - CAR_HALF_LENGTH
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
  update(
    dt: number,
    player: { x: number; z: number } | null,
    playerRadius: number,
    trafficStop?: (x: number, z: number, fx: number, fz: number) => number
  ): void {
    const nodes = this.grid.nodes

    const obstacles: Obstacle[] = []
    if (player) obstacles.push({ x: player.x, z: player.z, r: playerRadius, self: null })
    for (const c of this.cars) obstacles.push({ x: c.x, z: c.z, r: NPC_RADIUS, self: c })

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
        overtaking ? car.overtakePlayer : false
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
          const laneCheck = this.nearestAhead(rightX, rightZ, fx, fz, obstacles, -6, 14, car, false)
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
      const halfX = CAR_HALF_LENGTH * s + CAR_HALF_WIDTH * c
      const halfZ = CAR_HALF_LENGTH * c + CAR_HALF_WIDTH * s
      return {
        min: new Vector3(car.x - halfX, 0, car.z - halfZ),
        max: new Vector3(car.x + halfX, 2, car.z + halfZ),
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
