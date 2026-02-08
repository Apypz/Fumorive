/**
 * Lane Detection System
 * =====================
 * Detects when the car goes off-road and tracks lane violations.
 * Used for objective scoring in the driving simulation.
 */

import { Vector3 } from '@babylonjs/core'

/**
 * Road boundary definition
 */
export interface RoadBounds {
  name: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/**
 * Lane detection state
 */
export interface LaneDetectionState {
  isOnRoad: boolean
  violationCount: number
  currentViolationDuration: number
  totalOffRoadTime: number
  lastRoadName: string | null
}

/**
 * Options for lane detection
 */
export interface LaneDetectionConfig {
  /** Grace period before counting as violation (in seconds) */
  gracePeriod: number
  /** Minimum time off road to count as single violation (in seconds) */
  minViolationDuration: number
  /** Callback when violation starts */
  onViolationStart?: () => void
  /** Callback when violation ends */
  onViolationEnd?: (duration: number) => void
  /** Callback when violation count changes */
  onViolationCountChange?: (count: number) => void
  /** Callback when on-road status changes */
  onRoadStatusChange?: (isOnRoad: boolean, roadName: string | null) => void
}

const DEFAULT_CONFIG: LaneDetectionConfig = {
  gracePeriod: 0.3,
  minViolationDuration: 0.5,
}

export class LaneDetection {
  private roads: RoadBounds[] = []
  private junctions: RoadBounds[] = []
  private state: LaneDetectionState = {
    isOnRoad: true,
    violationCount: 0,
    currentViolationDuration: 0,
    totalOffRoadTime: 0,
    lastRoadName: null,
  }
  private config: LaneDetectionConfig
  private wasOnRoad: boolean = true
  private offRoadTimer: number = 0
  private violationInProgress: boolean = false

  constructor(config?: Partial<LaneDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Add a road segment to track
   */
  addRoad(name: string, centerX: number, centerZ: number, width: number, depth: number): void {
    this.roads.push({
      name,
      minX: centerX - width / 2,
      maxX: centerX + width / 2,
      minZ: centerZ - depth / 2,
      maxZ: centerZ + depth / 2,
    })
  }

  /**
   * Add a junction to track
   */
  addJunction(x: number, z: number, size: number): void {
    const actualSize = size + 4 // Same as SimpleMap
    this.junctions.push({
      name: `junction_${x}_${z}`,
      minX: x - actualSize / 2,
      maxX: x + actualSize / 2,
      minZ: z - actualSize / 2,
      maxZ: z + actualSize / 2,
    })
  }

  /**
   * Check if a position is on any road or junction
   */
  isPositionOnRoad(position: Vector3): { onRoad: boolean; roadName: string | null } {
    const x = position.x
    const z = position.z

    // Check roads
    for (const road of this.roads) {
      if (x >= road.minX && x <= road.maxX && z >= road.minZ && z <= road.maxZ) {
        return { onRoad: true, roadName: road.name }
      }
    }

    // Check junctions
    for (const junction of this.junctions) {
      if (x >= junction.minX && x <= junction.maxX && z >= junction.minZ && z <= junction.maxZ) {
        return { onRoad: true, roadName: junction.name }
      }
    }

    return { onRoad: false, roadName: null }
  }

  /**
   * Update lane detection - call every frame
   */
  update(carPosition: Vector3, deltaTime: number): void {
    const result = this.isPositionOnRoad(carPosition)
    const currentlyOnRoad = result.onRoad

    // Update state
    this.state.isOnRoad = currentlyOnRoad
    if (currentlyOnRoad) {
      this.state.lastRoadName = result.roadName
    }

    // Handle transition from on-road to off-road
    if (!currentlyOnRoad && this.wasOnRoad) {
      this.offRoadTimer = 0
      this.config.onRoadStatusChange?.(false, result.roadName)
    }

    // Handle transition from off-road to on-road
    if (currentlyOnRoad && !this.wasOnRoad) {
      // Violation ends
      if (this.violationInProgress) {
        this.config.onViolationEnd?.(this.state.currentViolationDuration)
        this.violationInProgress = false
      }
      this.state.currentViolationDuration = 0
      this.offRoadTimer = 0
      this.config.onRoadStatusChange?.(true, result.roadName)
    }

    // Track off-road time
    if (!currentlyOnRoad) {
      this.offRoadTimer += deltaTime
      this.state.totalOffRoadTime += deltaTime

      // Check grace period
      if (this.offRoadTimer >= this.config.gracePeriod) {
        this.state.currentViolationDuration = this.offRoadTimer - this.config.gracePeriod

        // Start violation if not already
        if (!this.violationInProgress && this.state.currentViolationDuration >= this.config.minViolationDuration) {
          this.violationInProgress = true
          this.state.violationCount++
          this.config.onViolationStart?.()
          this.config.onViolationCountChange?.(this.state.violationCount)
        }
      }
    }

    this.wasOnRoad = currentlyOnRoad
  }

  /**
   * Get current detection state
   */
  getState(): Readonly<LaneDetectionState> {
    return { ...this.state }
  }

  /**
   * Get violation count
   */
  getViolationCount(): number {
    return this.state.violationCount
  }

  /**
   * Check if currently on road
   */
  isOnRoad(): boolean {
    return this.state.isOnRoad
  }

  /**
   * Get total time spent off road
   */
  getTotalOffRoadTime(): number {
    return this.state.totalOffRoadTime
  }

  /**
   * Reset detection state
   */
  reset(): void {
    this.state = {
      isOnRoad: true,
      violationCount: 0,
      currentViolationDuration: 0,
      totalOffRoadTime: 0,
      lastRoadName: null,
    }
    this.wasOnRoad = true
    this.offRoadTimer = 0
    this.violationInProgress = false
  }

  /**
   * Get all tracked roads (for debugging)
   */
  getRoads(): ReadonlyArray<RoadBounds> {
    return this.roads
  }

  /**
   * Get all tracked junctions (for debugging)
   */
  getJunctions(): ReadonlyArray<RoadBounds> {
    return this.junctions
  }

  /**
   * Clear all roads and junctions
   */
  clear(): void {
    this.roads = []
    this.junctions = []
    this.reset()
  }
}