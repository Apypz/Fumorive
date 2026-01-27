import { useGameStore } from '../stores/gameStore'

// Helper function to get camera mode display name
function getCameraModeDisplay(mode: string): string {
  switch (mode) {
    case 'third-person':
      return '3rd Person'
    case 'first-person':
      return '1st Person'
    case 'free':
      return 'Free'
    default:
      return mode
  }
}

export function ControlsHUD() {
  const { controlMode, cameraMode } = useGameStore()

  return (
    <div style={styles.container}>
      {/* Control Mode Indicator */}
      <div style={styles.modeSection}>
        <div style={styles.modeLabel}>STEERING</div>
        <div style={styles.modeValue}>
          {controlMode === 'keyboard' ? (
            <span style={styles.keyboardMode}>KEYBOARD</span>
          ) : (
            <span style={styles.mouseMode}>MOUSE</span>
          )}
        </div>
      </div>

      {/* Camera Mode Indicator */}
      <div style={styles.modeSection}>
        <div style={styles.modeLabel}>CAMERA</div>
        <div style={styles.modeValue}>
          <span style={cameraMode === 'free' ? styles.freeMode : styles.cameraMode}>
            {getCameraModeDisplay(cameraMode).toUpperCase()}
          </span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Controls Guide */}
      <div style={styles.controlsSection}>
        <div style={styles.sectionTitle}>CONTROLS</div>
        
        {/* Movement */}
        <div style={styles.controlGroup}>
          <div style={styles.controlRow}>
            <span style={styles.keyBadge}>W</span>
            <span style={styles.controlDesc}>Maju</span>
          </div>
          <div style={styles.controlRow}>
            <span style={styles.keyBadge}>S</span>
            <span style={styles.controlDesc}>Mundur</span>
          </div>
        </div>

        {/* Steering */}
        <div style={styles.controlGroup}>
          {controlMode === 'keyboard' ? (
            <>
              <div style={styles.controlRow}>
                <span style={styles.keyBadge}>A</span>
                <span style={styles.controlDesc}>Belok Kiri</span>
              </div>
              <div style={styles.controlRow}>
                <span style={styles.keyBadge}>D</span>
                <span style={styles.controlDesc}>Belok Kanan</span>
              </div>
            </>
          ) : (
            <div style={styles.controlRow}>
              <span style={styles.mouseBadge}>Mouse</span>
              <span style={styles.controlDesc}>Geser untuk belok</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.controlGroup}>
          <div style={styles.controlRow}>
            <span style={styles.keyBadge}>SPACE/SHIFT</span>
            <span style={styles.controlDesc}>Rem</span>
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Toggle Keys */}
      <div style={styles.toggleSection}>
        <div style={styles.sectionTitle}>TOGGLE</div>
        <div style={styles.controlRow}>
          <span style={styles.keyBadgeHighlight}>C</span>
          <span style={styles.controlDesc}>Ganti Mode Steering</span>
        </div>
        <div style={styles.controlRow}>
          <span style={styles.keyBadge}>V</span>
          <span style={styles.controlDesc}>Ganti Kamera</span>
        </div>
      </div>

      {/* Hints */}
      {controlMode === 'mouse' && cameraMode !== 'free' && (
        <>
          <div style={styles.divider} />
          <div style={styles.hint}>
            Gerakkan mouse ke kiri/kanan untuk steering yang lebih halus
          </div>
        </>
      )}
      
      {cameraMode === 'free' && (
        <>
          <div style={styles.divider} />
          <div style={styles.hint}>
            Mouse untuk kamera. Steering otomatis kembali ke tengah.
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '1rem',
    right: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '0.75rem',
    color: '#fff',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    minWidth: '180px',
    maxWidth: '220px',
  },
  modeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  modeLabel: {
    fontSize: '0.65rem',
    opacity: 0.6,
    letterSpacing: '0.05em',
  },
  modeValue: {
    fontWeight: 'bold',
  },
  keyboardMode: {
    color: '#60a5fa', // Blue
  },
  mouseMode: {
    color: '#34d399', // Green
  },
  cameraMode: {
    color: '#a78bfa', // Purple
  },
  freeMode: {
    color: '#fbbf24', // Yellow/Orange
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '0.5rem 0',
  },
  controlsSection: {
    marginBottom: '0.25rem',
  },
  sectionTitle: {
    fontSize: '0.6rem',
    opacity: 0.5,
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
  },
  controlGroup: {
    marginBottom: '0.5rem',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  keyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '20px',
    padding: '0 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  keyBadgeHighlight: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '20px',
    padding: '0 6px',
    backgroundColor: 'rgba(52, 211, 153, 0.3)', // Green highlight
    border: '1px solid rgba(52, 211, 153, 0.5)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#34d399',
  },
  mouseBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '20px',
    padding: '0 8px',
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    color: '#34d399',
  },
  controlDesc: {
    opacity: 0.8,
    fontSize: '0.7rem',
  },
  toggleSection: {},
  hint: {
    fontSize: '0.6rem',
    opacity: 0.5,
    lineHeight: 1.4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}
