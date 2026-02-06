import React from 'react'
import { useEEGStore } from '../stores/eegStore'
import './EEGMetricsDisplay.css'

export const EEGMetricsDisplay: React.FC = () => {
  const currentMetrics = useEEGStore((state) => state.currentMetrics)
  const isConnected = useEEGStore((state) => state.isConnected)
  const connectionError = useEEGStore((state) => state.connectionError)
  const dataHistory = useEEGStore((state) => state.dataHistory)

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'alert':
        return '#28a745'
      case 'drowsy':
        return '#ffc107'
      case 'fatigued':
        return '#dc3545'
      default:
        return '#6c757d'
    }
  }

  const getStateLabel = (state?: string) => {
    switch (state) {
      case 'alert':
        return '✓ Alert'
      case 'drowsy':
        return '⚠ Drowsy'
      case 'fatigued':
        return '✕ Fatigued'
      default:
        return '? Unknown'
    }
  }

  return (
    <div className="eeg-metrics-container">
      {/* Header */}
      <div className="eeg-metrics-header">
        <h3>EEG Real-Time Metrics</h3>
        <div className="eeg-connection-status">
          <span
            className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
            title={connectionError || (isConnected ? 'Connected' : 'Disconnected')}
          />
          <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
          <span className="sample-count">{dataHistory.length} samples</span>
        </div>
      </div>

      {/* Error Display */}
      {connectionError && (
        <div className="eeg-error-banner">
          <span className="error-icon">⚠</span>
          <span className="error-message">{connectionError}</span>
        </div>
      )}

      {/* No Data Message */}
      {!currentMetrics && (
        <div className="eeg-no-data">
          <p>Waiting for EEG data...</p>
        </div>
      )}

      {/* Metrics Grid */}
      {currentMetrics && (
        <div className="eeg-metrics-grid">
          {/* Cognitive State - Large Card */}
          <div className="eeg-metric-card large cognitive-state">
            <div className="metric-label">Cognitive State</div>
            <div
              className="metric-value state-badge"
              style={{ borderColor: getStateColor(currentMetrics.cognitiveState) }}
            >
              {getStateLabel(currentMetrics.cognitiveState)}
            </div>
            <div className="metric-subtext">
              Fatigue: {(currentMetrics.eegFatigueScore || 0).toFixed(1)}%
            </div>
          </div>

          {/* Raw Channels */}
          <div className="eeg-metric-card channels">
            <div className="metric-label">Raw Channels (µV)</div>
            <div className="channels-grid">
              <div className="channel-value">
                <span className="channel-name">TP9</span>
                <span className="channel-data">{(currentMetrics.rawChannels.TP9 || 0).toFixed(2)}</span>
              </div>
              <div className="channel-value">
                <span className="channel-name">AF7</span>
                <span className="channel-data">{(currentMetrics.rawChannels.AF7 || 0).toFixed(2)}</span>
              </div>
              <div className="channel-value">
                <span className="channel-name">AF8</span>
                <span className="channel-data">{(currentMetrics.rawChannels.AF8 || 0).toFixed(2)}</span>
              </div>
              <div className="channel-value">
                <span className="channel-name">TP10</span>
                <span className="channel-data">{(currentMetrics.rawChannels.TP10 || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Band Powers */}
          <div className="eeg-metric-card band-powers">
            <div className="metric-label">Frequency Bands</div>
            <div className="bands-list">
              <div className="band-item">
                <span className="band-name">Delta (1-4 Hz)</span>
                <span className="band-value">{(currentMetrics.deltapower || 0).toFixed(4)}</span>
              </div>
              <div className="band-item">
                <span className="band-name">Theta (4-8 Hz)</span>
                <span className="band-value">{(currentMetrics.thetaPower || 0).toFixed(4)}</span>
              </div>
              <div className="band-item">
                <span className="band-name">Alpha (8-13 Hz)</span>
                <span className="band-value">{(currentMetrics.alphaPower || 0).toFixed(4)}</span>
              </div>
              <div className="band-item">
                <span className="band-name">Beta (13-30 Hz)</span>
                <span className="band-value">{(currentMetrics.betaPower || 0).toFixed(4)}</span>
              </div>
              <div className="band-item">
                <span className="band-name">Gamma (30-45 Hz)</span>
                <span className="band-value">{(currentMetrics.gammaPower || 0).toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Ratios & Quality */}
          <div className="eeg-metric-card ratios">
            <div className="metric-label">Cognitive Indicators</div>
            <div className="ratios-list">
              <div className="ratio-item">
                <span className="ratio-name">θ/α Ratio</span>
                <span className="ratio-value">{(currentMetrics.thetaAlphaRatio || 0).toFixed(3)}</span>
                <span className="ratio-hint">(drowsiness)</span>
              </div>
              <div className="ratio-item">
                <span className="ratio-name">β/α Ratio</span>
                <span className="ratio-value">{(currentMetrics.betaAlphaRatio || 0).toFixed(3)}</span>
                <span className="ratio-hint">(engagement)</span>
              </div>
              <div className="ratio-item">
                <span className="ratio-name">Signal Quality</span>
                <span className="ratio-value">{((currentMetrics.signalQuality || 0) * 100).toFixed(1)}%</span>
                <span className="ratio-hint">(confidence)</span>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="eeg-metric-card timestamp">
            <div className="metric-label">Timestamp</div>
            <div className="metric-value timestamp-value">
              {new Date(currentMetrics.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="metric-subtext">
              {new Date(currentMetrics.timestamp).toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
