import { useState, useEffect } from 'react'
import { useViolationStore, type ViolationType } from '../stores/violationStore'

const TYPE_LABELS: Record<ViolationType, { label: string; icon: string; color: string }> = {
  collision: { label: 'Tabrakan', icon: '💥', color: '#ef4444' },
  speeding: { label: 'Ngebut', icon: '🚨', color: '#f59e0b' },
  'wrong-way': { label: 'Lawan Arah', icon: '⛔', color: '#dc2626' },
  'red-light': { label: 'Lampu Merah', icon: '🚦', color: '#e11d48' },
  'off-road': { label: 'Keluar Jalur', icon: '🚧', color: '#f97316' },
}

export function ViolationHUD() {
  const { totalPoints, violations } = useViolationStore()
  const [flashActive, setFlashActive] = useState(false)
  const [showLog, setShowLog] = useState(false)

  // Flash effect when new violation
  useEffect(() => {
    if (violations.length === 0) return
    setFlashActive(true)
    const timer = setTimeout(() => setFlashActive(false), 800)
    return () => clearTimeout(timer)
  }, [violations.length])

  // Status color based on total points
  const getStatusColor = () => {
    if (totalPoints === 0) return '#34d399' // Green - clean
    if (totalPoints < 30) return '#fbbf24' // Yellow - warning
    if (totalPoints < 60) return '#f97316' // Orange - danger
    return '#ef4444' // Red - critical
  }

  const getStatusLabel = () => {
    if (totalPoints === 0) return 'BERSIH'
    if (totalPoints < 30) return 'PERINGATAN'
    if (totalPoints < 60) return 'BAHAYA'
    return 'KRITIS'
  }

  // Get recent violations (last 3)
  const recentViolations = violations.slice(-3).reverse()

  // Count by type
  const typeCounts = violations.reduce<Partial<Record<ViolationType, number>>>((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {})

  const statusColor = getStatusColor()

  return (
    <div
      style={{
        ...styles.container,
        borderColor: flashActive ? '#ef4444' : 'rgba(255,255,255,0.15)',
        boxShadow: flashActive ? '0 0 20px rgba(239,68,68,0.5)' : '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>⚠️ PELANGGARAN</span>
        <button
          style={styles.toggleBtn}
          onClick={() => setShowLog(!showLog)}
          title={showLog ? 'Tutup log' : 'Lihat log'}
        >
          {showLog ? '▼' : '▶'}
        </button>
      </div>

      {/* Points Display */}
      <div style={styles.pointsRow}>
        <div style={{
          ...styles.pointsValue,
          color: statusColor,
          textShadow: flashActive ? `0 0 12px ${statusColor}` : 'none',
        }}>
          {totalPoints}
        </div>
        <div style={styles.pointsLabel}>
          <span style={{ color: '#9ca3af', fontSize: '9px' }}>POIN</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: statusColor,
          }}>
            {getStatusLabel()}
          </span>
        </div>
      </div>

      {/* Violation count badges */}
      {violations.length > 0 && (
        <div style={styles.badgeRow}>
          {(Object.entries(typeCounts) as [ViolationType, number][]).map(([type, count]) => {
            const config = TYPE_LABELS[type]
            return (
              <div
                key={type}
                style={{
                  ...styles.badge,
                  borderColor: config.color + '55',
                  backgroundColor: config.color + '22',
                }}
                title={config.label}
              >
                <span style={{ fontSize: '10px' }}>{config.icon}</span>
                <span style={{ fontSize: '10px', color: config.color, fontWeight: 'bold' }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Expandable violation log */}
      {showLog && recentViolations.length > 0 && (
        <div style={styles.logContainer}>
          <div style={styles.logHeader}>Riwayat Terbaru</div>
          {recentViolations.map((v) => {
            const config = TYPE_LABELS[v.type]
            const timeAgo = Math.round((Date.now() - v.timestamp) / 1000)
            return (
              <div key={v.id} style={styles.logItem}>
                <span style={{ fontSize: '11px' }}>{config.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: '#d1d5db' }}>{config.label}</span>
                </div>
                <span style={{ fontSize: '10px', color: config.color, fontWeight: 'bold' }}>
                  +{v.points}
                </span>
                <span style={{ fontSize: '9px', color: '#6b7280', minWidth: '30px', textAlign: 'right' }}>
                  {timeAgo}s
                </span>
              </div>
            )
          })}
          <div style={{ fontSize: '9px', color: '#6b7280', textAlign: 'center', marginTop: '4px' }}>
            Total: {violations.length} pelanggaran
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '2rem',
    left: '230px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: '10px 14px',
    borderRadius: '8px',
    color: 'white',
    fontFamily: 'monospace',
    minWidth: '140px',
    maxWidth: '180px',
    border: '1px solid rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    zIndex: 100,
    pointerEvents: 'auto',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  title: {
    fontSize: '10px',
    color: '#9ca3af',
    letterSpacing: '0.05em',
    fontWeight: 'bold',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '10px',
    padding: '2px 4px',
  },
  pointsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
  },
  pointsValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    lineHeight: 1,
    transition: 'color 0.3s ease, text-shadow 0.3s ease',
  },
  pointsLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
  },
  badgeRow: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap' as const,
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid',
  },
  logContainer: {
    marginTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '6px',
  },
  logHeader: {
    fontSize: '9px',
    color: '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  logItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
}

// Add flash animation keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = `
    @keyframes violationFlash {
      0% { background-color: rgba(239, 68, 68, 0.3); }
      100% { background-color: rgba(0, 0, 0, 0.75); }
    }
  `
  if (!document.querySelector('style[data-violation-hud]')) {
    styleSheet.setAttribute('data-violation-hud', 'true')
    document.head.appendChild(styleSheet)
  }
}
