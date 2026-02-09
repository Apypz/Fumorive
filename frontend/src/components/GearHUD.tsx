/**
 * GearHUD
 * =======
 * Shows current gear, transmission mode, and RPM indicator.
 * Positioned near the speedometer.
 */

import { useGameStore } from '../stores/gameStore'

export function GearHUD() {
  const { currentGear, transmissionMode } = useGameStore()

  const gearName = currentGear === -1 ? 'R' : currentGear === 0 ? 'N' : `${currentGear}`

  // Color for each gear state
  const gearColor = currentGear === -1
    ? '#ef4444'   // Red for reverse
    : currentGear === 0
      ? '#fbbf24'   // Yellow for neutral
      : '#34d399'   // Green for forward

  return (
    <div style={styles.container}>
      {/* Transmission mode badge */}
      <div style={{
        ...styles.modeBadge,
        backgroundColor: transmissionMode === 'automatic'
          ? 'rgba(96, 165, 250, 0.25)'
          : 'rgba(251, 191, 36, 0.25)',
        borderColor: transmissionMode === 'automatic'
          ? 'rgba(96, 165, 250, 0.5)'
          : 'rgba(251, 191, 36, 0.5)',
        color: transmissionMode === 'automatic' ? '#60a5fa' : '#fbbf24',
      }}>
        {transmissionMode === 'automatic' ? 'A' : 'M'}
      </div>

      {/* Gear display */}
      <div style={{
        ...styles.gearDisplay,
        color: gearColor,
        textShadow: `0 0 12px ${gearColor}60`,
      }}>
        {gearName}
      </div>

      {/* Gear label */}
      <div style={styles.label}>GEAR</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '2rem',
    left: '165px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    pointerEvents: 'none',
  },
  modeBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  gearDisplay: {
    fontSize: '36px',
    fontWeight: 800,
    fontFamily: 'monospace',
    lineHeight: 1,
  },
  label: {
    fontSize: '9px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: '0.15em',
  },
}
