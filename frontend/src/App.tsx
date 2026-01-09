import { useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { LoadingScreen } from './components/LoadingScreen'
import { DebugOverlay } from './components/DebugOverlay'
import { GraphicsSettings } from './components/GraphicsSettings'
import { useGameStore } from './stores/gameStore'
import './App.css'

function App() {
  const { gameState } = useGameStore()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="app">
      {/* Game Canvas */}
      <GameCanvas />

      {/* Loading Screen */}
      <LoadingScreen />

      {/* Debug Overlay */}
      <DebugOverlay />

      {/* Pause Menu */}
      {gameState === 'paused' && (
        <div className="pause-menu">
          <div className="pause-content">
            <h2>PAUSED</h2>
            <button
              className="menu-button"
              onClick={() => useGameStore.getState().setGameState('playing')}
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

      {/* Settings Modal */}
      {showSettings && (
        <GraphicsSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Controls Hint */}
      {gameState === 'playing' && (
        <div className="controls-hint">
          <span>Drag to rotate • Scroll to zoom • F3 Debug • ESC Pause</span>
        </div>
      )}
    </div>
  )
}

export default App
