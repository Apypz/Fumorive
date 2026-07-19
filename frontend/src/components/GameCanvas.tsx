import { useEffect, useRef, useCallback } from 'react'
import { GameEngine, DemoScene } from '../game'
import { useGameStore } from '../stores/gameStore'
import { useViolationStore } from '../stores/violationStore'
import { useWaypointStore } from '../stores/waypointStore'
import { useRadioStore } from '../stores/radioStore'

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const sceneRef = useRef<DemoScene | null>(null)

  const {
    graphicsConfig,
    selectedMap,
    mapSeed,
    currentLevel,
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
  const setIsOffRoad = useGameStore((s) => s.setIsOffRoad)
  const setTrafficLightState = useGameStore((s) => s.setTrafficLightState)
  const setCurrentGear = useGameStore((s) => s.setCurrentGear)
  const setTransmissionMode = useGameStore((s) => s.setTransmissionMode)

  const { setStation, showHUD, setCurrentTrack } = useRadioStore()

  // Initialize game engine
  const initGame = useCallback(async () => {
    if (!canvasRef.current) return

    setLoading(true)
    // Clear any stale warnings carried over from a previous scene/level.
    useGameStore.getState().setIsWrongWay(false)
    useGameStore.getState().setIsOffRoad(false)
    useGameStore.getState().setTrafficLightState(null)

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

      // Create and initialize demo scene with selected map (+ seed/level for Ngawi).
      // Read level & seed FRESH from the store at this moment — NOT from the React
      // closure, which may still hold the pre-startAtLevel stale values.
      const {
        currentLevel: level,
        mapSeed: seed,
        selectedMap: map,
        timeOfDay,
      } = useGameStore.getState()
      const demoScene = new DemoScene(graphicsConfig, map, seed, level, timeOfDay)

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

      // Wire radio station-change callback
      demoScene.setOnStationChange?.((station) => {
        setStation(station)
        showHUD()
      })

      // Wire track-change callback (fires when MP3 track changes)
      demoScene.setOnTrackChange((station, track) => {
        setStation(station)
        setCurrentTrack(track)
        showHUD()
      })

      await demoScene.init(engine.getContext())

      // Start render loop
      let wrongWayViolationCooldown = 0
      let offRoadViolationCooldown = 0
      let redLightCooldown = 0
      let prevWrongWay = false
      let prevOffRoad = false
      let prevLightState: 'red' | 'yellow' | 'green' | null = null
      let fpsAccumulator = 0
      let lastFpsValue = 0
      let hudAccumulator = 0
      const HUD_INTERVAL = 1 / 20 // throttle HUD store writes to ~20Hz
      engine.start((deltaTime) => {
        demoScene.update(deltaTime)

        // Throttle HUD store writes (~20Hz). Each write drives React re-renders,
        // and 60Hz is far more than the gauges/needles need — the CSS transitions
        // on them keep motion smooth even at 20Hz. Gameplay logic above/below
        // (physics, collision, checkpoint detection) still runs every frame.
        hudAccumulator += deltaTime
        const flushHud = hudAccumulator >= HUD_INTERVAL
        if (flushHud) hudAccumulator = 0

        if (flushHud) {
          setSteeringAngle(demoScene.getSteeringAngle())
          setCurrentSpeed(demoScene.getSpeedKmh())
          setIsDrifting(demoScene.getIsDrifting())
          setSlipAngle(demoScene.getSlipAngle())
          setCurrentGear(demoScene.getCurrentGear())
          setTransmissionMode(demoScene.getTransmissionMode())
        }

        // Check wrong-way driving (throttled violation trigger every 5 seconds)
        wrongWayViolationCooldown = Math.max(0, wrongWayViolationCooldown - deltaTime)
        const wrongWayNow = demoScene.isWrongWay()
        // Only write to the store on transition, not 60x/sec.
        if (wrongWayNow !== prevWrongWay) {
          prevWrongWay = wrongWayNow
          setIsWrongWay(wrongWayNow)
        }
        if (wrongWayNow && wrongWayViolationCooldown <= 0) {
          useViolationStore.getState().addViolation('wrong-way')
          wrongWayViolationCooldown = 5 // 5 second cooldown between wrong-way violations
        }

        // Off-road (grass) — Ngawi City only.
        const offRoadNow = demoScene.isPlayerOffRoad()
        if (offRoadNow !== prevOffRoad) {
          prevOffRoad = offRoadNow
          setIsOffRoad(offRoadNow)
        }
        offRoadViolationCooldown = Math.max(0, offRoadViolationCooldown - deltaTime)
        if (offRoadNow && demoScene.getSpeedKmh() > 5 && offRoadViolationCooldown <= 0) {
          useViolationStore.getState().addViolation('off-road')
          offRoadViolationCooldown = 3
        }

        // Running a red light — Ngawi City only. checkPlayerRedLight is stateful
        // (tracks stop-line crossings), so it must run every frame, not be
        // short-circuited away during the cooldown.
        const ranRed = demoScene.checkPlayerRedLight()
        redLightCooldown = Math.max(0, redLightCooldown - deltaTime)
        if (ranRed && redLightCooldown <= 0 && demoScene.getSpeedKmh() > 5) {
          useViolationStore.getState().addViolation('red-light')
          redLightCooldown = 4
        }

        // Hitting a pedestrian — Ngawi City only. Severe penalty, one per person
        // run over (the system applies a per-pedestrian cooldown internally).
        const pedHits = demoScene.getPedestrianHits()
        for (let h = 0; h < pedHits; h++) {
          useViolationStore.getState().addViolation('pedestrian')
        }

        // Traffic-light HUD: state of the light governing the player's approach.
        const lightState = demoScene.getApproachingLightState()
        if (lightState !== prevLightState) {
          prevLightState = lightState
          setTrafficLightState(lightState)
        }

        // Update waypoint store for HUD (throttled — these are display-only;
        // the reach/complete event detection below still runs every frame).
        const wpData = flushHud ? demoScene.getWaypointSessionData() : null
        if (wpData) {
          useWaypointStore.getState().setSessionData(wpData)
          const dist = demoScene.getDistanceToActiveWaypoint()
          useWaypointStore.getState().setDistanceToActive(dist)
          const activePos = demoScene.getActiveWaypointPosition()
          if (activePos) {
            useWaypointStore.getState().setActiveWaypointPos(activePos.x, activePos.z)
          }
          // Push the waypoint AFTER the active one so the HUD can show a preview
          const nextPos = demoScene.getNextWaypointPosition()
          useWaypointStore.getState().setNextWaypointPos(
            nextPos?.x ?? 0,
            nextPos?.z ?? 0,
            nextPos !== null,
          )
          // Push car position & heading for nav arrow
          const carPos = demoScene.getCarPosition()
          const carHdg = demoScene.getCarHeading()
          useWaypointStore.getState().setCarPose(carPos.x, carPos.z, carHdg)
        }

        // Check waypoint system for reach/complete events
        const wpSystem = demoScene.getWaypointSystem()
        if (wpSystem) {
          const sessionInfo = wpSystem.getSessionData()
          // Detect newly reached waypoints
          const lastReached = sessionInfo.reachedCount - 1
          if (lastReached >= 0) {
            const storeLastReached = useWaypointStore.getState().lastReachedIndex
            if (lastReached !== storeLastReached) {
              useWaypointStore.getState().setLastReachedIndex(lastReached)
            }
          }
          // Detect route completion
          if (sessionInfo.isCompleted && !useWaypointStore.getState().isRouteCompleted) {
            useWaypointStore.getState().setRouteCompleted(sessionInfo.elapsedTime)
          }
        }

        // Update FPS counter ~once per second, and only when it actually changes.
        fpsAccumulator += deltaTime
        if (fpsAccumulator >= 1) {
          fpsAccumulator = 0
          const fpsNow = Math.round(engine.getFPS())
          if (fpsNow !== lastFpsValue) {
            lastFpsValue = fpsNow
            setFps(fpsNow)
          }
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
  }, [graphicsConfig, selectedMap, mapSeed, currentLevel, setLoading, setFps, setGameState, setCameraMode, setControlMode, setSteeringAngle, setCurrentSpeed, setIsDrifting, setSlipAngle, setEngineRunning])

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
      // R to cycle radio station
      if (e.key === 'r' || e.key === 'R') {
        const scene = sceneRef.current
        if (scene) {
          const newStation = scene.cycleRadio()
          setStation(newStation)
          showHUD()
        }
      }

      // [ = previous track, ] = next track (MP3 stations)
      if (e.key === '[') {
        sceneRef.current?.radioPrevTrack()
        showHUD()
      }
      if (e.key === ']') {
        sceneRef.current?.radioNextTrack()
        showHUD()
      }

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
