/**
 * WheelDebugOverlay
 * =================
 * Live diagnostics + calibration for the racing wheel (Kaiju XR1, X-Input).
 * Renders while any gamepad is connected. It scans every connected gamepad and,
 * when you move a control, reports exactly which device + axis/button changed —
 * then lets you assign that input to steering / gas / brake. Saved to
 * localStorage and picked up by the car controller live.
 */

import { useEffect, useRef, useState } from 'react'
import {
  getWheelMapping,
  setWheelMapping,
  resetWheelMapping,
  type PedalSource,
} from '../game/utils/wheelConfig'

interface PadSnapshot {
  id: string
  index: number
  mapping: string
  axes: number[]
  buttons: { pressed: boolean; value: number }[]
}

interface Moved {
  gp: number
  kind: 'AX' | 'BTN'
  idx: number
}

const CHANGE_THRESHOLD = 0.15

function srcLabel(s: PedalSource): string {
  return `${s.type === 'axis' ? 'AX' : 'BTN'}${s.index}${s.invert ? ' ↺' : ''}`
}

export function WheelDebugOverlay() {
  const [pads, setPads] = useState<PadSnapshot[]>([])
  const [selected, setSelected] = useState(0)
  const [moved, setMoved] = useState<Moved | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const rafRef = useRef(0)
  const prevRef = useRef<Map<number, { axes: number[]; buttons: number[] }>>(new Map())

  useEffect(() => {
    const poll = () => {
      const list = navigator.getGamepads ? navigator.getGamepads() : []
      const snaps: PadSnapshot[] = []
      let best: { mag: number; m: Moved | null } = { mag: CHANGE_THRESHOLD, m: null }

      for (const p of list) {
        if (!p) continue
        snaps.push({
          id: p.id,
          index: p.index,
          mapping: p.mapping || '(non-standard)',
          axes: Array.from(p.axes),
          buttons: p.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
        })
        const prev = prevRef.current.get(p.index)
        if (prev) {
          p.axes.forEach((v, i) => {
            const d = Math.abs(v - (prev.axes[i] ?? 0))
            if (d > best.mag) best = { mag: d, m: { gp: p.index, kind: 'AX', idx: i } }
          })
          p.buttons.forEach((b, i) => {
            const d = Math.abs(b.value - (prev.buttons[i] ?? 0))
            if (d > best.mag) best = { mag: d, m: { gp: p.index, kind: 'BTN', idx: i } }
          })
        }
        prevRef.current.set(p.index, {
          axes: Array.from(p.axes),
          buttons: p.buttons.map((b) => b.value),
        })
      }
      if (best.m) setMoved(best.m)
      setPads(snaps)
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  if (pads.length === 0) return null

  if (collapsed) {
    return (
      <button style={styles.tabCollapsed} onClick={() => setCollapsed(false)}>
        🎮 Setir
      </button>
    )
  }

  const map = getWheelMapping()
  const pad = pads.find((p) => p.index === selected) ?? pads[0]

  const assignFromMoved = (role: 'steer' | 'gas' | 'brake') => {
    if (!moved) return
    if (role === 'steer') {
      if (moved.kind !== 'AX') return
      setWheelMapping({ gamepadIndex: moved.gp, steerAxis: moved.idx })
      return
    }
    const cur = getWheelMapping()
    const src: PedalSource = {
      type: moved.kind === 'AX' ? 'axis' : 'button',
      index: moved.idx,
      invert: (role === 'gas' ? cur.gas : cur.brake).invert,
    }
    if (role === 'gas') setWheelMapping({ gamepadIndex: moved.gp, gas: src })
    else setWheelMapping({ gamepadIndex: moved.gp, brake: src })
  }

  const toggleSteerInvert = () =>
    setWheelMapping({ steerInvert: !getWheelMapping().steerInvert })
  const togglePedalInvert = (role: 'gas' | 'brake') => {
    const cur = getWheelMapping()
    const src = role === 'gas' ? cur.gas : cur.brake
    const next: PedalSource = { ...src, invert: !src.invert }
    if (role === 'gas') setWheelMapping({ gas: next })
    else setWheelMapping({ brake: next })
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>🎮 KALIBRASI SETIR</span>
        <button style={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Sembunyikan">
          ✕
        </button>
      </div>

      {/* Live "what moved" + assign */}
      <div style={styles.movedBox}>
        <div style={styles.movedLabel}>Gerakkan setir/pedal — terdeteksi:</div>
        {moved ? (
          <>
            <div style={styles.movedValue}>
              GP{moved.gp} · {moved.kind}
              {moved.idx}
            </div>
            <div style={styles.assignRow}>
              <button
                style={{ ...styles.assignBtn, ...(moved.kind !== 'AX' ? styles.assignDisabled : {}) }}
                onClick={() => assignFromMoved('steer')}
                disabled={moved.kind !== 'AX'}
              >
                → Setir
              </button>
              <button style={styles.assignBtn} onClick={() => assignFromMoved('gas')}>
                → Gas
              </button>
              <button style={styles.assignBtn} onClick={() => assignFromMoved('brake')}>
                → Rem
              </button>
            </div>
          </>
        ) : (
          <div style={styles.movedNone}>— belum ada gerakan terdeteksi —</div>
        )}
      </div>

      {/* Current mapping summary for the selected mode */}
      <div style={styles.sectionLabel}>MAPPING (X-INPUT)</div>
      <MapRow label="Setir" value={`GP${map.gamepadIndex ?? 'auto'} · AX${map.steerAxis}`} inverted={map.steerInvert} onInvert={toggleSteerInvert} />
      <MapRow label="Gas" value={srcLabel(map.gas)} inverted={map.gas.invert} onInvert={() => togglePedalInvert('gas')} />
      <MapRow label="Rem" value={srcLabel(map.brake)} inverted={map.brake.invert} onInvert={() => togglePedalInvert('brake')} />
      <button style={styles.resetBtn} onClick={() => resetWheelMapping()}>
        ↺ Reset ke default X-Input
      </button>

      {/* Device list */}
      <div style={styles.sectionLabel}>DEVICE ({pads.length})</div>
      <div style={styles.tabs}>
        {pads.map((p) => (
          <button
            key={p.index}
            style={{ ...styles.tab, ...(p.index === selected ? styles.tabActive : {}) }}
            onClick={() => setSelected(p.index)}
            title={p.id}
          >
            GP{p.index}
            {map.gamepadIndex === p.index ? ' ●' : ''}
          </button>
        ))}
      </div>
      <div style={styles.device} title={pad.id}>
        {pad.id} · {pad.axes.length} axes / {pad.buttons.length} btn
      </div>
      <button
        style={{ ...styles.useDeviceBtn, ...(map.gamepadIndex === pad.index ? styles.useDeviceBtnActive : {}) }}
        onClick={() => setWheelMapping({ gamepadIndex: pad.index })}
      >
        {map.gamepadIndex === pad.index ? '● Device kontrol mode ini' : 'Pakai device ini'}
      </button>

      {/* Axes */}
      <div style={styles.sectionLabel}>AXES</div>
      {pad.axes.length === 0 && <div style={styles.movedNone}>device ini tidak punya axis</div>}
      {pad.axes.map((v, i) => {
        const isSteer = map.gamepadIndex === pad.index && i === map.steerAxis
        const pct = (Math.max(-1, Math.min(1, v)) * 0.5 + 0.5) * 100
        return (
          <div key={i} style={styles.axisRow}>
            <span style={{ ...styles.axisName, color: isSteer ? '#34d399' : '#cbd5e1' }}>
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
                  background: isSteer ? '#34d399' : '#64748b',
                }}
              />
            </div>
            <span style={styles.axisVal}>{v.toFixed(2)}</span>
            <button
              style={styles.setBtn}
              onClick={() => setWheelMapping({ gamepadIndex: pad.index, steerAxis: i })}
            >
              Setir
            </button>
          </div>
        )
      })}

      {/* Buttons */}
      <div style={styles.sectionLabel}>BUTTONS</div>
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

function MapRow({
  label,
  value,
  inverted,
  onInvert,
}: {
  label: string
  value: string
  inverted: boolean
  onInvert: () => void
}) {
  return (
    <div style={styles.mapRow}>
      <span style={styles.mapLabel}>{label}</span>
      <span style={styles.mapValue}>{value}</span>
      <button
        style={{ ...styles.invertBtn, ...(inverted ? styles.invertBtnOn : {}) }}
        onClick={onInvert}
        title="Balik arah"
      >
        {inverted ? 'DIBALIK' : 'balik'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: '11.5rem',
    left: '1rem',
    zIndex: 300,
    width: '280px',
    maxHeight: '74vh',
    overflowY: 'auto',
    background: 'rgba(10, 15, 25, 0.94)',
    border: '1px solid rgba(251, 146, 60, 0.5)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#e2e8f0',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '11px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  title: { fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#fb923c' },
  collapseBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' },
  modeRow: { display: 'flex', gap: '6px', marginBottom: '8px' },
  modeBtn: {
    flex: 1,
    fontSize: '11px',
    fontWeight: 800,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#cbd5e1',
    borderRadius: '6px',
    padding: '5px',
    cursor: 'pointer',
  },
  modeBtnActive: { background: 'rgba(251,146,60,0.22)', borderColor: '#fb923c', color: '#fb923c' },
  movedBox: {
    background: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.4)',
    borderRadius: '8px',
    padding: '7px 9px',
    marginBottom: '8px',
  },
  movedLabel: { fontSize: '10px', color: '#93c5fd', marginBottom: '3px' },
  movedValue: { fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#bfdbfe' },
  movedNone: { fontSize: '11px', color: '#64748b', fontStyle: 'italic' },
  assignRow: { display: 'flex', gap: '5px', marginTop: '6px' },
  assignBtn: {
    flex: 1,
    fontSize: '10px',
    fontWeight: 700,
    border: '1px solid rgba(52,211,153,0.5)',
    background: 'rgba(52,211,153,0.18)',
    color: '#6ee7b7',
    borderRadius: '4px',
    padding: '3px 4px',
    cursor: 'pointer',
  },
  assignDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  sectionLabel: { fontSize: '9px', letterSpacing: '0.08em', color: '#64748b', margin: '8px 0 4px', fontWeight: 700 },
  mapRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' },
  mapLabel: { width: '34px', fontSize: '10px', color: '#94a3b8', fontWeight: 700 },
  mapValue: { flex: 1, fontFamily: 'monospace', fontSize: '11px', color: '#e2e8f0' },
  resetBtn: {
    width: '100%',
    marginTop: '5px',
    fontSize: '10px',
    fontWeight: 700,
    border: '1px solid rgba(248,113,113,0.4)',
    background: 'rgba(248,113,113,0.12)',
    color: '#fca5a5',
    borderRadius: '5px',
    padding: '4px',
    cursor: 'pointer',
  },
  tabs: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' },
  tab: {
    fontSize: '10px',
    fontWeight: 700,
    fontFamily: 'monospace',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#cbd5e1',
    borderRadius: '4px',
    padding: '2px 7px',
    cursor: 'pointer',
  },
  tabActive: { background: 'rgba(251,146,60,0.22)', borderColor: '#fb923c', color: '#fb923c' },
  device: {
    fontSize: '9px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: '2px 0 5px',
  },
  useDeviceBtn: {
    width: '100%',
    fontSize: '10px',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    borderRadius: '5px',
    padding: '4px',
    cursor: 'pointer',
  },
  useDeviceBtnActive: { background: 'rgba(52,211,153,0.2)', borderColor: '#34d399', color: '#34d399' },
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
  barCenter: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.3)' },
  barFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: '2px' },
  axisVal: { width: '34px', textAlign: 'right', fontFamily: 'monospace', fontSize: '10px', color: '#cbd5e1' },
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
  invertBtn: {
    fontSize: '9px',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.06)',
    color: '#cbd5e1',
    borderRadius: '4px',
    padding: '2px 7px',
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
  tabCollapsed: {
    position: 'fixed',
    top: '11.5rem',
    left: '1rem',
    zIndex: 300,
    cursor: 'pointer',
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
