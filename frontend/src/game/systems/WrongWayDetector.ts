/**
 * WrongWayDetector
 * ================
 * Detects when a car is driving against traffic on a road segment.
 * 
 * Indonesia uses LEFT-HAND TRAFFIC (jalur kiri):
 * - Vehicles drive on the LEFT side of the road
 * - For E-W roads: left side when heading East = North half (higher Z)
 * - For N-S roads: left side when heading North = West half (lower X)
 * 
 * Lane rules (left-hand traffic):
 * ┌─────────────────────────────────┐
 * │  E-W Road:                       │
 * │  Z > center → Eastbound  (+X)    │
 * │  Z < center → Westbound  (-X)    │
 * │                                   │
 * │  N-S Road:                        │
 * │  X < center → Northbound (+Z)    │
 * │  X > center → Southbound (-Z)    │
 * └─────────────────────────────────┘
 */

import { Vector3 } from '@babylonjs/core'

interface RoadSegment {
  name: string
  centerX: number
  centerZ: number
  halfWidth: number   // half extent in X
  halfHeight: number  // half extent in Z
  orientation: 'EW' | 'NS'
}

// Junction zones where wrong-way detection should be paused
interface JunctionZone {
  x: number
  z: number
  radius: number
}

export class WrongWayDetector {
  private roads: RoadSegment[] = []
  private junctions: JunctionZone[] = []

  // State
  private _isWrongWay: boolean = false
  private wrongWayTimer: number = 0
  private correctWayTimer: number = 0

  // Thresholds
  private readonly WRONG_WAY_CONFIRM_TIME = 1.5   // seconds driving wrong way before flagging
  private readonly CORRECT_WAY_RESET_TIME = 1.0    // seconds driving correct to clear flag
  private readonly MIN_SPEED_CHECK = 3.0            // m/s (~11 km/h) - don't check when slow/stopped
  private readonly HEADING_TOLERANCE = 0.6          // ~34° tolerance for heading angle (cosine threshold)

  constructor() {
    this.initSoloCityRoads()
    this.initJunctions()
  }

  /**
   * Register all Solo City road segments
   */
  private initSoloCityRoads(): void {
    // === CENTRAL DISTRICT ===
    // Horizontal roads (E-W)
    this.addRoad('road_top',       -40, 150, 90, 8, 'EW')
    this.addRoad('road_mid',         5,  50, 90, 8, 'EW')
    this.addRoad('road_lower',     -10, -50, 60, 8, 'EW')
    this.addRoad('road_to_H',     135, -100, 35, 8, 'EW')
    this.addRoad('road_south_H',  110, -178, 65, 8, 'EW')

    // Vertical roads (N-S)
    this.addRoad('road_center_v',   50,  -10, 8, 170, 'NS')
    this.addRoad('road_left_v',    -80,   50, 8, 100, 'NS')
    this.addRoad('road_right_v',    90,  -27, 8,  85, 'NS')
    this.addRoad('road_gedungH_e', 170, -139, 8,  47, 'NS')

    // === RING ROAD ===
    this.addRoad('ring_north',       2,  310, 282, 10, 'EW')
    this.addRoad('ring_south',       2, -506, 282, 10, 'EW')
    this.addRoad('ring_east',      290, -100,  10, 400, 'NS')
    this.addRoad('ring_west',     -286, -100,  10, 400, 'NS')

    // === RADIAL ROADS ===
    this.addRoad('radial_north',    50,  240, 8, 90, 'NS')
    this.addRoad('radial_south',    50, -343, 8, 163, 'NS')
    this.addRoad('radial_east',    190, -100, 100, 8, 'EW')
    this.addRoad('radial_west',   -183,   50, 103, 8, 'EW')
  }

  /**
   * Register junction zones (wrong-way detection paused here)
   */
  private initJunctions(): void {
    // Central district junctions
    const junctionCoords = [
      [-80, 150], [50, 150], [-80, 50], [50, 50],
      [-80, -50], [50, -50], [90, -100], [170, -100],
      [170, -178], [50, -178],
      // Ring-radial intersections
      [50, 310], [50, -506], [290, -100], [-286, 50],
      // Ring corners
      [290, 310], [-286, 310], [290, -506], [-286, -506],
    ]

    for (const [x, z] of junctionCoords) {
      this.junctions.push({ x, z, radius: 12 }) // 12m radius around junctions
    }
  }

  private addRoad(
    name: string,
    centerX: number, centerZ: number,
    halfWidth: number, halfHeight: number,
    orientation: 'EW' | 'NS'
  ): void {
    this.roads.push({ name, centerX, centerZ, halfWidth, halfHeight, orientation })
  }

