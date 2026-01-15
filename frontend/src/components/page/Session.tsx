// src/pages/Session.tsx
import { useState } from 'react'
import { GameCanvas } from '../GameCanvas'
import { LoadingScreen } from '../LoadingScreen'
import { DebugOverlay } from '../DebugOverlay'
import { GraphicsSettings } from '../GraphicsSettings'
import { useGameStore } from '../../stores/gameStore'
import '../../App.css'

export default function Session() {
  const { gameState } = useGameStore()
  const [showSettings, setShowSettings] = useState(false)

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
        <div className="controls-hint">
          <span>
            Drag to rotate • Scroll to zoom • F3 Debug • ESC Pause
          </span>
        </div>
      )}
    </div>
  )
}
