/**
 * NpcTrafficSystem
 * ================
 * A handful of script-built NPC cars that drive around the procedural Ngawi City
 * road grid.
 *
 * - Models are built from primitives (no GLB): a body box, a glass cabin and four
 *   cylinder wheels, parented to a root node so the whole car moves as one.
 * - Each car follows the road network by walking the grid graph edge-by-edge.
 * - Every frame it exposes an oriented-bounding-box AABB per car. DemoScene feeds
 *   those to SimpleMap.setDynamicColliders, so the player physically collides with
 *   them and the existing collision → violation pipeline fires (a "collision"
 *   penalty). Because impact is measured from the PLAYER's closing speed, you are
 *   only penalised when you drive into a car, not when one bumps a parked player.
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

interface NpcCar {
  root: TransformNode
  fromNode: number
  toNode: number
  progress: number // 0..1 along the current edge
  speed: number // world units per second
}

// Half-extents of the car body: length is along local +Z (forward), width along X.
const CAR_HALF_LENGTH = 2.1
const CAR_HALF_WIDTH = 0.95

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

  private spawn(count: number, avoidNodeId?: number): void {
    const bodyColors = [
      new Color3(0.85, 0.2, 0.2), // red
      new Color3(0.2, 0.45, 0.85), // blue
      new Color3(0.9, 0.75, 0.15), // yellow
      new Color3(0.2, 0.7, 0.35), // green
      new Color3(0.92, 0.92, 0.94), // white
      new Color3(0.88, 0.45, 0.1), // orange
    ]
    // Shared materials — created once, reused across every car.
    const bodyMats = bodyColors.map((c, i) => this.makeMaterial(`npcBody_${i}`, c, 0.35, 0.45))
    const wheelMat = this.makeMaterial('npcWheel', new Color3(0.05, 0.05, 0.06), 0.1, 0.8)
    const glassMat = this.makeMaterial('npcGlass', new Color3(0.1, 0.13, 0.2), 0.25, 0.2)

    // Candidate spawn nodes: real road nodes, excluding the player's spawn node.
    const candidates = this.grid.nodes.filter(
      (n) => (this.grid.adj.get(n.id)?.size ?? 0) > 0 && n.id !== avoidNodeId
    )

    for (let i = 0; i < count; i++) {
      if (candidates.length === 0) break
      const start = candidates[Math.floor(this.rng() * candidates.length)]
      const neighbors = Array.from(this.grid.adj.get(start.id) ?? [])
      if (neighbors.length === 0) continue
      const to = neighbors[Math.floor(this.rng() * neighbors.length)]

      const root = this.buildCar(bodyMats[i % bodyMats.length], wheelMat, glassMat, i)
      root.position = new Vector3(start.x, 0, start.z)

      this.cars.push({
        root,
        fromNode: start.id,
        toNode: to,
        progress: this.rng() * 0.5, // stagger so cars don't clump at spawn
        speed: randFloat(this.rng, 9, 15),
      })
    }
  }

  private buildCar(
    bodyMat: PBRMaterial,
    wheelMat: PBRMaterial,
    glassMat: PBRMaterial,
    idx: number
  ): TransformNode {
    const root = new TransformNode(`npcCar_${idx}`, this.scene)

    // Body — length along +Z (the car's forward axis).
    const body = MeshBuilder.CreateBox(`npcBody_${idx}`, { width: 1.7, height: 0.7, depth: 4 }, this.scene)
    body.position.y = 0.5
    body.material = bodyMat
    body.parent = root

    // Cabin / windows.
    const cabin = MeshBuilder.CreateBox(`npcCabin_${idx}`, { width: 1.5, height: 0.6, depth: 1.9 }, this.scene)
    cabin.position = new Vector3(0, 1.05, -0.1)
    cabin.material = glassMat
    cabin.parent = root

    // Four wheels — cylinders laid on their side (axis along X).
    const wheelSpots = [
      { x: 0.85, z: 1.25 },
      { x: -0.85, z: 1.25 },
      { x: 0.85, z: -1.25 },
      { x: -0.85, z: -1.25 },
    ]
    wheelSpots.forEach((w, j) => {
      const wheel = MeshBuilder.CreateCylinder(
        `npcWheel_${idx}_${j}`,
        { diameter: 0.7, height: 0.3, tessellation: 8 },
        this.scene
      )
      wheel.rotation.z = Math.PI / 2
      wheel.position = new Vector3(w.x, 0.35, w.z)
      wheel.material = wheelMat
      wheel.parent = root
    })

    return root
  }

  /** Move every NPC along the road grid. Call once per frame. */
  update(dt: number): void {
    const edgeLen = this.grid.cellSize
    const nodes = this.grid.nodes

    for (const car of this.cars) {
      car.progress += (car.speed * dt) / edgeLen

      // Cross one or more intersections if we overshot this edge.
      let guard = 0
      while (car.progress >= 1 && guard++ < 8) {
        car.progress -= 1
        const prev = car.fromNode
        car.fromNode = car.toNode
        const neighbors = Array.from(this.grid.adj.get(car.fromNode) ?? [])
        if (neighbors.length === 0) {
          car.toNode = prev
          car.progress = 0
          break
        }
        // Prefer to keep going rather than U-turn, unless it's a dead end.
        const forward = neighbors.filter((n) => n !== prev)
        const choices = forward.length > 0 ? forward : neighbors
        car.toNode = choices[Math.floor(this.rng() * choices.length)]
      }

      const from = nodes[car.fromNode]
      const to = nodes[car.toNode]
      const dx = to.x - from.x
      const dz = to.z - from.z
      car.root.position.x = from.x + dx * car.progress
      car.root.position.z = from.z + dz * car.progress
      car.root.rotation.y = Math.atan2(dx, dz)
    }
  }

  /**
   * One axis-aligned box per car for this frame. The body is rotated, so we
   * compute the tight AABB of the oriented box from the heading.
   */
  getColliders(): AABB[] {
    return this.cars.map((car) => {
      const p = car.root.position
      const h = car.root.rotation.y
      const s = Math.abs(Math.sin(h))
      const c = Math.abs(Math.cos(h))
      const halfX = CAR_HALF_LENGTH * s + CAR_HALF_WIDTH * c
      const halfZ = CAR_HALF_LENGTH * c + CAR_HALF_WIDTH * s
      return {
        min: new Vector3(p.x - halfX, 0, p.z - halfZ),
        max: new Vector3(p.x + halfX, 2, p.z + halfZ),
      }
    })
  }

  dispose(): void {
    // Disposing each root cascades to its child meshes.
    this.cars.forEach((car) => car.root.dispose())
    this.materials.forEach((m) => m.dispose())
    this.cars = []
    this.materials = []
  }
}
