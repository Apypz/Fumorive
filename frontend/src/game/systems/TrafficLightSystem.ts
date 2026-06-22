/**
 * TrafficLightSystem
 * ==================
 * 2-phase traffic lights at selected Ngawi City intersections.
 *
 * - Each light cycles NS-green → NS-yellow → EW-green → EW-yellow (NS and EW are
 *   complementary), with a staggered per-light phase offset.
 * - Each *approach* into the intersection gets its own roadside light pole facing
 *   the oncoming driver, plus a painted **stop line** on the road, so it's obvious
 *   which light governs you and where to stop. The active bulb glows brightly.
 * - Queries:
 *   - `redStopDistance(...)` → distance to a red stop line ahead → NPC cars brake.
 *   - `isRunningRed(...)` → true while a car crosses the stop line into the box on
 *     red (used to flag the player).
 */

import {
  Scene,
  MeshBuilder,
  Vector3,
  Color3,
  PBRMaterial,
  Mesh,
} from '@babylonjs/core'
import type { NgawiGrid, TrafficLightSpot } from '../components/NgawiCityGenerator'
import { makeRng } from '../utils/prng'

type Signal = 'green' | 'yellow' | 'red'

interface Bulbs {
  red: Mesh
  yellow: Mesh
  green: Mesh
}

interface ApproachLight {
  axis: 'NS' | 'EW'
  bulbs: Bulbs
}

interface TrafficLight {
  x: number
  z: number
  offset: number
  ns: Signal
  ew: Signal
  approaches: ApproachLight[]
}

const GREEN_T = 7
const YELLOW_T = 2.5
const CYCLE = 2 * GREEN_T + 2 * YELLOW_T

export class TrafficLightSystem {
  private scene: Scene
  private lights: TrafficLight[] = []
  private materials: PBRMaterial[] = []
  private bulbMeshes: Mesh[] = []
  private staticMeshes: Mesh[] = []
  private time = 0
  private playerPrevFwd: number[] = []

  /** Positions of lights that flipped from non-green → green this frame. */
  greenTransitions: Array<{ x: number; z: number }> = []

  private stopOffset: number
  private laneHalf: number
  private readonly sense = 32

  private redOn!: PBRMaterial
  private redOff!: PBRMaterial
  private yellowOn!: PBRMaterial
  private yellowOff!: PBRMaterial
  private greenOn!: PBRMaterial
  private greenOff!: PBRMaterial
  private poleMat!: PBRMaterial
  private whiteMat!: PBRMaterial

  constructor(scene: Scene, grid: NgawiGrid, spots: TrafficLightSpot[], seed: number) {
    this.scene = scene
    const roadWidth = grid.roadWidth
    this.stopOffset = roadWidth * 0.5 + 3
    this.laneHalf = roadWidth * 0.6
    this.createMaterials()

    const rng = makeRng((seed ^ 0x7f4a7c15) >>> 0)
    const poleParts: Mesh[] = []
    const stopParts: Mesh[] = []

    for (const spot of spots) {
      const node = grid.nodes[spot.nodeId]
      const offset = rng() * CYCLE
      const neighbors = Array.from(grid.adj.get(spot.nodeId) ?? [])
      const approaches: ApproachLight[] = []

      for (const nbId of neighbors) {
        const nb = grid.nodes[nbId]
        let ddx = node.x - nb.x
        let ddz = node.z - nb.z
        const dl = Math.hypot(ddx, ddz) || 1
        ddx /= dl
        ddz /= dl // driving direction (neighbour → node)
        const axis: 'NS' | 'EW' = Math.abs(ddz) > Math.abs(ddx) ? 'NS' : 'EW'

        // Stop line centre on this approach.
        const slx = node.x - ddx * this.stopOffset
        const slz = node.z - ddz * this.stopOffset

        // Overhead gantry: pole on the driver's left, arm reaching out over the
        // lane, signal head facing the oncoming driver — so it's unmistakably
        // "their" light, hanging in front of them.
        const lpx = -ddz // left of the driving direction
        const lpz = ddx
        const roadHalf = roadWidth * 0.5
        const poleX = slx + lpx * (roadHalf + 1.6)
        const poleZ = slz + lpz * (roadHalf + 1.6)
        const headX = slx + lpx * (roadWidth * 0.25) // hang over the left lane
        const headZ = slz + lpz * (roadWidth * 0.25)
        const bulbs = this.buildGantry(poleX, poleZ, headX, headZ, ddx, ddz, poleParts)
        approaches.push({ axis, bulbs })

        // Painted stop line across the lane.
        const bar = MeshBuilder.CreateBox('tl_stopline', { width: roadWidth * 0.92, height: 0.06, depth: 0.8 }, this.scene)
        bar.position = new Vector3(slx, 0.05, slz)
        bar.rotation.y = Math.atan2(ddx, ddz)
        stopParts.push(bar)
      }

      this.lights.push({ x: node.x, z: node.z, offset, ns: 'red', ew: 'red', approaches })
    }

    // Merge the static parts (poles/housings share poleMat; stop lines share whiteMat).
    if (poleParts.length > 0) {
      const m = Mesh.MergeMeshes(poleParts, true, true, undefined, false, false)
      if (m) {
        m.name = 'tl_poles_merged'
        m.material = this.poleMat
        m.receiveShadows = true
        m.freezeWorldMatrix()
        m.isPickable = false
        this.staticMeshes.push(m)
      }
    }
    if (stopParts.length > 0) {
      const m = Mesh.MergeMeshes(stopParts, true, true, undefined, false, false)
      if (m) {
        m.name = 'tl_stoplines_merged'
        m.material = this.whiteMat
        m.freezeWorldMatrix()
        m.isPickable = false
        this.staticMeshes.push(m)
      }
    }

    this.playerPrevFwd = new Array(this.lights.length).fill(Infinity)
    this.refreshAll()
  }

