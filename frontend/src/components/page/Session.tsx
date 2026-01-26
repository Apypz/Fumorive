// src/pages/Session.tsx
import { useState } from 'react'
import { GameCanvas } from '../GameCanvas'
import { LoadingScreen } from '../LoadingScreen'
import { DebugOverlay } from '../DebugOverlay'
import { GraphicsSettings } from '../GraphicsSettings'
import { ControlsHUD } from '../ControlsHUD'
import { SteeringWheelHUD } from '../SteeringWheelHUD'
import { MapSelection } from '../MapSelection'
import { useGameStore } from '../../stores/gameStore'
import '../../App.css'

export default function Session() {
  const { gameState, setGameState } = useGameStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showMapSelection, setShowMapSelection] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)

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
          
          {/* Steering Wheel visualization */}
          <SteeringWheelHUD />
        </>
      )}
    </div>
  )
}
