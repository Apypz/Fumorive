import React, { useEffect, useRef } from 'react'
import { useEEGStore } from '../../stores/eegStore'
import './EEGWaveformDisplay.css'

interface EEGWaveformDisplayProps {
  channel?: 'TP9' | 'AF7' | 'AF8' | 'TP10'
  height?: number
  width?: number
  updateInterval?: number
}

const channelColors: Record<string, string> = {
  TP9: '#FF6B6B',
  AF7: '#4ECDC4',
  AF8: '#45B7D1',
  TP10: '#FFA07A',
}

export const EEGWaveformDisplay: React.FC<EEGWaveformDisplayProps> = ({
  channel = 'AF7',
  height = 120,
  width = 400,
  updateInterval = 50,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataHistory = useEEGStore((state: any) => state.dataHistory)
  const animationRef = useRef<number | null>(null)
  const lastDrawTimeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (timestamp: number) => {
      // Throttle drawing
      if (timestamp - lastDrawTimeRef.current < updateInterval) {
        animationRef.current = requestAnimationFrame(draw)
        return
      }
      lastDrawTimeRef.current = timestamp

      // Clear canvas
      ctx.fillStyle = '#f8f9fa'
      ctx.fillRect(0, 0, width, height)

      // Draw grid lines
      ctx.strokeStyle = '#e9ecef'
      ctx.lineWidth = 0.5

      for (let i = 0; i < width; i += 50) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, height)
        ctx.stroke()
      }

      // Horizontal center line
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      if (dataHistory.length < 2) return

      const maxDisplaySamples = Math.floor(width)
      const startIdx = Math.max(0, dataHistory.length - maxDisplaySamples)
      const displayData = dataHistory.slice(startIdx)

      if (displayData.length < 2) return

      // Find min/max for scaling
      let minVal = Infinity
      let maxVal = -Infinity

      displayData.forEach((item: any) => {
        const value = (item.rawChannels?.[channel] as number) || 0
        minVal = Math.min(minVal, value)
        maxVal = Math.max(maxVal, value)
      })

      const range = maxVal - minVal || 1
      minVal -= range * 0.1
      maxVal += range * 0.1

      // Draw waveform
      ctx.strokeStyle = channelColors[channel] || '#4ECDC4'
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.beginPath()

      displayData.forEach((item: any, idx: number) => {
        const value = (item.rawChannels?.[channel] as number) || 0
        const normalizedValue = (value - minVal) / (maxVal - minVal)
        const x = (idx / displayData.length) * width
        const y = height - normalizedValue * height

        if (idx === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()

      // Draw labels (avoid µ unicode — use uV instead)
      const lastVal = (displayData[displayData.length - 1]?.rawChannels?.[channel] as number)
      ctx.fillStyle = '#495057'
      ctx.font = '10px monospace'
      ctx.fillText(channel + ': ' + (lastVal?.toFixed(1) ?? 'N/A') + ' uV', 5, 12)
      ctx.fillText(minVal.toFixed(1) + ' - ' + maxVal.toFixed(1) + ' uV', 5, height - 5)

      animationRef.current = requestAnimationFrame(draw)
    }

    animationRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dataHistory, channel, width, height, updateInterval])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="eeg-waveform-canvas"
      style={{
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
      }}
    />
  )
}