  private mat(name: string, albedo: Color3, emissive: Color3 | null, intensity = 2.5): PBRMaterial {
    const m = new PBRMaterial(name, this.scene)
    m.albedoColor = albedo
    m.metallic = 0
    m.roughness = 0.5
    if (emissive) {
      m.emissiveColor = emissive
      m.emissiveIntensity = intensity
    }
    this.materials.push(m)
    return m
  }

  private createMaterials(): void {
    this.redOn = this.mat('tl_redOn', new Color3(0.5, 0.02, 0.02), new Color3(1, 0.04, 0.04))
    this.redOff = this.mat('tl_redOff', new Color3(0.12, 0.02, 0.02), null)
    this.yellowOn = this.mat('tl_yellowOn', new Color3(0.5, 0.42, 0.02), new Color3(1, 0.78, 0.05))
    this.yellowOff = this.mat('tl_yellowOff', new Color3(0.12, 0.1, 0.02), null)
    this.greenOn = this.mat('tl_greenOn', new Color3(0.05, 0.5, 0.12), new Color3(0.1, 1, 0.25))
    this.greenOff = this.mat('tl_greenOff', new Color3(0.02, 0.12, 0.05), null)
    this.poleMat = this.mat('tl_pole', new Color3(0.1, 0.1, 0.12), null)
    this.whiteMat = this.mat('tl_white', new Color3(0.9, 0.9, 0.85), new Color3(0.25, 0.25, 0.22), 0.6)
  }

  private buildGantry(
    poleX: number,
    poleZ: number,
    headX: number,
    headZ: number,
    ddx: number,
    ddz: number,
    poleParts: Mesh[]
  ): Bulbs {
    const poleH = 9

    const pole = MeshBuilder.CreateCylinder('tl_pole', { diameter: 0.4, height: poleH, tessellation: 8 }, this.scene)
    pole.position = new Vector3(poleX, poleH / 2, poleZ)
    poleParts.push(pole)

    // Horizontal arm from the pole top out over the lane.
    const armY = poleH - 0.3
    const adx = headX - poleX
    const adz = headZ - poleZ
    const armLen = Math.hypot(adx, adz) || 1
    const arm = MeshBuilder.CreateBox('tl_arm', { width: 0.2, height: 0.2, depth: armLen }, this.scene)
    arm.position = new Vector3((poleX + headX) / 2, armY, (poleZ + headZ) / 2)
    arm.rotation.y = Math.atan2(adx, adz)
    poleParts.push(arm)

    // Compact signal housing hanging over the lane, facing the driver.
    const headY = armY - 1.5
    const housing = MeshBuilder.CreateBox('tl_house', { width: 0.86, height: 2.5, depth: 0.6 }, this.scene)
    housing.position = new Vector3(headX, headY, headZ)
    housing.rotation.y = Math.atan2(ddx, ddz)
    poleParts.push(housing)

    // Smaller bulbs on the driver-facing side (toward the oncoming traffic).
    const bx = headX - ddx * 0.38
    const bz = headZ - ddz * 0.38
    const bulb = (dy: number): Mesh => {
      const b = MeshBuilder.CreateSphere('tl_bulb', { diameter: 0.68, segments: 8 }, this.scene)
      b.position = new Vector3(bx, headY + dy, bz)
      b.freezeWorldMatrix()
      b.isPickable = false
      this.bulbMeshes.push(b)
      return b
    }
    return { red: bulb(0.74), yellow: bulb(0), green: bulb(-0.74) }
  }

  private phaseAt(t: number): { ns: Signal; ew: Signal } {
    const tc = ((t % CYCLE) + CYCLE) % CYCLE
    if (tc < GREEN_T) return { ns: 'green', ew: 'red' }
    if (tc < GREEN_T + YELLOW_T) return { ns: 'yellow', ew: 'red' }
    if (tc < 2 * GREEN_T + YELLOW_T) return { ns: 'red', ew: 'green' }
    return { ns: 'red', ew: 'yellow' }
  }

