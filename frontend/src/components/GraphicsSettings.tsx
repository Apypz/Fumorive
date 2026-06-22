import { useGameStore } from '../stores/gameStore'

interface GraphicsSettingsProps {
  onClose: () => void
}

type Quality = 'low' | 'medium' | 'high'

const PRESETS: { id: Quality; label: string; desc: string }[] = [
  {
    id: 'low',
    label: 'LOW',
    desc: 'Paling ringan — tanpa bayangan & efek, resolusi internal lebih rendah. Untuk perangkat berat/lemah.',
  },
  {
    id: 'medium',
    label: 'MEDIUM',
    desc: 'Seimbang — bayangan standar plus efek ringan. Disarankan untuk kebanyakan perangkat.',
  },
  {
    id: 'high',
    label: 'HIGH',
    desc: 'Kualitas terbaik — bayangan tajam beresolusi tinggi & seluruh efek pasca-proses.',
  },
]

export function GraphicsSettings({ onClose }: GraphicsSettingsProps) {
  const graphicsConfig = useGameStore((s) => s.graphicsConfig)
  const setGraphicsPreset = useGameStore((s) => s.setGraphicsPreset)

  // Each preset has a distinct shadowQuality, so it doubles as the active-tier id.
  const active = graphicsConfig.shadowQuality

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Kualitas Grafis</h2>
        <p style={styles.subtitle}>
          Detail grafis diatur otomatis oleh sistem mengikuti tingkat kualitas yang dipilih.
        </p>

        <div style={styles.presetList}>
          {PRESETS.map((p) => {
            const isActive = active === p.id
            return (
              <button
                key={p.id}
                style={{ ...styles.presetCard, ...(isActive ? styles.presetCardActive : {}) }}
                onClick={() => setGraphicsPreset(p.id)}
              >
                <div style={styles.presetHeader}>
                  <span style={styles.presetName}>{p.label}</span>
                  {isActive && <span style={styles.activeBadge}>AKTIF</span>}
                </div>
                <span style={styles.presetDesc}>{p.desc}</span>
              </button>
            )
          })}
        </div>

        <button style={styles.closeButton} onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    backdropFilter: 'blur(5px)',
  },
  container: {
    backgroundColor: '#1a1a24',
    borderRadius: '12px',
    padding: '2rem',
    minWidth: '420px',
    maxWidth: '520px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '0.5rem',
    textAlign: 'center',
    letterSpacing: '0.08em',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  },
  presetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  presetCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.4rem',
    width: '100%',
    padding: '0.9rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  presetCardActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.18)',
    borderColor: '#667eea',
    boxShadow: '0 0 0 1px #667eea',
  },
  presetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  presetName: {
    fontSize: '0.95rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  activeBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#c7d2fe',
    backgroundColor: 'rgba(102, 126, 234, 0.4)',
    borderRadius: '999px',
    padding: '2px 8px',
    letterSpacing: '0.06em',
  },
  presetDesc: {
    fontSize: '0.78rem',
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 1.45,
  },
  closeButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
