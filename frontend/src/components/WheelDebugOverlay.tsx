/**
 * WheelDebugOverlay
 * =================
 * Live diagnostics + calibration for the racing wheel (Kaiju XR1). Only renders
 * while a gamepad/wheel is connected. Shows every axis and button in real time so
 * the correct STEERING axis can be identified (turn the wheel and watch which
 * axis bar swings), then assigned with one click. The choice is saved to
 * localStorage via wheelConfig and picked up by the car controller immediately.
 */

import { useEffect, useRef, useState } from 'react'
import {
  getWheelSteerAxis,
  setWheelSteerAxis,
  getWheelSteerInvert,
  setWheelSteerInvert,
} from '../game/utils/wheelConfig'

interface PadSnapshot {
  id: string
  index: number
  mapping: string
  axes: number[]
  buttons: { pressed: boolean; value: number }[]
}

export function WheelDebugOverlay() {
  const [pad, setPad] = useState<PadSnapshot | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [steerAxis, setSteerAxisState] = useState(getWheelSteerAxis())
  const [invert, setInvertState] = useState(getWheelSteerInvert())
  const rafRef = useRef(0)

  useEffect(() => {
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      let g: Gamepad | null = null
      for (const p of pads) {
        if (p) {
          g = p
          break
        }
      }
      setPad(
        g
          ? {
              id: g.id,
              index: g.index,
              mapping: g.mapping || '(non-standard)',
              axes: Array.from(g.axes),
              buttons: g.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
            }
          : null
      )
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  if (!pad) return null

  // Highlight the axis moving the most — that's almost certainly the steering.
  let activeAxis = -1
  let activeMag = 0.18
  pad.axes.forEach((v, i) => {
    if (Math.abs(v) > activeMag) {
      activeMag = Math.abs(v)
      activeAxis = i
    }
  })

  const pickAxis = (i: number) => {
    setWheelSteerAxis(i)
    setSteerAxisState(i)
  }
  const toggleInvert = () => {
    const v = !invert
    setWheelSteerInvert(v)
    setInvertState(v)
  }

  if (collapsed) {
    return (
      <button style={{ ...styles.tab, ...styles.tabCollapsed }} onClick={() => setCollapsed(false)}>
        🎮 Setir
      </button>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>🎮 KALIBRASI SETIR</span>
        <button style={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Sembunyikan">
          ✕
        </button>
      </div>

      <div style={styles.device} title={pad.id}>
        {pad.id}
      </div>
      <div style={styles.hint}>
        Putar setir penuh kiri↔kanan, lihat <b>axis</b> mana yang bergerak, lalu klik{' '}
        <b>Jadikan Setir</b>.
      </div>

      {/* Axes */}
      <div style={styles.sectionLabel}>AXES</div>
      {pad.axes.map((v, i) => {
        const isSteer = i === steerAxis
        const isActive = i === activeAxis
        const pct = (Math.max(-1, Math.min(1, v)) * 0.5 + 0.5) * 100
        return (
          <div key={i} style={styles.axisRow}>
            <span style={{ ...styles.axisName, color: isSteer ? '#34d399' : isActive ? '#fb923c' : '#cbd5e1' }}>
              AX{i}
              {isSteer ? ' ●' : ''}
            </span>
            <div style={styles.barTrack}>
              <div style={styles.barCenter} />
              <div
                style={{
                  ...styles.barFill,
                  left: `${Math.min(50, pct)}%`,
                  width: `${Math.abs(pct - 50)}%`,
                  background: isSteer ? '#34d399' : isActive ? '#fb923c' : '#64748b',
                }}
              />
            </div>
            <span style={styles.axisVal}>{v.toFixed(2)}</span>
            <button
              style={{ ...styles.setBtn, ...(isSteer ? styles.setBtnActive : {}) }}
              onClick={() => pickAxis(i)}
            >
              {isSteer ? 'Setir' : 'Jadikan Setir'}
            </button>
          </div>
        )
      })}

      <div style={styles.invertRow}>
        <span style={styles.controlDesc}>Arah belok kebalik?</span>
        <button
          style={{ ...styles.invertBtn, ...(invert ? styles.invertBtnOn : {}) }}
          onClick={toggleInvert}
        >
          {invert ? 'DIBALIK' : 'NORMAL'}
        </button>
      </div>

      {/* Buttons */}
      <div style={styles.sectionLabel}>BUTTONS (gas=7 · rem=6 · paddle=4/5)</div>
      <div style={styles.btnGrid}>
        {pad.buttons.map((b, i) => (
          <div
            key={i}
            style={{
              ...styles.btnChip,
              background: b.pressed ? '#22c55e' : b.value > 0.05 ? '#f59e0b' : 'rgba(255,255,255,0.08)',
              color: b.pressed || b.value > 0.05 ? '#0b1220' : '#94a3b8',
            }}
            title={`button ${i}: ${b.value.toFixed(2)}`}
          >
            {i}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: '11.5rem',
    left: '1rem',
    zIndex: 300,
    width: '270px',
    background: 'rgba(10, 15, 25, 0.92)',
    border: '1px solid rgba(251, 146, 60, 0.5)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#e2e8f0',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '11px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  title: { fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#fb923c' },
  collapseBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
  },
  device: {
    fontSize: '10px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '4px',
  },
  hint: { fontSize: '10px', color: '#cbd5e1', lineHeight: 1.45, marginBottom: '8px' },
  sectionLabel: {
    fontSize: '9px',
    letterSpacing: '0.08em',
    color: '#64748b',
    margin: '8px 0 4px',
    fontWeight: 700,
  },
  axisRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' },
  axisName: { width: '34px', fontWeight: 700, fontFamily: 'monospace', fontSize: '10px' },
  barTrack: {
    position: 'relative',
    flex: 1,
    height: '10px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  barCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: '1px',
    background: 'rgba(255,255,255,0.3)',
  },
  barFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: '2px' },
  axisVal: {
    width: '34px',
    textAlign: 'right',
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#cbd5e1',
  },
  setBtn: {
    fontSize: '9px',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    borderRadius: '4px',
    padding: '2px 5px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  setBtnActive: {
    background: 'rgba(52, 211, 153, 0.25)',
    borderColor: '#34d399',
    color: '#34d399',
  },
  invertRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
  },
  controlDesc: { fontSize: '10px', color: '#cbd5e1' },
  invertBtn: {
    fontSize: '10px',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    borderRadius: '4px',
    padding: '3px 10px',
    cursor: 'pointer',
  },
  invertBtnOn: { background: 'rgba(251, 146, 60, 0.25)', borderColor: '#fb923c', color: '#fb923c' },
  btnGrid: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  btnChip: {
    width: '22px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  tab: {
    position: 'fixed',
    top: '11.5rem',
    left: '1rem',
    zIndex: 300,
    cursor: 'pointer',
  },
  tabCollapsed: {
    background: 'rgba(10, 15, 25, 0.92)',
    border: '1px solid rgba(251, 146, 60, 0.5)',
    borderRadius: '8px',
    color: '#fb923c',
    fontSize: '11px',
    fontWeight: 700,
    padding: '5px 10px',
    backdropFilter: 'blur(8px)',
  },
}
