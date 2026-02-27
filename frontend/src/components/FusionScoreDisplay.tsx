import React, { useState, useRef, useEffect } from 'react'
import { useFusionScore } from '../hooks/useFusionScore'
import './FusionScoreDisplay.css'

interface FusionScoreDisplayProps {
  cameraFatigueScore: number
}

const LEVEL_CONFIG = {
  alert:   { color: '#10b981', bg: '#022c22', label: 'ALERT',   icon: '✓' },
  drowsy:  { color: '#f59e0b', bg: '#2d1c00', label: 'DROWSY',  icon: '⚠' },
  fatigued:{ color: '#ef4444', bg: '#2d0a0a', label: 'FATIGUE', icon: '✕' },
}

export const FusionScoreDisplay: React.FC<FusionScoreDisplayProps> = ({ cameraFatigueScore }) => {
  const fusion = useFusionScore(cameraFatigueScore)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 })
  const isDraggingRef = useRef(false)
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 200 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 220, dragRef.current.posX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 160, dragRef.current.posY + dy)),
      })
    }
    const handleMouseUp = () => {
      setIsDragging(false)
      isDraggingRef.current = false
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    isDraggingRef.current = true
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: position.x, posY: position.y }
  }

  // Don't render if no data at all
  if (fusion.confidence === 0) return null

  const cfg = LEVEL_CONFIG[fusion.level]
  const scoreFormatted = fusion.score.toFixed(0)

  return (
    <div
      className={`fusion-widget fusion-${fusion.level}`}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        borderColor: cfg.color,
        background: cfg.bg,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="fusion-header">
        <span className="fusion-title">⚡ Fusion Score</span>
        {fusion.isFused && (
          <span className="fusion-badge-fused">EEG+CAM</span>
        )}
      </div>

      {/* Main score */}
      <div className="fusion-main" style={{ color: cfg.color }}>
        <span className="fusion-icon">{cfg.icon}</span>
        <span className="fusion-score">{scoreFormatted}</span>
        <span className="fusion-unit">%</span>
        <span className="fusion-level-label" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Score bar */}
      <div className="fusion-bar-bg">
        <div
          className="fusion-bar-fill"
          style={{
            width: `${fusion.score}%`,
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}88`,
          }}
        />
      </div>

      {/* Breakdown */}
      <div className="fusion-breakdown">
        {/* EEG row */}
        <div className="fusion-row">
          <span className="fusion-src-label">🧠 EEG</span>
          <div className="fusion-mini-bar-bg">
            <div
              className="fusion-mini-bar-fill"
              style={{
                width: fusion.eegScore !== null ? `${fusion.eegScore}%` : '0%',
                background: '#38bdf8',
                opacity: fusion.eegScore !== null ? 1 : 0.3,
              }}
            />
          </div>
          <span className="fusion-src-val">
            {fusion.eegScore !== null ? `${fusion.eegScore.toFixed(0)}%` : 'N/A'}
          </span>
        </div>

        {/* Camera row */}
        <div className="fusion-row">
          <span className="fusion-src-label">📷 CAM</span>
          <div className="fusion-mini-bar-bg">
            <div
              className="fusion-mini-bar-fill"
              style={{
                width: fusion.cameraScore !== null ? `${fusion.cameraScore}%` : '0%',
                background: '#a78bfa',
                opacity: fusion.cameraScore !== null ? 1 : 0.3,
              }}
            />
          </div>
          <span className="fusion-src-val">
            {fusion.cameraScore !== null ? `${fusion.cameraScore.toFixed(0)}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Confidence */}
      <div className="fusion-confidence">
        Conf: {(fusion.confidence * 100).toFixed(0)}%
        {fusion.isFused && <span className="fusion-fused-dot" style={{ background: cfg.color }} />}
      </div>
    </div>
  )
}
