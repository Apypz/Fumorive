/**
 * HUDToggleBar
 * ============
 * Compact pill bar pinned to the top-right corner (below the EEG widget).
 * Each button toggles one HUD section on/off.
 *
 * Sections:
 *   🚗  Vehicle     — speedometer, gear, steering wheel, radio, drift
 *   🧭  Navigation  — waypoint, traffic light
 *   ⚠️  Violations  — violation panel, toasts, wrong-way / off-road
 *   🧠  Monitoring  — EEG, camera fatigue, fusion score
 */
import { useHudStore } from '../stores/hudStore'
import { useState } from 'react'

interface SectionBtn {
  key: 'vehicle' | 'navigation' | 'violations' | 'monitoring'
  icon: string
  label: string
  toggle: () => void
  active: boolean
}

export function HUDToggleBar() {
  const {
    showVehicle, toggleVehicle,
    showNavigation, toggleNavigation,
    showViolations, toggleViolations,
    showMonitoring, toggleMonitoring,
    hideAll, showAll,
  } = useHudStore()

  const [expanded, setExpanded] = useState(false)

  const sections: SectionBtn[] = [
    { key: 'vehicle',    icon: '🚗', label: 'Kendaraan',  toggle: toggleVehicle,    active: showVehicle },
    { key: 'navigation', icon: '🧭', label: 'Navigasi',   toggle: toggleNavigation, active: showNavigation },
    { key: 'violations', icon: '⚠️', label: 'Pelanggaran',toggle: toggleViolations, active: showViolations },
    { key: 'monitoring', icon: '🧠', label: 'Monitoring', toggle: toggleMonitoring, active: showMonitoring },
  ]

  const allOn  = sections.every((s) => s.active)
  const allOff = sections.every((s) => !s.active)

  return (
    <div style={styles.wrapper}>
      {/* Collapse/expand toggle tab */}
      <button
        style={styles.collapseBtn}
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Sembunyikan panel' : 'Panel tampilan HUD'}
      >
        <span style={{ fontSize: '11px', opacity: 0.7 }}>HUD</span>
        <span style={{ fontSize: '10px', marginLeft: '4px' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Panel — only shown when expanded */}
      {expanded && (
        <div style={styles.panel}>
          {/* Section toggles */}
          <div style={styles.btnRow}>
            {sections.map((s) => (
              <button
                key={s.key}
                style={{
                  ...styles.sectionBtn,
                  background: s.active
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  borderColor: s.active
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(255,255,255,0.10)',
                  opacity: s.active ? 1 : 0.5,
                }}
                onClick={s.toggle}
                title={`${s.active ? 'Sembunyikan' : 'Tampilkan'} ${s.label}`}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{s.icon}</span>
                <span style={styles.btnLabel}>{s.label}</span>
                <span style={{
                  ...styles.dot,
                  background: s.active ? '#34d399' : '#4b5563',
                  boxShadow: s.active ? '0 0 6px #34d39988' : 'none',
                }} />
              </button>
            ))}
          </div>

          {/* Show all / Hide all */}
          <div style={styles.allRow}>
            <button
              style={{
                ...styles.allBtn,
                opacity: allOn ? 0.4 : 1,
              }}
              disabled={allOn}
              onClick={showAll}
            >
              Tampilkan Semua
            </button>
            <button
              style={{
                ...styles.allBtn,
                opacity: allOff ? 0.4 : 1,
              }}
              disabled={allOff}
              onClick={hideAll}
            >
              Sembunyikan Semua
            </button>
          </div>

          <div style={styles.hint}>Tekan tombol untuk hide/show tiap bagian HUD</div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    // Below EEGMonitoringWidget which sits at top-right with ~280px width
    top: '1rem',
    right: '1rem',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    pointerEvents: 'auto',
  },
  collapseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    background: 'rgba(0,0,0,0.75)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '8px',
    padding: '5px 10px',
    color: '#fff',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    transition: 'background 0.2s',
  },
  panel: {
    background: 'rgba(0,0,0,0.82)',
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: '12px',
    padding: '10px 12px',
    backdropFilter: 'blur(12px)',
    minWidth: '210px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  btnRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '8px',
  },
  sectionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 10px',
    border: '1px solid',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  btnLabel: {
    flex: 1,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 0.2s, box-shadow 0.2s',
  },
  allRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
  },
  allBtn: {
    flex: 1,
    padding: '5px 8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    transition: 'opacity 0.2s',
  },
  hint: {
    fontSize: '9px',
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 1.4,
  },
}
