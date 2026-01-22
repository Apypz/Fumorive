// src/pages/Session.tsx
import { useState } from 'react'
import { GameCanvas } from '../GameCanvas'
import { LoadingScreen } from '../LoadingScreen'
import { DebugOverlay } from '../DebugOverlay'
import { GraphicsSettings } from '../GraphicsSettings'
import { useGameStore } from '../../stores/gameStore'
import '../../App.css'

export default function Session() {
  const { gameState, cameraMode } = useGameStore()
  const [showSettings, setShowSettings] = useState(false)

  // Format camera mode for display
  const cameraModeDisplay = cameraMode === 'first-person' 
    ? '🎯 First Person (Cockpit)' 
    : '🚗 Third Person'

  return (
    <div className="app">
      <GameCanvas />
      <LoadingScreen />
      <DebugOverlay />

      {gameState === 'paused' && (
        <div className="pause-menu">
          <div className="pause-content">
            <h2>PAUSED</h2>
            <button
              className="menu-button"
              onClick={() =>
                useGameStore.getState().setGameState('playing')
              }
            >
              Resume
            </button>
            <button
              className="menu-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <GraphicsSettings onClose={() => setShowSettings(false)} />
      )}

      {gameState === 'playing' && (
        <>
          {/* Camera Mode Indicator */}
          <div className="camera-mode-indicator">
            {cameraModeDisplay}
          </div>

          {/* Controls Hint */}
          <div className="controls-hint">
            <div className="controls-grid">
              <div className="control-group">
                <span className="control-label">Movement</span>
                <span className="control-keys">W A S D / Arrow Keys</span>
              </div>
              <div className="control-group">
                <span className="control-label">Brake</span>
                <span className="control-keys">Shift</span>
              </div>
              <div className="control-group">
                <span className="control-label">Handbrake</span>
                <span className="control-keys">Space</span>
              </div>
              <div className="control-group">
                <span className="control-label">Camera</span>
                <span className="control-keys">V</span>
              </div>
              <div className="control-group">
                <span className="control-label">Debug</span>
                <span className="control-keys">F3</span>
              </div>
              <div className="control-group">
                <span className="control-label">Pause</span>
                <span className="control-keys">ESC</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