  private applyBulbs(bulbs: Bulbs, state: Signal): void {
    bulbs.red.material = state === 'red' ? this.redOn : this.redOff
    bulbs.yellow.material = state === 'yellow' ? this.yellowOn : this.yellowOff
    bulbs.green.material = state === 'green' ? this.greenOn : this.greenOff
  }

  private applyLight(L: TrafficLight): void {
    for (const ap of L.approaches) {
      this.applyBulbs(ap.bulbs, ap.axis === 'NS' ? L.ns : L.ew)
    }
  }

  private refreshAll(): void {
    for (const L of this.lights) {
      const p = this.phaseAt(this.time + L.offset)
      L.ns = p.ns
      L.ew = p.ew
      this.applyLight(L)
    }
  }

  /** Advance the phases; only swap bulb materials when a light's state changes. */
  update(dt: number): void {
    this.time += dt
    this.greenTransitions = []
    for (const L of this.lights) {
      const p = this.phaseAt(this.time + L.offset)
      if (p.ns !== L.ns || p.ew !== L.ew) {
        // Detect red→green transition for NS or EW
        const nsWasRed = L.ns === 'red' && p.ns === 'green'
        const ewWasRed = L.ew === 'red' && p.ew === 'green'
        L.ns = p.ns
        L.ew = p.ew
        this.applyLight(L)
        if (nsWasRed || ewWasRed) {
          this.greenTransitions.push({ x: L.x, z: L.z })
        }
      }
    }
  }

  /** Distance to the nearest RED stop line ahead (Infinity if none). */
  redStopDistance(x: number, z: number, fx: number, fz: number): number {
    const perpX = fz
    const perpZ = -fx
    const ns = Math.abs(fz) > Math.abs(fx)
    let best = Infinity
    for (const L of this.lights) {
      const state = ns ? L.ns : L.ew
      if (state !== 'red') continue
      const dx = L.x - x
      const dz = L.z - z
      const fwd = dx * fx + dz * fz
      if (fwd <= 0 || fwd > this.sense) continue
      if (Math.abs(dx * perpX + dz * perpZ) > this.laneHalf) continue
      const stop = fwd - this.stopOffset
      if (stop < best) best = stop
    }
    return best
  }

  /**
   * Stateful: call every frame with the player's pose. Returns true only on the
   * frame the player crosses a RED light's stop line *entering* the intersection,
   * judged by the approach direction at that instant. Entering on green and then
   * turning inside the box never triggers it (no fresh inbound crossing happens),
   * which fixes false flags from the perpendicular light being red.
   */
  playerCrossedRed(x: number, z: number, fx: number, fz: number): boolean {
    const perpX = fz
    const perpZ = -fx
    const ns = Math.abs(fz) > Math.abs(fx)
    let crossed = false
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i]
      const dx = L.x - x
      const dz = L.z - z
      const fwd = dx * fx + dz * fz
      const prev = this.playerPrevFwd[i]
      this.playerPrevFwd[i] = fwd
      if (prev === Infinity) continue
      // Crossed the stop line inbound this frame, aligned with this approach?
      if (
        prev > this.stopOffset &&
        fwd <= this.stopOffset &&
        Math.abs(dx * perpX + dz * perpZ) < this.laneHalf
      ) {
        const state = ns ? L.ns : L.ew
        if (state === 'red') crossed = true
      }
    }
    return crossed
  }

  /**
   * State of the light governing the approach of a car at (x,z) heading (fx,fz)
   * — i.e. the nearest light ahead in the same lane — or null if none is near.
   * Used to drive a HUD indicator so the player knows which light is theirs.
   */
  approachingState(x: number, z: number, fx: number, fz: number): Signal | null {
    const perpX = fz
    const perpZ = -fx
    const ns = Math.abs(fz) > Math.abs(fx)
    let bestDist = Infinity
    let bestState: Signal | null = null
    for (const L of this.lights) {
      const dx = L.x - x
      const dz = L.z - z
      const fwd = dx * fx + dz * fz
      if (fwd < -2 || fwd > this.sense) continue
      if (Math.abs(dx * perpX + dz * perpZ) > this.laneHalf) continue
      if (fwd < bestDist) {
        bestDist = fwd
        bestState = ns ? L.ns : L.ew
      }
    }
    return bestState
  }

  dispose(): void {
    this.bulbMeshes.forEach((m) => m.dispose())
    this.staticMeshes.forEach((m) => m.dispose())
    this.materials.forEach((m) => m.dispose())
    this.bulbMeshes = []
    this.staticMeshes = []
    this.materials = []
    this.lights = []
  }
}
