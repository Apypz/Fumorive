import { useState, useEffect } from 'react'
import { GameCanvas } from '../GameCanvas'
import { LoadingScreen } from '../LoadingScreen'
import { DebugOverlay } from '../DebugOverlay'
import { GraphicsSettings } from '../GraphicsSettings'
import { ControlsHUD } from '../ControlsHUD'
import { SteeringWheelHUD } from '../SteeringWheelHUD'
import { SpeedometerHUD } from '../SpeedometerHUD'
import { GearHUD } from '../GearHUD'
import { RadioHUD } from '../RadioHUD'
import { MapSelection } from '../MapSelection'
import { CameraFatigueMonitor } from '../CameraFatigueMonitor'
import { EEGMonitoringWidget } from '../EEGMonitoringWidget'
import { AlertNotification } from '../AlertNotification'
import { FusionScoreDisplay } from '../FusionScoreDisplay'
import { ViolationHUD } from '../ViolationHUD'
import { WrongWayWarning } from '../WrongWayWarning'
import { OffRoadWarning } from '../OffRoadWarning'
import { ViolationToast } from '../ViolationToast'
import { TrafficLightHUD } from '../TrafficLightHUD'
import { WheelDebugOverlay } from '../WheelDebugOverlay'
import { WaypointHUD } from '../WaypointHUD'
import { TutorialPopup } from '../TutorialPopup'
import { HUDToggleBar } from '../HUDToggleBar'
import { useGameStore } from '../../stores/gameStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useWaypointStore } from '../../stores/waypointStore'
import { useViolationStore } from '../../stores/violationStore'
import { useHudStore } from '../../stores/hudStore'
import { User } from 'lucide-react'
import '../../App.css'

