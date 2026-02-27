/**
 * WaypointSystem
 * ==============
 * Checkpoint/waypoint navigation system for driving sessions.
 * 
 * - Waypoints are placed on road center-lines
 * - Multiple pre-defined routes available per map
 * - Route is randomly selected each session
 * - Player must pass checkpoints in order
 * - Tracks progress, time, and missed checkpoints
 */

import { Vector3 } from '@babylonjs/core'
import type { MapType } from '../types'

// ============================================
// TYPES
// ============================================

export interface Waypoint {
  id: number
  position: Vector3        // World position (y=0 on road surface)
  radius: number           // Trigger radius in meters
  roadName: string         // Which road segment it's on
  label?: string           // Optional display label
}

export interface WaypointRoute {
  id: string
  name: string
  description: string
  waypoints: Waypoint[]
  mapType: MapType
}

export type WaypointState = 'upcoming' | 'active' | 'reached' | 'missed'

export interface WaypointProgress {
  waypointId: number
  state: WaypointState
  reachedAt?: number       // timestamp in seconds from session start
}

export interface WaypointSessionData {
  routeId: string
  routeName: string
  totalWaypoints: number
  currentWaypointIndex: number
  waypointProgress: WaypointProgress[]
  startTime: number
  elapsedTime: number
  isCompleted: boolean
  missedCount: number
  reachedCount: number
}

// ============================================
// SOLO CITY ROUTES
// ============================================

/**
 * All waypoints are placed at road center-lines based on the actual
 * road segments in SimpleMap.ts. Coordinates verified against road bounds.
 * 
 * Road center-lines reference:
 * - road_center_v:  x=50,  z range [-180, 160]
 * - road_left_v:    x=-80, z range [-50, 150]
 * - road_top:       z=150, x range [-130, 50]
 * - road_mid:       z=50,  x range [-85, 95]
 * - road_lower:     z=-50, x range [-70, 50]
 * - road_right_v:   x=90,  z range [-112, 58]
 * - road_to_H:      z=-100, x range [100, 170]
 * - road_south_H:   z=-178, x range [45, 175]
 * - road_gedungH_e: x=170, z range [-186, -92]
 * - radial_north:   x=50,  z range [150, 330]
 * - radial_south:   x=50,  z range [-506, -180]
 * - radial_east:    z=-100, x range [90, 290]
 * - radial_west:    z=50,  x range [-286, -80]
 * - ring_north:     z=310, x range [-280, 284]
 * - ring_south:     z=-506, x range [-280, 284]
 * - ring_east:      x=290, z range [-500, 300]
 * - ring_west:      x=-286, z range [-500, 300]
 */

function createWaypoint(id: number, x: number, z: number, roadName: string, radius = 12, label?: string): Waypoint {
  return { id, position: new Vector3(x, 0, z), radius, roadName, label }
}

// --- Route 1: City Center Loop (short, 8 checkpoints) ---
const SOLO_ROUTE_1: WaypointRoute = {
  id: 'solo-center-loop',
  name: 'Rute Pusat Kota',
  description: 'Rute pendek mengelilingi pusat kota Solo.',
  mapType: 'solo-city',
  waypoints: [
    createWaypoint(1, 50, 80,    'road_center_v',   12, 'Start'),
    createWaypoint(2, 50, 150,   'road_center_v',   12, 'Persimpangan Utara'),
    createWaypoint(3, -30, 150,  'road_top',        12, 'Jl. Atas Tengah'),
    createWaypoint(4, -80, 150,  'road_left_v',     12, 'Simpang Kiri-Atas'),
    createWaypoint(5, -80, 50,   'road_left_v',     12, 'Simpang Kiri-Tengah'),
    createWaypoint(6, -30, 50,   'road_mid',        12, 'Jl. Tengah'),
    createWaypoint(7, 50, 50,    'road_center_v',   12, 'Persimpangan Pusat'),
    createWaypoint(8, 50, -20,   'road_center_v',   12, 'Finish'),
  ],
}

