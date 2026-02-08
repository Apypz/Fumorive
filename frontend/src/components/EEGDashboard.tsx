import React from 'react'
import { useEEGStore } from '../stores/eegStore'
import { useEEGWebSocket } from '../hooks/useEEGWebSocket'
import { EEGMetricsDisplay } from './EEG/EEGMetricsDisplay'
import { EEGWaveformDisplay } from './EEG/EEGWaveformDisplay'
import './EEGDashboard.css'

interface EEGDashboardProps {
  sessionId: string
  backendUrl?: string
  showWaveforms?: boolean
  onStateChange?: (state: 'alert' | 'drowsy' | 'fatigued' | undefined) => void
}

export const EEGDashboard: React.FC<EEGDashboardProps> = ({
  sessionId,
  backendUrl = 'ws://localhost:8000',
  showWaveforms = true,
  onStateChange,
}) => {
  const currentMetrics = useEEGStore((state) => state.currentMetrics)
  const previousStateRef = React.useRef<string | undefined>(undefined)

  const { isConnected } = useEEGWebSocket({
    sessionId,
    backendUrl,
    onMetricsReceived: (metrics) => {
      // Notify parent component when cognitive state changes
      if (metrics.cognitiveState !== previousStateRef.current) {
        previousStateRef.current = metrics.cognitiveState
        onStateChange?.(metrics.cognitiveState as 'alert' | 'drowsy' | 'fatigued' | undefined)
      }
    },
    enabled: !!sessionId,
  })

  return (
    <div className="eeg-dashboard">
      {/* Header */}
      <div className="eeg-dashboard-header">
        <div className="header-title">
          <h2>EEG Monitoring System</h2>
          <span className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
        <div className="header-info">
          <span className="session-id">Session: {sessionId.substring(0, 8)}...</span>
        </div>
      </div>

      {/* Main Metrics Display */}
      <div className="eeg-dashboard-metrics">
        <EEGMetricsDisplay />
      </div>

      {/* Waveforms */}
      {showWaveforms && currentMetrics && (
        <div className="eeg-dashboard-waveforms">
          <h3>Real-Time Waveforms</h3>
          <div className="waveforms-container">
            <div className="waveform-group">
              <div className="waveform-label">TP9 (Temporal Left)</div>
              <EEGWaveformDisplay channel="TP9" width={500} height={140} />
            </div>
            <div className="waveform-group">
              <div className="waveform-label">AF7 (Prefrontal Left)</div>
              <EEGWaveformDisplay channel="AF7" width={500} height={140} />
            </div>
            <div className="waveform-group">
              <div className="waveform-label">AF8 (Prefrontal Right)</div>
              <EEGWaveformDisplay channel="AF8" width={500} height={140} />
            </div>
            <div className="waveform-group">
              <div className="waveform-label">TP10 (Temporal Right)</div>
              <EEGWaveformDisplay channel="TP10" width={500} height={140} />
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="eeg-dashboard-debug">
        <details>
          <summary>Debug Information</summary>
          <div className="debug-content">
            <p>
              <strong>Session ID:</strong> {sessionId}
            </p>
            <p>
              <strong>Connection:</strong> {isConnected ? 'Connected' : 'Disconnected'}
            </p>
            <p>
              <strong>Backend URL:</strong> {backendUrl}
            </p>
            <p>
              <strong>Last Update:</strong>{' '}
              {currentMetrics
                ? new Date(currentMetrics.timestamp).toLocaleTimeString('id-ID')
                : 'Never'}
            </p>
            <p>
              <strong>Waveforms Enabled:</strong> {showWaveforms ? 'Yes' : 'No'}
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}

export default EEGDashboard
