import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { EEGDashboard } from '@/components/EEGDashboard'
import './EEGMonitoringPage.css'

/**
 * EEG Monitoring Page
 * 
 * Displays real-time EEG data streaming from Muse2 via the backend.
 * 
 * Usage:
 * - Navigate here with a valid session ID
 * - Ensure backend and eeg-processing server are running
 * - Muse2 device must be paired and streaming via LSL
 */
export const EEGMonitoringPage: React.FC = () => {
  const navigate = useNavigate()
  const sessionId = useUserStore((state) => state.sessionId)
  const userId = useUserStore((state) => state.userId)

  const [cognitiveState, setCognitiveState] = useState<'alert' | 'drowsy' | 'fatigued'>('alert')
  const [stateHistory, setStateHistory] = useState<Array<{ timestamp: Date; state: string }>>([])
  const [showAlert, setShowAlert] = useState(false)

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate('/login')
    }
  }, [sessionId, navigate])

  // Handle cognitive state changes
  const handleCognitiveStateChange = (state: 'alert' | 'drowsy' | 'fatigued' | undefined) => {
    if (state && state !== cognitiveState) {
      setCognitiveState(state)
      setStateHistory((prev) => [
        ...prev.slice(-99), // Keep last 100 entries
        { timestamp: new Date(), state },
      ])

      // Show alert for fatigued state
      if (state === 'fatigued') {
        setShowAlert(true)
        setTimeout(() => setShowAlert(false), 5000)
      }
    }
  }

  if (!sessionId) {
    return null
  }

  return (
    <div className="eeg-monitoring-page">
      {/* Header */}
      <header className="monitoring-header">
        <div className="header-content">
          <h1>EEG Real-Time Monitoring</h1>
          <p>Monitoring Muse 2 Brain Activity During Driving Simulation</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-back"
            onClick={() => navigate('/game')}
            title="Return to game"
          >
            ← Back to Game
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {showAlert && cognitiveState === 'fatigued' && (
        <div className="fatigue-alert">
          <span className="alert-icon">⚠️</span>
          <span className="alert-message">
            High fatigue detected! Please take a break or pull over safely.
          </span>
          <button
            className="alert-close"
            onClick={() => setShowAlert(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="monitoring-content">
        {/* Primary EEG Dashboard */}
        <section className="dashboard-section">
          <EEGDashboard
            sessionId={sessionId}
            backendUrl={`ws://${import.meta.env.VITE_BACKEND_URL || 'localhost:8000'}`}
            showWaveforms={true}
            onStateChange={handleCognitiveStateChange}
          />
        </section>

        {/* State History */}
        <section className="state-history-section">
          <div className="history-container">
            <h2>Cognitive State Timeline</h2>
            <div className="timeline">
              {stateHistory.length === 0 ? (
                <p className="no-data">No state changes recorded yet</p>
              ) : (
                <div className="timeline-items">
                  {stateHistory.slice().reverse().map((item, idx) => (
                    <div
                      key={idx}
                      className={`timeline-item state-${item.state}`}
                    >
                      <div className="timeline-time">
                        {item.timestamp.toLocaleTimeString('id-ID')}
                      </div>
                      <div className={`timeline-state state-${item.state}`}>
                        {item.state.charAt(0).toUpperCase() + item.state.slice(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Session Info */}
        <section className="session-info-section">
          <div className="info-card">
            <h3>Session Information</h3>
            <dl>
              <dt>Session ID</dt>
              <dd title={sessionId}>{sessionId.substring(0, 16)}...</dd>
              <dt>User ID</dt>
              <dd>{userId}</dd>
              <dt>Current State</dt>
              <dd>
                <span className={`badge badge-${cognitiveState}`}>
                  {cognitiveState.toUpperCase()}
                </span>
              </dd>
              <dt>State Changes</dt>
              <dd>{stateHistory.length}</dd>
            </dl>
          </div>

          <div className="info-card">
            <h3>Instructions</h3>
            <ul>
              <li>Ensure Muse 2 headband is properly fitted</li>
              <li>Check signal quality is above 80% for accurate readings</li>
              <li>Keep device within Bluetooth range (10m)</li>
              <li>Avoid excessive movement during measurement</li>
              <li>Calibration takes ~10 seconds at start</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>Cognitive States</h3>
            <div className="state-legend">
              <div className="legend-item alert">
                <span className="dot"></span>
                <span>Alert - Normal driving state</span>
              </div>
              <div className="legend-item drowsy">
                <span className="dot"></span>
                <span>Drowsy - Reduced alertness</span>
              </div>
              <div className="legend-item fatigued">
                <span className="dot"></span>
                <span>Fatigued - High risk state</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="monitoring-footer">
        <p>
          EEG data is continuously recorded and analyzed. Stay safe while driving!
        </p>
      </footer>
    </div>
  )
}

export default EEGMonitoringPage