// --- Route 2: Eastern District (medium, 10 checkpoints) ---
const SOLO_ROUTE_2: WaypointRoute = {
  id: 'solo-east-district',
  name: 'Rute Distrik Timur',
  description: 'Rute melalui distrik timur dan area Gedung H.',
  mapType: 'solo-city',
  waypoints: [
    createWaypoint(1,  50,  80,   'road_center_v',   12, 'Start'),
    createWaypoint(2,  50,  25,   'road_center_v',   12, 'Jl. Pusat Selatan'),
    createWaypoint(3,  50,  -50,  'road_center_v',   12, 'Simpang Bawah'),
    createWaypoint(4,  50,  -120, 'road_center_v',   12, 'Jl. Pusat Jauh'),
    createWaypoint(5,  50,  -178, 'road_center_v',   12, 'Simpang Selatan'),
    createWaypoint(6,  110, -178, 'road_south_H',    12, 'Jl. Selatan H'),
    createWaypoint(7,  170, -178, 'road_gedungH_e',  12, 'Gedung H Selatan'),
    createWaypoint(8,  170, -100, 'road_gedungH_e',  12, 'Gedung H Utara'),
    createWaypoint(9,  135, -100, 'road_to_H',       12, 'Jl. Menuju H'),
    createWaypoint(10, 90,  -30,  'road_right_v',    12, 'Finish'),
  ],
}

// --- Route 3: Ring Road Half (long, 12 checkpoints) ---
const SOLO_ROUTE_3: WaypointRoute = {
  id: 'solo-ring-north',
  name: 'Rute Ring Road Utara',
  description: 'Rute panjang melalui ring road bagian utara.',
  mapType: 'solo-city',
  waypoints: [
    createWaypoint(1,  50,  80,   'road_center_v',   12, 'Start'),
    createWaypoint(2,  50,  150,  'road_center_v',   12, 'Radial Utara'),
    createWaypoint(3,  50,  240,  'radial_north',    12, 'Jl. Radial Utara'),
    createWaypoint(4,  50,  310,  'ring_north',      14, 'Ring Utara Tengah'),
    createWaypoint(5,  170, 310,  'ring_north',      14, 'Ring Utara Timur'),
    createWaypoint(6,  290, 310,  'ring_east',       14, 'Sudut Timur Laut'),
    createWaypoint(7,  290, 100,  'ring_east',       14, 'Ring Timur Atas'),
    createWaypoint(8,  290, -100, 'ring_east',       14, 'Ring Timur Tengah'),
    createWaypoint(9,  230, -100, 'radial_east',     12, 'Radial Timur'),
    createWaypoint(10, 170, -100, 'radial_east',     12, 'Simpang Gedung H'),
    createWaypoint(11, 135, -100, 'road_to_H',       12, 'Jl. Menuju H'),
    createWaypoint(12, 90,  -50,  'road_right_v',    12, 'Finish'),
  ],
}

// --- Route 4: Western Loop (medium, 10 checkpoints) ---
const SOLO_ROUTE_4: WaypointRoute = {
  id: 'solo-west-loop',
  name: 'Rute Loop Barat',
  description: 'Rute mengelilingi bagian barat kota melalui ring road.',
  mapType: 'solo-city',
  waypoints: [
    createWaypoint(1,  50,  80,   'road_center_v',   12, 'Start'),
    createWaypoint(2,  50,  50,   'road_center_v',   12, 'Persimpangan Pusat'),
    createWaypoint(3,  -20, 50,   'road_mid',        12, 'Jl. Tengah Kiri'),
    createWaypoint(4,  -80, 50,   'road_left_v',     12, 'Simpang Kiri'),
    createWaypoint(5,  -180,50,   'radial_west',     12, 'Radial Barat'),
    createWaypoint(6,  -286,50,   'ring_west',       14, 'Ring Barat Tengah'),
    createWaypoint(7,  -286,200,  'ring_west',       14, 'Ring Barat Utara'),
    createWaypoint(8,  -286,310,  'ring_north',      14, 'Sudut Barat Laut'),
    createWaypoint(9,  -100,310,  'ring_north',      14, 'Ring Utara Barat'),
    createWaypoint(10, 50,  310,  'radial_north',    14, 'Finish Ring Utara'),
  ],
}

