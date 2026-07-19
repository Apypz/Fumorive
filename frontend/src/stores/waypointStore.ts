import { create } from 'zustand'
import type { WaypointSessionData } from '../game/systems/WaypointSystem'

interface WaypointStoreState {
  // Session data (updated per frame from WaypointSystem)
  sessionData: WaypointSessionData | null
  setSessionData: (data: WaypointSessionData) => void

  // Distance to active waypoint (meters)
  distanceToActive: number
  setDistanceToActive: (d: number) => void

  // Active waypoint position for minimap / arrow
  activeWaypointX: number
  activeWaypointZ: number
  setActiveWaypointPos: (x: number, z: number) => void

  // NEXT waypoint position (the one after the active one) — for preview hint
  nextWaypointX: number
  nextWaypointZ: number
  hasNextWaypoint: boolean
  setNextWaypointPos: (x: number, z: number, has: boolean) => void

  // Car position & heading for navigation arrow
  carX: number
  carZ: number
  carHeading: number   // radians
  setCarPose: (x: number, z: number, heading: number) => void

  // Notification flash when waypoint is reached
  lastReachedIndex: number   // -1 = none
  setLastReachedIndex: (i: number) => void

  // Route completed
  isRouteCompleted: boolean
  completionTime: number
  setRouteCompleted: (time: number) => void

  // Reset
  resetWaypoints: () => void
}

export const useWaypointStore = create<WaypointStoreState>((set) => ({
  sessionData: null,
  setSessionData: (data) => set({ sessionData: data }),

  distanceToActive: -1,
  setDistanceToActive: (d) => set({ distanceToActive: d }),

  activeWaypointX: 0,
  activeWaypointZ: 0,
  setActiveWaypointPos: (x, z) => set({ activeWaypointX: x, activeWaypointZ: z }),

  nextWaypointX: 0,
  nextWaypointZ: 0,
  hasNextWaypoint: false,
  setNextWaypointPos: (x, z, has) => set({ nextWaypointX: x, nextWaypointZ: z, hasNextWaypoint: has }),

  carX: 0,
  carZ: 0,
  carHeading: 0,
  setCarPose: (x, z, heading) => set({ carX: x, carZ: z, carHeading: heading }),

  lastReachedIndex: -1,
  setLastReachedIndex: (i) => set({ lastReachedIndex: i }),

  isRouteCompleted: false,
  completionTime: 0,
  setRouteCompleted: (time) => set({ isRouteCompleted: true, completionTime: time }),

  resetWaypoints: () => set({
    sessionData: null,
    distanceToActive: -1,
    activeWaypointX: 0,
    activeWaypointZ: 0,
    nextWaypointX: 0,
    nextWaypointZ: 0,
    hasNextWaypoint: false,
    carX: 0,
    carZ: 0,
    carHeading: 0,
    lastReachedIndex: -1,
    isRouteCompleted: false,
    completionTime: 0,
  }),
}))
