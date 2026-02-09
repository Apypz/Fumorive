import { useGameStore } from '../stores/gameStore'

export function DriftMeter() {
  const { slipAngle, currentSpeed } = useGameStore()

  // Calculate slip intensity (0-100%)
  const absSlipAngle = Math.abs(slipAngle)
  const slipIntensity = Math.min(100, (absSlipAngle / 30) * 100)
  
  // Only show if moving
  if (currentSpeed < 5) {
    return null
  }
  
  // Get color based on intensity
  const getColor = () => {
    if (slipIntensity < 30) return '#3b82f6' // Blue - light
    if (slipIntensity < 60) return '#f59e0b' // Orange - moderate
    return '#ef4444' // Red - heavy
  }

  const color = getColor()
  const direction = slipAngle > 1 ? 'R' : slipAngle < -1 ? 'L' : '-'

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.label}>SLIP ANGLE</span>
        <span style={{
          ...styles.direction,
          color: direction !== '-' ? color : '#6b7280',
        }}>
          {direction}
        </span>
      </div>

      {/* Angle Value */}
      <div style={{
        ...styles.angleValue,
        color: color,
      }}>
        {absSlipAngle.toFixed(1)}°
      </div>

      {/* Progress Bar */}
      <div style={styles.barBackground}>
        <div style={{
          ...styles.barFill,
          width: `${slipIntensity}%`,
          backgroundColor: color,
        }} />
      </div>

      {/* Percentage */}
      <div style={styles.percentage}>
        {slipIntensity.toFixed(0)}%
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '260px',
    left: '2rem',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '10px 16px',
    borderRadius: '6px',
    color: 'white',
    fontFamily: 'monospace',
    minWidth: '160px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    zIndex: 99,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  label: {
    fontSize: '10px',
    color: '#9ca3af',
    letterSpacing: '0.05em',
  },
  direction: {
    fontSize: '11px',
    fontWeight: 'bold',
  },
  angleValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
    transition: 'color 0.2s ease',
  },
  barBackground: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.1s ease-out, background-color 0.2s ease',
  },
  percentage: {
    fontSize: '10px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '4px',
  },
}