// --- Route 5: Full Ring Road (long, 14 checkpoints) ---
const SOLO_ROUTE_5: WaypointRoute = {
  id: 'solo-full-ring',
  name: 'Rute Ring Road Penuh',
  description: 'Satu putaran penuh ring road. Rute terpanjang!',
  mapType: 'solo-city',
  waypoints: [
    createWaypoint(1,  50,  80,   'road_center_v',   12, 'Start'),
    createWaypoint(2,  50,  240,  'radial_north',    12, 'Radial Utara'),
    createWaypoint(3,  50,  310,  'ring_north',      14, 'Ring Utara'),
    createWaypoint(4,  200, 310,  'ring_north',      14, 'Ring Utara Timur'),
    createWaypoint(5,  290, 310,  'ring_east',       14, 'Sudut Timur Laut'),
    createWaypoint(6,  290, 50,   'ring_east',       14, 'Ring Timur Atas'),
    createWaypoint(7,  290, -300, 'ring_east',       14, 'Ring Timur Bawah'),
    createWaypoint(8,  290, -506, 'ring_south',      14, 'Sudut Tenggara'),
    createWaypoint(9,  50,  -506, 'ring_south',      14, 'Ring Selatan'),
    createWaypoint(10, -150,-506, 'ring_south',      14, 'Ring Selatan Barat'),
    createWaypoint(11, -286,-506, 'ring_west',       14, 'Sudut Barat Daya'),
    createWaypoint(12, -286,0,    'ring_west',       14, 'Ring Barat Tengah'),
    createWaypoint(13, -286,310,  'ring_north',      14, 'Sudut Barat Laut'),
    createWaypoint(14, 50,  310,  'ring_north',      14, 'Finish'),
  ],
}

// --- Route 6: South District (medium, 10 checkpoints) ---
const SOLO_ROUTE_6: WaypointRoute = {
  id: 'solo-south-district',
  name: 'Rute Distrik Selatan',
  description: 'Menjelajahi bagian selatan kota hingga ring road.',
  mapType: 'solo-city',
  waypoints: [
    createWaypoint(1,  50,  80,   'road_center_v',   12, 'Start'),
    createWaypoint(2,  50,  -50,  'road_center_v',   12, 'Simpang Bawah'),
    createWaypoint(3,  -20, -50,  'road_lower',      12, 'Jl. Bawah'),
    createWaypoint(4,  -80, -50,  'road_left_v',     12, 'Simpang Kiri Bawah'),
    createWaypoint(5,  -80, 50,   'road_left_v',     12, 'Simpang Kiri'),
    createWaypoint(6,  50,  50,   'road_mid',        12, 'Kembali ke Pusat'),
    createWaypoint(7,  50,  -178, 'road_center_v',   12, 'Selatan Jauh'),
    createWaypoint(8,  50,  -343, 'radial_south',    12, 'Radial Selatan'),
    createWaypoint(9,  50,  -506, 'ring_south',      14, 'Ring Selatan'),
    createWaypoint(10, 150, -506, 'ring_south',      14, 'Finish'),
  ],
}

// ============================================
// ROUTE REGISTRY (Solo City only)
// ============================================

const SOLO_CITY_ROUTES: WaypointRoute[] = [
  SOLO_ROUTE_1,
  SOLO_ROUTE_2,
  SOLO_ROUTE_3,
  SOLO_ROUTE_4,
  SOLO_ROUTE_5,
  SOLO_ROUTE_6,
]

/**
 * Get all available routes (Solo City)
 */
export function getRoutesForMap(_mapType: MapType): WaypointRoute[] {
  return SOLO_CITY_ROUTES
}

/**
 * Get a random route (Solo City only)
 */
export function getRandomRoute(_mapType: MapType): WaypointRoute {
  const idx = Math.floor(Math.random() * SOLO_CITY_ROUTES.length)
  return SOLO_CITY_ROUTES[idx]
}

/**
 * Get a specific route by ID
 */
export function getRouteById(routeId: string): WaypointRoute | undefined {
  return SOLO_CITY_ROUTES.find(r => r.id === routeId)
}

// ============================================
// WAYPOINT SYSTEM (runtime tracker)
// ============================================

export class WaypointSystem {
  private route: WaypointRoute
  private progress: WaypointProgress[]
  private currentIndex: number = 0
  private startTime: number = 0
  private elapsedTime: number = 0
  private _isCompleted: boolean = false
  private _isStarted: boolean = false

  // Callbacks
  private onWaypointReached?: (waypointId: number, index: number, total: number) => void
  private onRouteCompleted?: (elapsedTime: number, missed: number) => void
  private onWaypointChanged?: (currentIndex: number) => void

  constructor(route: WaypointRoute) {
    this.route = route
    this.progress = route.waypoints.map(wp => ({
      waypointId: wp.id,
      state: 'upcoming' as WaypointState,
    }))
    // Mark first waypoint as active
    if (this.progress.length > 0) {
      this.progress[0].state = 'active'
    }
  }

