import { useGameStore } from '../stores/gameStore'

export function SteeringWheelHUD() {
  const { steeringAngle, cameraMode } = useGameStore()

  // Hide in first-person view (real steering wheel already visible in cockpit)
  if (cameraMode === 'first-person') return null

  // Convert steering input (-1 to 1) to rotation degrees
  // Max rotation is about 120 degrees each way for realistic steering
  const rotationDegrees = steeringAngle * 120

  return (
    <div style={styles.container}>
      {/* Steering wheel SVG - Realistic design */}
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{
          transform: `rotate(${rotationDegrees}deg)`,
          transition: 'transform 0.03s linear',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
        }}
      >
        {/* Definitions for gradients */}
        <defs>
          {/* Leather gradient for outer rim */}
          <linearGradient id="leatherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="30%" stopColor="#1a1a1a" />
            <stop offset="70%" stopColor="#252525" />
            <stop offset="100%" stopColor="#1f1f1f" />
          </linearGradient>
          
          {/* Metal gradient for spokes */}
          <linearGradient id="metalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#888" />
            <stop offset="50%" stopColor="#555" />
            <stop offset="100%" stopColor="#333" />
          </linearGradient>
          
          {/* Center cap gradient */}
          <radialGradient id="centerGradient" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#444" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </radialGradient>
          
          {/* Rim highlight */}
          <linearGradient id="rimHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>

        {/* Outer rim - main wheel */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="url(#leatherGradient)"
          strokeWidth="18"
        />
        
        {/* Rim highlight (top reflection) */}
        <path
          d="M 30 70 A 85 85 0 0 1 170 70"
          fill="none"
          stroke="url(#rimHighlight)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Grip texture lines on rim */}
        {[...Array(24)].map((_, i) => {
          const angle = (i * 15) * Math.PI / 180
          const x1 = 100 + 76 * Math.cos(angle)
          const y1 = 100 + 76 * Math.sin(angle)
          const x2 = 100 + 94 * Math.cos(angle)
          const y2 = 100 + 94 * Math.sin(angle)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(60,60,60,0.5)"
              strokeWidth="1"
            />
          )
        })}

        {/* Spoke - Top */}
        <path
          d="M 92 68 L 92 40 Q 100 35 108 40 L 108 68"
          fill="url(#metalGradient)"
          stroke="#222"
          strokeWidth="1"
        />
        
        {/* Spoke - Bottom Left */}
        <path
          d="M 92 68 L 92 40 Q 100 35 108 40 L 108 68"
          fill="url(#metalGradient)"
          stroke="#222"
          strokeWidth="1"
          transform="rotate(135 100 100)"
        />
        
        {/* Spoke - Bottom Right */}
        <path
          d="M 92 68 L 92 40 Q 100 35 108 40 L 108 68"
          fill="url(#metalGradient)"
          stroke="#222"
          strokeWidth="1"
          transform="rotate(225 100 100)"
        />

        {/* Center hub - outer ring */}
        <circle
          cx="100"
          cy="100"
          r="32"
          fill="url(#centerGradient)"
          stroke="#333"
          strokeWidth="2"
        />
        
        {/* Center hub - inner ring */}
        <circle
          cx="100"
          cy="100"
          r="24"
          fill="#1a1a1a"
          stroke="#444"
          strokeWidth="1"
        />
        
        {/* Center logo area */}
        <circle
          cx="100"
          cy="100"
          r="16"
          fill="#222"
          stroke="#555"
          strokeWidth="1"
        />
        
        {/* Center logo - simple car icon */}
        <path
          d="M 92 103 L 94 98 L 106 98 L 108 103 L 108 106 L 92 106 Z"
          fill="#666"
        />
        <circle cx="95" cy="106" r="2" fill="#888" />
        <circle cx="105" cy="106" r="2" fill="#888" />

        {/* Top center marker (12 o'clock indicator) */}
        <rect
          x="97"
          y="6"
          width="6"
          height="12"
          rx="2"
          fill="#c9302c"
        />
      </svg>

      {/* Steering angle indicator */}
      <div style={styles.angleIndicator}>
        <span style={styles.angleValue}>{Math.round(rotationDegrees)}°</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    zIndex: 100,
    pointerEvents: 'none',
  },
  angleIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '0.35rem 1rem',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
  },
  angleValue: {
    color: '#fff',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
}
