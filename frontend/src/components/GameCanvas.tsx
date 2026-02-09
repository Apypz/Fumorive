import { useEffect, useRef, useCallback } from 'react'
import { GameEngine, DemoScene } from '../game'
import { useGameStore } from '../stores/gameStore'
import { useViolationStore } from '../stores/violationStore'

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
    setCurrentSpeed,
    setIsDrifting,
    setSlipAngle,
    setEngineRunning,
    showInspector,
  } = useGameStore()

  const setIsWrongWay = useGameStore((s) => s.setIsWrongWay)
  const setCurrentGear = useGameStore((s) => s.setCurrentGear)
  const setTransmissionMode = useGameStore((s) => s.setTransmissionMode)

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

      // Set engine state change callback to update UI
      demoScene.setOnEngineStateChange((running) => {
        setEngineRunning(running)
      })

      // Set collision callback for violation tracking
      demoScene.setOnCollision((impactVelocity) => {
        // Only register significant collisions (threshold: 3 m/s impact)
        if (impactVelocity > 3) {
          useViolationStore.getState().addViolation('collision')
        }
      })

      await demoScene.init(engine.getContext())

      // Start render loop
      let wrongWayViolationCooldown = 0
      engine.start((deltaTime) => {
        demoScene.update(deltaTime)

        // Update steering angle for HUD (every frame for smooth animation)
        setSteeringAngle(demoScene.getSteeringAngle())
        
        // Update speed and drift status for speedometer
        setCurrentSpeed(demoScene.getSpeedKmh())
        setIsDrifting(demoScene.getIsDrifting())
        setSlipAngle(demoScene.getSlipAngle())

        // Update gear/transmission info
        setCurrentGear(demoScene.getCurrentGear())
        setTransmissionMode(demoScene.getTransmissionMode())

        // Check wrong-way driving (throttled violation trigger every 5 seconds)
        wrongWayViolationCooldown = Math.max(0, wrongWayViolationCooldown - deltaTime)
        const wrongWayNow = demoScene.isWrongWay()
        setIsWrongWay(wrongWayNow)
        if (wrongWayNow && wrongWayViolationCooldown <= 0) {
          useViolationStore.getState().addViolation('wrong-way')
          wrongWayViolationCooldown = 5 // 5 second cooldown between wrong-way violations
        }

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
  }, [graphicsConfig, selectedMap, setLoading, setFps, setGameState, setCameraMode, setControlMode, setSteeringAngle, setCurrentSpeed, setIsDrifting, setSlipAngle, setEngineRunning])

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
