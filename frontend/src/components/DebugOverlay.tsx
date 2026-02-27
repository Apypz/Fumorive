import { useGameStore } from '../stores/gameStore'

export function DebugOverlay() {
  const { showDebugInfo, fps, graphicsConfig, gameState } = useGameStore()

  if (!showDebugInfo) return null

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <span style={styles.label}>FPS:</span>
        <span style={getFpsStyle(fps)}>{fps}</span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>State:</span>
        <span style={styles.value}>{gameState}</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <span style={styles.label}>Shadows:</span>
        <span style={styles.value}>{graphicsConfig.shadowQuality}</span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Post-FX:</span>
        <span style={styles.value}>{graphicsConfig.postProcessing ? 'ON' : 'OFF'}</span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>SSAO:</span>
        <span style={styles.value}>{graphicsConfig.ssao ? 'ON' : 'OFF'}</span>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Bloom:</span>
        <span style={styles.value}>{graphicsConfig.bloom ? 'ON' : 'OFF'}</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.hint}>F3: Toggle Debug</div>
      <div style={styles.hint}>F12: Inspector</div>
      <div style={styles.hint}>ESC: Pause</div>
    </div>
  )
}

function getFpsStyle(fps: number): React.CSSProperties {
  let color = '#4ade80' // Green
  if (fps < 30) color = '#f87171' // Red
  else if (fps < 50) color = '#fbbf24' // Yellow

  return {
    fontWeight: 'bold',
    color,
    fontVariantNumeric: 'tabular-nums',
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: '#fff',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    minWidth: '140px',
  },
  section: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  label: {
    opacity: 0.6,
    marginRight: '1rem',
  },
  value: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '0.5rem 0',
  },
  hint: {
    fontSize: '0.65rem',
    opacity: 0.4,
    marginTop: '0.25rem',
  },
}
