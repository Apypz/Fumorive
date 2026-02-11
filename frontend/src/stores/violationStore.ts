import { create } from 'zustand'

export type ViolationType = 'collision' | 'speeding' | 'wrong-way' | 'red-light' | 'off-road'

export interface Violation {
  id: number
  type: ViolationType
  points: number
  timestamp: number
  description: string
}

const VIOLATION_CONFIG: Record<ViolationType, { points: number; description: string }> = {
  collision: { points: 10, description: 'Menabrak objek' },
  speeding: { points: 5, description: 'Melebihi batas kecepatan' },
  'wrong-way': { points: 15, description: 'Melawan arah' },
  'red-light': { points: 20, description: 'Melanggar lampu merah' },
  'off-road': { points: 3, description: 'Keluar jalur' },
}

interface ViolationStoreState {
  // Violation data
  totalPoints: number
  violations: Violation[]
  lastViolationTime: number

  // Actions
  addViolation: (type: ViolationType) => void
  resetViolations: () => void
}

export const useViolationStore = create<ViolationStoreState>((set, get) => ({
  totalPoints: 0,
  violations: [],
  lastViolationTime: 0,

  addViolation: (type: ViolationType) => {
    const now = Date.now()
    const state = get()

    // Cooldown 1.5s to avoid spam from same collision event
    if (type === 'collision' && now - state.lastViolationTime < 1500) {
      return
    }

    const config = VIOLATION_CONFIG[type]
    const violation: Violation = {
      id: state.violations.length + 1,
      type,
      points: config.points,
      timestamp: now,
      description: config.description,
    }

    set({
      violations: [...state.violations, violation],
      totalPoints: state.totalPoints + config.points,
      lastViolationTime: now,
    })
  },

  resetViolations: () =>
    set({
      totalPoints: 0,
      violations: [],
      lastViolationTime: 0,
    }),
}))
