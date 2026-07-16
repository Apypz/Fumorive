/**
 * hudStore
 * ========
 * Controls which HUD sections are visible. Persists in memory only
 * (reset on page reload is intentional — always starts fully visible).
 *
 * Sections:
 *  vehicle    — speedometer, gear, steering wheel, radio, drift meter
 *  navigation — waypoint panel, traffic light indicator
 *  violations — violation points, toasts, wrong-way / off-road warnings
 *  monitoring — EEG widget, camera fatigue monitor, fusion score
 */
import { create } from 'zustand'

interface HudState {
  showVehicle: boolean
  showNavigation: boolean
  showViolations: boolean
  showMonitoring: boolean

  toggleVehicle: () => void
  toggleNavigation: () => void
  toggleViolations: () => void
  toggleMonitoring: () => void
  hideAll: () => void
  showAll: () => void
}

export const useHudStore = create<HudState>((set) => ({
  showVehicle: true,
  showNavigation: true,
  showViolations: true,
  showMonitoring: true,

  toggleVehicle:    () => set((s) => ({ showVehicle:    !s.showVehicle })),
  toggleNavigation: () => set((s) => ({ showNavigation: !s.showNavigation })),
  toggleViolations: () => set((s) => ({ showViolations: !s.showViolations })),
  toggleMonitoring: () => set((s) => ({ showMonitoring: !s.showMonitoring })),
  hideAll: () => set({ showVehicle: false, showNavigation: false, showViolations: false, showMonitoring: false }),
  showAll: () => set({ showVehicle: true,  showNavigation: true,  showViolations: true,  showMonitoring: true }),
}))