export default function Session() {
  const { gameState, setGameState, selectedMap, currentLevel, mapSeed, playerName, setPlayerName } = useGameStore()
  const { sessionId, initializeSession } = useSessionStore()
  const { showVehicle, showNavigation, showViolations, showMonitoring } = useHudStore()
  const [showSettings, setShowSettings] = useState(false)
  const [step, setStep] = useState<'name-input' | 'map-select' | 'game'>('name-input')
  const [nameInput, setNameInput] = useState(playerName)
  const [nameError, setNameError] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [cameraFatigueScore, setCameraFatigueScore] = useState(0)
  const [eegEnabled] = useState(true)
  const [eegCognitiveState, setEegCognitiveState] = useState<'alert' | 'drowsy' | 'fatigued' | undefined>()
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => { initializeSession() }, [initializeSession])

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) { setNameError('Nama tidak boleh kosong'); return }
    if (trimmed.length < 2) { setNameError('Nama minimal 2 karakter'); return }
    setNameError('')
    setPlayerName(trimmed)
    setStep('map-select')
  }

  const handleStartGame = () => {
    setStep('game')
    setGameStarted(true)
    setShowTutorial(true)
    useViolationStore.getState().resetViolations()
  }

  const handleBackToMapSelect = () => {
    setStep('map-select')
    setGameStarted(false)
    setGameState('loading')
    useWaypointStore.getState().resetWaypoints()
    useViolationStore.getState().resetViolations()
  }

  const isPlaying = gameState === 'playing' && gameStarted

  return (
    <div className="app">

      {/* ── STEP 1: Name Input ─────────────────────────────────────────── */}
      {step === 'name-input' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '24px', padding: '48px 56px', width: '420px', maxWidth: '92vw',
            textAlign: 'center', boxShadow: '0 0 60px rgba(99,102,241,0.15)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <User size={28} color="#a5b4fc" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '0.05em' }}>
              Siapa Namamu?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', margin: '0 0 28px', lineHeight: 1.6 }}>
              Namamu akan dicantumkan di laporan hasil analisis sesi ini.
            </p>
            <div style={{ position: 'relative', marginBottom: nameError ? '8px' : '24px' }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Masukkan nama lengkap..."
                autoFocus
                maxLength={50}
                style={{
                  width: '100%', padding: '14px 18px', fontSize: '1rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${nameError ? '#ef4444' : 'rgba(99,102,241,0.4)'}`,
                  borderRadius: '12px', color: '#fff', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = nameError ? '#ef4444' : 'rgba(99,102,241,0.4)' }}
              />
            </div>
            {nameError && (
              <p style={{ color: '#f87171', fontSize: '0.82rem', margin: '0 0 16px', textAlign: 'left' }}>⚠ {nameError}</p>
            )}
            <button
              onClick={handleNameSubmit}
              style={{
                width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                letterSpacing: '0.06em', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Lanjut ke Pilih Level →
            </button>
            <div style={{ marginTop: '16px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
              Nama tidak akan dibagikan dan hanya digunakan untuk identifikasi laporan.
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Map / Level Selection ─────────────────────────────── */}
      {step === 'map-select' && (
        <MapSelection onStartGame={handleStartGame} onBack={() => setStep('name-input')} />
      )}

      {showTutorial && gameStarted && <TutorialPopup onClose={() => setShowTutorial(false)} />}
      {gameStarted && <AlertNotification />}
      {gameStarted && <GameCanvas key={`${selectedMap}-${currentLevel}-${mapSeed}`} />}
      {gameStarted && <LoadingScreen />}
      <DebugOverlay />

      {/* Pause Menu */}
      {gameState === 'paused' && gameStarted && (
        <div className="pause-menu">
          <div className="pause-content">
            <h2>PAUSED</h2>
            <button className="menu-button" onClick={() => setGameState('playing')}>Resume</button>
            <button className="menu-button" onClick={() => setShowSettings(true)}>Settings</button>
            <button className="menu-button" onClick={handleBackToMapSelect} style={{ marginTop: '1rem', backgroundColor: '#6b7280' }}>
              Ganti Level
            </button>
          </div>
        </div>
      )}

      {showSettings && <GraphicsSettings onClose={() => setShowSettings(false)} />}

      {/* ═══════════════════════════════════════════════════════════════
          IN-GAME HUD — hanya aktif saat state === 'playing'
      ═══════════════════════════════════════════════════════════════ */}
      {isPlaying && (
        <>
          {/* HUD toggle panel — selalu visible */}
          <HUDToggleBar />

          {/* Controls panel — sudah punya toggle sendiri */}
          <ControlsHUD />

          {/* Wheel calibration — self-gating on gamepad */}
          <WheelDebugOverlay />

          {/* ── BOTTOM-LEFT cluster: Radio → Speedo + Gear + Violation ── */}
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '2rem',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
          }}>
            {/* Row 1: Radio */}
            {showVehicle && <RadioHUD />}

            {/* Row 2: Speedometer + Gear + Violation — semua rata bawah */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              {showVehicle && <SpeedometerHUD />}
              {showVehicle && <GearHUD />}
              {showViolations && <ViolationHUD />}
            </div>
          </div>

          {/* ── BOTTOM-CENTER: Steering wheel ────────────────────────── */}
          {showVehicle && <SteeringWheelHUD />}

          {/* ── TOP-LEFT: Waypoint navigation ────────────────────────── */}
          {showNavigation && <WaypointHUD />}

          {/* ── TOP-CENTER: Traffic light state ──────────────────────── */}
          {showNavigation && <TrafficLightHUD />}

          {/* ── VIOLATIONS: warnings + toasts ────────────────────────── */}
          {showViolations && (
            <>
              <ViolationToast />
              <WrongWayWarning />
              <OffRoadWarning />
            </>
          )}

          {/* ── MONITORING: EEG + Camera + Fusion ────────────────────── */}
          {showMonitoring && (
            <>
              <CameraFatigueMonitor
                isEnabled={cameraEnabled}
                onToggle={() => setCameraEnabled(!cameraEnabled)}
                onFatigueScoreChange={setCameraFatigueScore}
              />
              {eegEnabled && (
                <EEGMonitoringWidget
                  sessionId={sessionId}
                  defaultPosition="top-right"
                  onStateChange={setEegCognitiveState}
                />
              )}
              <FusionScoreDisplay cameraFatigueScore={cameraFatigueScore} />
            </>
          )}
        </>
      )}

      {/* Keep camera running even when paused */}
      {gameStarted && !isPlaying && (
        <CameraFatigueMonitor
          isEnabled={cameraEnabled}
          onToggle={() => setCameraEnabled(!cameraEnabled)}
          onFatigueScoreChange={setCameraFatigueScore}
        />
      )}
    </div>
  )
}