  /**
   * Set callback for when a waypoint is reached
   */
  setOnWaypointReached(cb: (waypointId: number, index: number, total: number) => void): void {
    this.onWaypointReached = cb
  }

  /**
   * Set callback for when the entire route is completed
   */
  setOnRouteCompleted(cb: (elapsedTime: number, missed: number) => void): void {
    this.onRouteCompleted = cb
  }

  /**
   * Set callback for when the active waypoint changes
   */
  setOnWaypointChanged(cb: (currentIndex: number) => void): void {
    this.onWaypointChanged = cb
  }

  /**
   * Start the waypoint timer
   */
  start(): void {
    this._isStarted = true
    this.startTime = performance.now() / 1000
  }

  /**
   * Update the system every frame.
   * Checks if the car position is within the active waypoint's radius.
   */
  update(carPosition: Vector3, deltaTime: number): void {
    if (!this._isStarted || this._isCompleted) return

    this.elapsedTime += deltaTime

    if (this.currentIndex >= this.route.waypoints.length) {
      this._isCompleted = true
      return
    }

    const activeWaypoint = this.route.waypoints[this.currentIndex]
    const distance = Vector3.Distance(
      new Vector3(carPosition.x, 0, carPosition.z),
      new Vector3(activeWaypoint.position.x, 0, activeWaypoint.position.z)
    )

    if (distance <= activeWaypoint.radius) {
      // Waypoint reached!
      this.progress[this.currentIndex].state = 'reached'
      this.progress[this.currentIndex].reachedAt = this.elapsedTime

      this.onWaypointReached?.(
        activeWaypoint.id,
        this.currentIndex,
        this.route.waypoints.length
      )

      this.currentIndex++

      if (this.currentIndex >= this.route.waypoints.length) {
        // Route completed!
        this._isCompleted = true
        const missed = this.progress.filter(p => p.state === 'missed').length
        this.onRouteCompleted?.(this.elapsedTime, missed)
      } else {
        // Activate next waypoint
        this.progress[this.currentIndex].state = 'active'
        this.onWaypointChanged?.(this.currentIndex)
      }
    }
  }

  /**
   * Get current session data for UI
   */
  getSessionData(): WaypointSessionData {
    return {
      routeId: this.route.id,
      routeName: this.route.name,
      totalWaypoints: this.route.waypoints.length,
      currentWaypointIndex: this.currentIndex,
      waypointProgress: [...this.progress],
      startTime: this.startTime,
      elapsedTime: this.elapsedTime,
      isCompleted: this._isCompleted,
      missedCount: this.progress.filter(p => p.state === 'missed').length,
      reachedCount: this.progress.filter(p => p.state === 'reached').length,
    }
  }

  /**
   * Get the current active waypoint
   */
  getActiveWaypoint(): Waypoint | null {
    if (this.currentIndex >= this.route.waypoints.length) return null
    return this.route.waypoints[this.currentIndex]
  }

  /**
   * Get all waypoints in this route
   */
  getAllWaypoints(): Waypoint[] {
    return this.route.waypoints
  }

  /**
   * Get the route info
   */
  getRoute(): WaypointRoute {
    return this.route
  }

  /**
   * Get progress for a specific waypoint
   */
  getWaypointProgress(index: number): WaypointProgress | undefined {
    return this.progress[index]
  }

  /**
   * Whether the route is fully completed
   */
  get isCompleted(): boolean {
    return this._isCompleted
  }

  /**
   * Whether the system has been started
   */
  get isStarted(): boolean {
    return this._isStarted
  }

  /**
   * Get distance from car to active waypoint
   */
  getDistanceToActive(carPosition: Vector3): number {
    const active = this.getActiveWaypoint()
    if (!active) return -1
    return Vector3.Distance(
      new Vector3(carPosition.x, 0, carPosition.z),
      new Vector3(active.position.x, 0, active.position.z)
    )
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    return this.elapsedTime
  }

  /**
   * Reset the system for a new attempt
   */
  reset(): void {
    this.currentIndex = 0
    this.elapsedTime = 0
    this.startTime = 0
    this._isCompleted = false
    this._isStarted = false
    this.progress = this.route.waypoints.map(wp => ({
      waypointId: wp.id,
      state: 'upcoming' as WaypointState,
    }))
    if (this.progress.length > 0) {
      this.progress[0].state = 'active'
    }
  }
}