  /**
   * Check if a position is inside a junction zone
   */
  private isInJunction(x: number, z: number): boolean {
    for (const j of this.junctions) {
      const dx = x - j.x
      const dz = z - j.z
      if (dx * dx + dz * dz < j.radius * j.radius) {
        return true
      }
    }
    return false
  }

  /**
   * Find which road segment the car is on
   */
  private findRoad(x: number, z: number): RoadSegment | null {
    for (const road of this.roads) {
      const inX = x >= road.centerX - road.halfWidth && x <= road.centerX + road.halfWidth
      const inZ = z >= road.centerZ - road.halfHeight && z <= road.centerZ + road.halfHeight
      if (inX && inZ) {
        return road
      }
    }
    return null
  }

  /**
   * Check if driving the wrong way based on position and heading.
   * 
   * Left-hand traffic rules:
   * - E-W road, Z > center → should be heading East  (heading component +X)
   * - E-W road, Z < center → should be heading West  (heading component -X)
   * - N-S road, X < center → should be heading North (heading component +Z)
   * - N-S road, X > center → should be heading South (heading component -Z)
   *
   * @param heading Car heading angle (radians, BabylonJS convention)
   *   heading=0 → +Z (North), heading=π/2 → +X (East)
   * @returns true if driving wrong way right now (before timer smoothing)
   */
  private checkWrongWayInstant(
    posX: number, posZ: number,
    heading: number
  ): boolean {
    // Skip if in junction (turning area)
    if (this.isInJunction(posX, posZ)) {
      return false
    }

    const road = this.findRoad(posX, posZ)
    if (!road) {
      return false // Not on a road - can't determine wrong way
    }

    // Car's forward direction from heading
    // BabylonJS: heading=0 → forward=(0,0,1)=+Z, heading=π/2 → forward=(1,0,0)=+X
    const forwardX = Math.sin(heading)
    const forwardZ = Math.cos(heading)

    if (road.orientation === 'EW') {
      // E-W road: check X component of heading
      const offsetZ = posZ - road.centerZ

      if (Math.abs(offsetZ) < 1.5) {
        // Too close to center line - ambiguous, skip
        return false
      }

      if (offsetZ > 0) {
        // North half (Z > center) → should go East (+X)
        // Wrong if heading has significant -X component
        return forwardX < -this.HEADING_TOLERANCE
      } else {
        // South half (Z < center) → should go West (-X)
        // Wrong if heading has significant +X component
        return forwardX > this.HEADING_TOLERANCE
      }
    } else {
      // N-S road: check Z component of heading
      const offsetX = posX - road.centerX

      if (Math.abs(offsetX) < 1.5) {
        // Too close to center line - ambiguous, skip
        return false
      }

      if (offsetX < 0) {
        // West half (X < center) → should go North (+Z)
        // Wrong if heading has significant -Z component
        return forwardZ < -this.HEADING_TOLERANCE
      } else {
        // East half (X > center) → should go South (-Z)
        // Wrong if heading has significant +Z component
        return forwardZ > this.HEADING_TOLERANCE
      }
    }
  }

  /**
   * Update wrong-way detection state (call each frame)
   * 
   * Uses a timer-based smoothing to avoid flickering:
   * - Must drive wrong way for WRONG_WAY_CONFIRM_TIME to trigger
   * - Must drive correct for CORRECT_WAY_RESET_TIME to clear
   */
  update(position: Vector3, heading: number, speed: number, dt: number): void {
    // Don't check when stopped or very slow
    if (speed < this.MIN_SPEED_CHECK) {
      // Slowly decay the wrong-way timer when stopped
      this.wrongWayTimer = Math.max(0, this.wrongWayTimer - dt * 0.5)
      if (this.wrongWayTimer <= 0) {
        this._isWrongWay = false
      }
      return
    }

    const isWrongNow = this.checkWrongWayInstant(position.x, position.z, heading)

    if (isWrongNow) {
      this.wrongWayTimer += dt
      this.correctWayTimer = 0

      if (this.wrongWayTimer >= this.WRONG_WAY_CONFIRM_TIME) {
        this._isWrongWay = true
      }
    } else {
      this.correctWayTimer += dt
      this.wrongWayTimer = Math.max(0, this.wrongWayTimer - dt)

      if (this.correctWayTimer >= this.CORRECT_WAY_RESET_TIME) {
        this._isWrongWay = false
        this.wrongWayTimer = 0
      }
    }
  }

  /**
   * Whether the car is confirmed driving the wrong way
   */
  get isWrongWay(): boolean {
    return this._isWrongWay
  }

  /**
   * Reset state (e.g. on respawn)
   */
  reset(): void {
    this._isWrongWay = false
    this.wrongWayTimer = 0
    this.correctWayTimer = 0
  }
}
