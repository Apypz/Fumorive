import { useEffect, useRef, useCallback } from 'react'
import { GameEngine, DemoScene } from '../game'
import { useGameStore } from '../stores/gameStore'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const sceneRef = useRef<DemoScene | null>(null)

  const {
    graphicsConfig,
    selectedMap,
    setLoading,
    setFps,
    setGameState,
    setCameraMode,
    setControlMode,
    setSteeringAngle,
    showInspector,
  } = useGameStore()

  // Initialize game engine
  const initGame = useCallback(async () => {
    if (!canvasRef.current) return

    setLoading(true)

    try {
      // Create engine
      const engine = new GameEngine({
        canvas: canvasRef.current,
        antialias: graphicsConfig.antialiasing,
        graphics: graphicsConfig,
      })

      engineRef.current = engine

      // Create scene
      engine.createScene()

      // Create and initialize demo scene with selected map
      const demoScene = new DemoScene(graphicsConfig, selectedMap)
      sceneRef.current = demoScene

      // Set camera mode change callback to update UI
      demoScene.setOnCameraModeChange((mode) => {
        setCameraMode(mode)
      })

      // Set control mode change callback to update UI
      demoScene.setOnControlModeChange((mode) => {
        setControlMode(mode)
      })

      await demoScene.init(engine.getContext())

      // Start render loop
      engine.start((deltaTime) => {
        demoScene.update(deltaTime)

        // Update steering angle for HUD (every frame for smooth animation)
        setSteeringAngle(demoScene.getSteeringAngle())

        // Update FPS counter every 0.5 seconds
        if (Math.random() < 0.05) {
          setFps(Math.round(engine.getFPS()))
        }
      })

      // Enable optimizer for consistent framerate
      engine.enableOptimizer(60)

      setLoading(false)
      setGameState('playing')

      console.log('[GameCanvas] Game initialized')
    } catch (error) {
      console.error('[GameCanvas] Failed to initialize game:', error)
      setLoading(false)
    }
  }, [graphicsConfig, selectedMap, setLoading, setFps, setGameState, setCameraMode, setControlMode, setSteeringAngle])

  // Handle inspector toggle
  useEffect(() => {
    if (!engineRef.current) return

    if (showInspector) {
      engineRef.current.showInspector()
    } else {
      engineRef.current.hideInspector()
    }
  }, [showInspector])

  // Initialize on mount
  useEffect(() => {
    initGame()

    // Cleanup on unmount
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose()
        sceneRef.current = null
      }

      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
      }
    }
  }, [initGame])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 to toggle inspector
      if (e.key === 'F12') {
        e.preventDefault()
        useGameStore.getState().toggleInspector()
      }

      // F3 to toggle debug info
      if (e.key === 'F3') {
        e.preventDefault()
        useGameStore.getState().toggleDebugInfo()
      }

      // Escape to pause/unpause
      if (e.key === 'Escape') {
        const state = useGameStore.getState()
        if (state.gameState === 'playing') {
          state.setGameState('paused')
        } else if (state.gameState === 'paused') {
          state.setGameState('playing')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none',
        touchAction: 'none',
      }}
      tabIndex={0}
    />
  )
}
