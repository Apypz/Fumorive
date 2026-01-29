import { useGameStore } from '../stores/gameStore'

export function SpeedometerHUD() {
  const { currentSpeed, isDrifting, cameraMode } = useGameStore()
  
  // Don't show in first-person mode
  if (cameraMode === 'first-person') {
    return null
  }

  // Calculate needle rotation
  // Max speed is 150 km/h, needle rotates from -135 to 135 degrees (270 degree arc)
  const maxSpeed = 150
  const clampedSpeed = Math.min(currentSpeed, maxSpeed)
  const needleRotation = -135 + (clampedSpeed / maxSpeed) * 270

  // Speed zone colors
  const getSpeedColor = () => {
    if (currentSpeed < 40) return '#34d399' // Green - slow
    if (currentSpeed < 80) return '#fbbf24' // Yellow - medium
    return '#ef4444' // Red - fast
  }

  return (
    <div style={styles.container}>
      {/* Speedometer SVG - Dashboard style */}
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
        }}
      >
        {/* Definitions */}
        <defs>
          {/* Background gradient */}
          <radialGradient id="speedBgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          
          {/* Outer ring gradient */}
          <linearGradient id="speedRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#444" />
            <stop offset="50%" stopColor="#222" />
            <stop offset="100%" stopColor="#333" />
          </linearGradient>
          
          {/* Glow effect for active zone */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="75"
          fill="url(#speedBgGradient)"
          stroke="url(#speedRingGradient)"
          strokeWidth="4"
        />
        
        {/* Inner ring */}
        <circle
          cx="80"
          cy="80"
          r="68"
          fill="none"
          stroke="#333"
          strokeWidth="1"
        />

        {/* Speed arc background */}
        <path
          d="M 25 115 A 65 65 0 1 1 135 115"
          fill="none"
          stroke="#2a2a2a"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* Speed arc - active portion */}
        <path
          d="M 25 115 A 65 65 0 1 1 135 115"
          fill="none"
          stroke={getSpeedColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(clampedSpeed / maxSpeed) * 295} 295`}
          style={{
            transition: 'stroke-dasharray 0.1s ease-out, stroke 0.3s ease',
            filter: isDrifting ? 'url(#glow)' : 'none',
          }}
        />

        {/* Speed tick marks */}
        {[0, 30, 60, 90, 120, 150].map((speed, i) => {
          const angle = (-135 + (speed / maxSpeed) * 270) * (Math.PI / 180)
          const x1 = 80 + 55 * Math.cos(angle)
          const y1 = 80 + 55 * Math.sin(angle)
          const x2 = 80 + 65 * Math.cos(angle)
          const y2 = 80 + 65 * Math.sin(angle)
          const textX = 80 + 45 * Math.cos(angle)
          const textY = 80 + 45 * Math.sin(angle)
          
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#666"
                strokeWidth="2"
              />
              <text
                x={textX}
                y={textY}
                fill="#888"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {speed}
              </text>
            </g>
          )
        })}
        
        {/* Small tick marks */}
        {[...Array(16)].map((_, i) => {
          if (i % 3 === 0) return null // Skip major tick positions
          const speed = (i / 15) * maxSpeed
          const angle = (-135 + (speed / maxSpeed) * 270) * (Math.PI / 180)
          const x1 = 80 + 60 * Math.cos(angle)
          const y1 = 80 + 60 * Math.sin(angle)
          const x2 = 80 + 65 * Math.cos(angle)
          const y2 = 80 + 65 * Math.sin(angle)
          
          return (
            <line
              key={`small-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#444"
              strokeWidth="1"
            />
          )
        })}

        {/* Needle pivot */}
        <circle
          cx="80"
          cy="80"
          r="8"
          fill="#333"
          stroke="#444"
          strokeWidth="2"
        />

        {/* Needle */}
        <g
          style={{
            transform: `rotate(${needleRotation}deg)`,
            transformOrigin: '80px 80px',
            transition: 'transform 0.05s ease-out',
          }}
        >
          <polygon
            points="80,25 76,80 84,80"
            fill="#ef4444"
          />
          <polygon
            points="80,30 78,80 82,80"
            fill="#ff6b6b"
          />
        </g>
        
        {/* Needle center cap */}
        <circle
          cx="80"
          cy="80"
          r="5"
          fill="#1a1a1a"
          stroke="#555"
          strokeWidth="1"
        />

        {/* km/h label */}
        <text
          x="80"
          y="110"
          fill="#666"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
        >
          km/h
        </text>
      </svg>

      {/* Digital speed display */}
      <div style={{
        ...styles.digitalDisplay,
        color: getSpeedColor(),
        textShadow: isDrifting ? `0 0 10px ${getSpeedColor()}` : 'none',
      }}>
        <span style={styles.speedValue}>{Math.round(currentSpeed)}</span>
        <span style={styles.speedUnit}>km/h</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '2rem',
    left: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    zIndex: 100,
    pointerEvents: 'none',
  },
  digitalDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.25rem',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
    transition: 'color 0.3s ease, text-shadow 0.3s ease',
  },
  speedValue: {
    fontSize: '1.5rem',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: '-0.05em',
    minWidth: '3ch',
    textAlign: 'right',
  },
  speedUnit: {
    fontSize: '0.7rem',
    fontFamily: 'system-ui, sans-serif',
    opacity: 0.7,
  },
}

// Add keyframes animation via style tag
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = `
    @keyframes pulse {
      from { opacity: 0.8; transform: scale(1); }
      to { opacity: 1; transform: scale(1.05); }
    }
  `
  if (!document.querySelector('style[data-speedometer]')) {
    styleSheet.setAttribute('data-speedometer', 'true')
    document.head.appendChild(styleSheet)
  }
}
