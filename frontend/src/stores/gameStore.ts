import { create } from 'zustand'
import type { GraphicsConfig, AssetLoadProgress } from '../game/types'
import { GRAPHICS_PRESETS, DEFAULT_GRAPHICS_CONFIG } from '../game/types'

export type GameState = 'loading' | 'menu' | 'playing' | 'paused'

interface GameStoreState {
  // Game state
  gameState: GameState
  setGameState: (state: GameState) => void

  // Loading
  isLoading: boolean
  loadingProgress: AssetLoadProgress | null
  setLoading: (loading: boolean) => void
  setLoadingProgress: (progress: AssetLoadProgress | null) => void

  // Graphics settings
  graphicsConfig: GraphicsConfig
  setGraphicsConfig: (config: Partial<GraphicsConfig>) => void
  setGraphicsPreset: (preset: 'low' | 'medium' | 'high' | 'ultra') => void

  // Performance
  fps: number
  setFps: (fps: number) => void

  // Debug
  showDebugInfo: boolean
  toggleDebugInfo: () => void
  showInspector: boolean
  toggleInspector: () => void
}

export const useGameStore = create<GameStoreState>((set) => ({
  // Game state
  gameState: 'loading',
  setGameState: (gameState) => set({ gameState }),

  // Loading
  isLoading: true,
  loadingProgress: null,
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),

  // Graphics settings
  graphicsConfig: DEFAULT_GRAPHICS_CONFIG,
  setGraphicsConfig: (config) =>
    set((state) => ({
      graphicsConfig: { ...state.graphicsConfig, ...config },
    })),
  setGraphicsPreset: (preset) =>
    set({
      graphicsConfig: GRAPHICS_PRESETS[preset],
    }),

  // Performance
  fps: 0,
  setFps: (fps) => set({ fps }),

  // Debug
  showDebugInfo: false,
  toggleDebugInfo: () => set((state) => ({ showDebugInfo: !state.showDebugInfo })),
  showInspector: false,
  toggleInspector: () => set((state) => ({ showInspector: !state.showInspector })),
}))
