import { create } from 'zustand'

export interface EEGMetrics {
  timestamp: string
  rawChannels: {
    TP9: number
    AF7: number
    AF8: number
    TP10: number
  }
  deltapower?: number
  thetaPower?: number
  alphaPower?: number
  betaPower?: number
  gammaPower?: number
  thetaAlphaRatio?: number
  betaAlphaRatio?: number
  signalQuality?: number
  cognitiveState?: 'alert' | 'drowsy' | 'fatigued'
  eegFatigueScore?: number
}

export interface EEGStreamState {
  // Real-time data
  currentMetrics: EEGMetrics | null
  dataHistory: EEGMetrics[]
  maxHistoryLength: number

  // Connection status
  isConnected: boolean
  connectionError: string | null

  // Actions
  addMetrics: (metrics: EEGMetrics) => void
  clearHistory: () => void
  setConnected: (connected: boolean) => void
  setConnectionError: (error: string | null) => void
  getLatestMetrics: () => EEGMetrics | null
  getAverageMetrics: (timeWindowMs?: number) => Partial<EEGMetrics> | null
}

export const useEEGStore = create<EEGStreamState>((set, get) => ({
  currentMetrics: null,
  dataHistory: [],
  maxHistoryLength: 500, // Keep last ~500 samples (2-3 seconds at 256Hz)

  isConnected: false,
  connectionError: null,

  addMetrics: (metrics: EEGMetrics) => {
    set((state) => {
      const newHistory = [...state.dataHistory, metrics]
      // Keep only the last maxHistoryLength items
      if (newHistory.length > state.maxHistoryLength) {
        newHistory.shift()
      }
      return {
        currentMetrics: metrics,
        dataHistory: newHistory,
      }
    })
  },

  clearHistory: () => {
    set({
      currentMetrics: null,
      dataHistory: [],
    })
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected })
  },

  setConnectionError: (error: string | null) => {
    set({ connectionError: error })
  },

  getLatestMetrics: () => {
    return get().currentMetrics
  },

  getAverageMetrics: (timeWindowMs = 1000) => {
    const { dataHistory, currentMetrics } = get()
    if (!currentMetrics || dataHistory.length === 0) return null

    const now = new Date(currentMetrics.timestamp).getTime()
    const windowStart = now - timeWindowMs

    const relevantData = dataHistory.filter((item) => {
      const itemTime = new Date(item.timestamp).getTime()
      return itemTime >= windowStart
    })

    if (relevantData.length === 0) return null

    // Average the metrics
    const avgMetrics: Partial<EEGMetrics> = {
      timestamp: currentMetrics.timestamp,
      rawChannels: {
        TP9: 0,
        AF7: 0,
        AF8: 0,
        TP10: 0,
      },
      thetaPower: 0,
      alphaPower: 0,
      betaPower: 0,
      gammaPower: 0,
      thetaAlphaRatio: 0,
      betaAlphaRatio: 0,
      signalQuality: 0,
    }

    relevantData.forEach((item) => {
      if (avgMetrics.rawChannels && item.rawChannels) {
        avgMetrics.rawChannels.TP9 += item.rawChannels.TP9
        avgMetrics.rawChannels.AF7 += item.rawChannels.AF7
        avgMetrics.rawChannels.AF8 += item.rawChannels.AF8
        avgMetrics.rawChannels.TP10 += item.rawChannels.TP10
      }
      if (item.thetaPower) avgMetrics.thetaPower! += item.thetaPower
      if (item.alphaPower) avgMetrics.alphaPower! += item.alphaPower
      if (item.betaPower) avgMetrics.betaPower! += item.betaPower
      if (item.gammaPower) avgMetrics.gammaPower! += item.gammaPower
      if (item.thetaAlphaRatio) avgMetrics.thetaAlphaRatio! += item.thetaAlphaRatio
      if (item.betaAlphaRatio) avgMetrics.betaAlphaRatio! += item.betaAlphaRatio
      if (item.signalQuality) avgMetrics.signalQuality! += item.signalQuality
    })

    const count = relevantData.length

    if (avgMetrics.rawChannels) {
      avgMetrics.rawChannels.TP9 /= count
      avgMetrics.rawChannels.AF7 /= count
      avgMetrics.rawChannels.AF8 /= count
      avgMetrics.rawChannels.TP10 /= count
    }
    avgMetrics.thetaPower! /= count
    avgMetrics.alphaPower! /= count
    avgMetrics.betaPower! /= count
    avgMetrics.gammaPower! /= count
    avgMetrics.thetaAlphaRatio! /= count
    avgMetrics.betaAlphaRatio! /= count
    avgMetrics.signalQuality! /= count

    return avgMetrics
  },
}))
