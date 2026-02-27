import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import './EEGMonitoringWidget.css'
import { useEEGStore } from '../stores/eegStore'
import { useEEGWebSocket } from '../hooks/useEEGWebSocket'
import { useAlertStore } from '../stores/alertStore'

interface EEGMonitoringWidgetProps {
  sessionId: string
  defaultPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onStateChange?: (state: 'alert' | 'drowsy' | 'fatigued' | undefined) => void
}

/**
 * EEG Monitoring Widget - Floating panel for in-game EEG display
 * 
 * Similar to CameraFatigueMonitor but for EEG data
 * Features:
 * - Draggable position
 * - Collapsible/expandable
 * - Real-time metrics
 * - Compact display
 */
export const EEGMonitoringWidget: React.FC<EEGMonitoringWidgetProps> = ({
  sessionId,
  defaultPosition = 'top-right',
  onStateChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [position, setPosition] = useState(getDefaultPosition(defaultPosition))
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  // EEG Store
  const currentMetrics = useEEGStore((state) => state.currentMetrics)
  const isConnected = useEEGStore((state) => state.isConnected)
  const connectionError = useEEGStore((state) => state.connectionError)

  const addAlert = useAlertStore((state) => state.addAlert)

  // WebSocket Connection
  useEEGWebSocket({
    sessionId,
    enabled: !!sessionId,
    onMetricsReceived: (metrics) => {
      if (metrics.cognitiveState) {
        onStateChange?.(metrics.cognitiveState as 'alert' | 'drowsy' | 'fatigued')
      }
    },
    onAlertReceived: (alert) => {
      console.log('[Widget] Alert received:', alert)
      addAlert(alert)
    },
  })

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      setPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'alert':
        return '#10b981'
      case 'drowsy':
        return '#f59e0b'
      case 'fatigued':
        return '#ef4444'
      default:
        return '#6b7280'
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

  if (!sessionId) {
    return null
  }

  return (
    <>
      <div
        className="eeg-widget"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Header - Draggable */}
        <div
          className="eeg-widget-header"
          onMouseDown={handleMouseDown}
        >
          <div className="eeg-widget-title">
            <span className="eeg-widget-icon">🧠</span>
            <span>EEG Monitor</span>
            <span
              className={`eeg-widget-status ${isConnected ? 'connected' : 'disconnected'}`}
            />
          </div>

          <div className="eeg-widget-controls">
            <button
              className="eeg-widget-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Content - Collapsible */}
        {!isCollapsed && (
          <div className="eeg-widget-content">
            {/* Connection Status */}
            <div className="eeg-widget-status-bar">
              <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
              <span className="status-text">
                {isConnected
                  ? '🟢 Connected (Live)'
                  : connectionError
                    ? `🔴 Error: ${connectionError.substring(0, 30)}...`
                    : '🔴 Connecting...'}
              </span>
            </div>

            {/* Session ID - copyable for EEG terminal */}
            <div style={{
              margin: '4px 8px 8px',
              padding: '6px 8px',
              background: '#1e293b',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '3px', fontWeight: 600, letterSpacing: '0.5px' }}>SESSION ID (copy ke terminal EEG)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <code style={{
                  flex: 1,
                  fontSize: '10px',
                  color: '#38bdf8',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  userSelect: 'all',
                  cursor: 'text',
                  lineHeight: '1.3',
                }}>
                  {sessionId || 'Belum ada session'}
                </code>
                {sessionId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(sessionId)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    style={{
                      background: copied ? '#059669' : '#334155',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      color: 'white',
                      fontSize: '9px',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                    title="Copy Session ID"
                  >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'OK!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            {currentMetrics ? (
              <>
                {/* Cognitive State - Large */}
                <div className="eeg-widget-state">
                  <div className="state-label">State</div>
                  <div
                    className="state-badge"
                    style={{ borderColor: getStateColor(currentMetrics.cognitiveState) }}
                  >
                    {getStateLabel(currentMetrics.cognitiveState)}
                  </div>
                </div>

                {/* Fatigue Score */}
                <div className="eeg-widget-fatigue">
                  <div className="fatigue-label">Fatigue</div>
                  <div className="fatigue-value">
                    {(currentMetrics.eegFatigueScore || 0).toFixed(0)}%
                  </div>
                  <div className="fatigue-bar">
                    <div
                      className="fatigue-fill"
                      style={{
                        width: `${currentMetrics.eegFatigueScore || 0}%`,
                        backgroundColor: getStateColor(currentMetrics.cognitiveState),
                      }}
                    />
                  </div>
                </div>

                {/* Raw Channels - Compact */}
                <div className="eeg-widget-channels">
                  <div className="channels-label">Channels (µV)</div>
                  <div className="channels-grid">
                    <div className="channel">
                      <span className="channel-name">TP9</span>
                      <span className="channel-value">
                        {(currentMetrics.rawChannels.TP9 || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="channel">
                      <span className="channel-name">AF7</span>
                      <span className="channel-value">
                        {(currentMetrics.rawChannels.AF7 || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="channel">
                      <span className="channel-name">AF8</span>
                      <span className="channel-value">
                        {(currentMetrics.rawChannels.AF8 || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="channel">
                      <span className="channel-name">TP10</span>
                      <span className="channel-value">
                        {(currentMetrics.rawChannels.TP10 || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signal Quality Indicator */}
                {(() => {
                  const quality = (currentMetrics.signalQuality || 0) * 100
                  const qColor = quality >= 70 ? '#10b981' : quality >= 40 ? '#f59e0b' : '#ef4444'
                  const qLabel = quality >= 70 ? 'Good' : quality >= 40 ? 'Fair' : 'Poor'
                  return (
                    <div style={{ padding: '6px 8px', borderTop: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px' }}>SIGNAL QUALITY</span>
                        <span style={{ fontSize: 11, color: qColor, fontWeight: 700 }}>{qLabel} · {quality.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${quality}%`,
                          background: qColor,
                          borderRadius: 3,
                          transition: 'width 0.4s, background 0.4s',
                          boxShadow: `0 0 6px ${qColor}88`,
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                        {[
                          { label: '●', active: quality < 40, color: '#ef4444', title: 'Poor' },
                          { label: '●', active: quality >= 40 && quality < 70, color: '#f59e0b', title: 'Fair' },
                          { label: '●', active: quality >= 70, color: '#10b981', title: 'Good' },
                        ].map((dot, i) => (
                          <span key={i} title={dot.title} style={{ fontSize: 8, color: dot.active ? dot.color : '#334155', transition: 'color 0.3s' }}>{dot.label}</span>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Indicators */}
                <div className="eeg-widget-indicators">
                  <div className="indicator">
                    <span className="indicator-name">θ/α</span>
                    <span className="indicator-value">
                      {(currentMetrics.thetaAlphaRatio || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="indicator">
                    <span className="indicator-name">β/α</span>
                    <span className="indicator-value">
                      {(currentMetrics.betaAlphaRatio || 0).toFixed(3)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="eeg-widget-no-data">
                <p>Waiting for EEG data...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function getDefaultPosition(pos: string) {
  const offset = 20
  const width = 280
  const height = 380

  switch (pos) {
    case 'top-right':
      return { x: window.innerWidth - width - offset, y: offset }
    case 'top-left':
      return { x: offset, y: offset }
    case 'bottom-right':
      return { x: window.innerWidth - width - offset, y: window.innerHeight - height - offset }
    case 'bottom-left':
      return { x: offset, y: window.innerHeight - height - offset }
    default:
      return { x: window.innerWidth - width - offset, y: offset }
  }
}

export default EEGMonitoringWidget

