// src/pages/Session.tsx
import { useState, useEffect } from 'react'
import { GameCanvas } from '../GameCanvas'
import { LoadingScreen } from '../LoadingScreen'
import { DebugOverlay } from '../DebugOverlay'
import { GraphicsSettings } from '../GraphicsSettings'
import { ControlsHUD } from '../ControlsHUD'
import { SteeringWheelHUD } from '../SteeringWheelHUD'
import { SpeedometerHUD } from '../SpeedometerHUD'
import { DriftMeter } from '../DriftMeter'
import { MapSelection } from '../MapSelection'
import { CameraFatigueMonitor } from '../CameraFatigueMonitor'
import { EEGMonitoringWidget } from '../EEGMonitoringWidget'
import { ViolationHUD } from '../ViolationHUD'
import { WrongWayWarning } from '../WrongWayWarning'
import { GearHUD } from '../GearHUD'
import { useGameStore } from '../../stores/gameStore'
import { useSessionStore } from '../../stores/sessionStore'
import '../../App.css'

export default function Session() {
  const { gameState, setGameState } = useGameStore()
  const { sessionId, initializeSession } = useSessionStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showMapSelection, setShowMapSelection] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [eegEnabled, setEegEnabled] = useState(true)
  const [eegCognitiveState, setEegCognitiveState] = useState<'alert' | 'drowsy' | 'fatigued' | undefined>()

  // Initialize session on mount
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  const handleStartGame = () => {
    setShowMapSelection(false)
    setGameStarted(true)
  }

  const handleBackToMapSelect = () => {
    setShowMapSelection(true)
    setGameStarted(false)
    setGameState('loading')
  }

  return (
    <div className="app">
      {/* Map Selection Screen - shown before game starts */}
      {showMapSelection && (
        <MapSelection onStartGame={handleStartGame} />
      )}

      {/* Game Canvas - only render when game started */}
      {gameStarted && <GameCanvas />}
      
      {/* Loading Screen - only show after map selection, during game load */}
      {gameStarted && <LoadingScreen />}
      
      <DebugOverlay />

      {gameState === 'paused' && gameStarted && (
        <div className="pause-menu">
          <div className="pause-content">
            <h2>PAUSED</h2>
            <button
              className="menu-button"
              onClick={() => setGameState('playing')}
            >
              Resume
            </button>
            <button
              className="menu-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
            <button
              className="menu-button"
              onClick={handleBackToMapSelect}
              style={{ marginTop: '1rem', backgroundColor: '#6b7280' }}
            >
              Ganti Map
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <GraphicsSettings onClose={() => setShowSettings(false)} />
      )}

      {gameState === 'playing' && gameStarted && (
        <>
          {/* Controls HUD - shows current control mode and key bindings */}
          <ControlsHUD />
          
          {/* Speedometer visualization */}
          <SpeedometerHUD />
          
          {/* Gear indicator - next to speedometer */}
          <GearHUD />
          
          {/* Drift Meter visualization */}
          <DriftMeter />
          
          {/* Steering Wheel visualization */}
          <SteeringWheelHUD />

          {/* Violation tracker - next to speedometer */}
          <ViolationHUD />

          {/* Wrong-way warning overlay */}
          <WrongWayWarning />

          {/* Camera Fatigue Monitor - bottom right corner */}
          <CameraFatigueMonitor 
            isEnabled={cameraEnabled}
            onToggle={() => setCameraEnabled(!cameraEnabled)}
          />

          {/* EEG Monitoring Widget - top right corner */}
          {eegEnabled && (
            <EEGMonitoringWidget
              sessionId={sessionId}
              defaultPosition="top-right"
              onStateChange={setEegCognitiveState}
            />
          )}
        </>
      )}

      {/* Show camera toggle button when game started but not playing */}
      {gameStarted && gameState !== 'playing' && (
        <CameraFatigueMonitor 
          isEnabled={cameraEnabled}
          onToggle={() => setCameraEnabled(!cameraEnabled)}
        />
      )}
    </div>
  )
}
