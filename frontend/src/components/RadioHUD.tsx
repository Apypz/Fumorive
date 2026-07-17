/**
 * RadioHUD
 * ========
 * Compact in-car radio widget — musik player style.
 * Posisi diatur oleh parent flex container di Session.tsx (position: relative).
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │ ◉ RADIO KOTA          [eq] [eq] [eq]    │
 *   │ ◀◀  Billy Idol — Eyes Without A Face  ▶▶ │
 *   └─────────────────────────────────────────┘
 */
import { useRadioStore } from '../stores/radioStore'
import { useEffect, useRef, useState } from 'react'

export function RadioHUD() {
  const { currentStation, stationInfo, currentTrack } = useRadioStore()

  const isOff  = currentStation === 'off'
  const isMp3  = currentStation === 'ngawi-fm' || currentStation === 'radio-kota'
  const accent = isOff ? '#475569' : stationInfo.color

  // ── Marquee ──────────────────────────────────────────────────────────────
  const trackLabel = currentTrack
    ? currentTrack.artist
      ? `${currentTrack.artist} — ${currentTrack.title}`
      : currentTrack.title
    : null

  const [marqueeX, setMarqueeX]           = useState(0)
  const [needsScroll, setNeedsScroll]     = useState(false)
  const textRef                           = useRef<HTMLSpanElement>(null)
  const wrapRef                           = useRef<HTMLDivElement>(null)
  const rafRef                            = useRef<number | null>(null)

  // Re-measure whenever track changes
  useEffect(() => {
    setMarqueeX(0)
    if (!textRef.current || !wrapRef.current) return
    setNeedsScroll(textRef.current.scrollWidth > wrapRef.current.clientWidth + 2)
  }, [trackLabel])

  // Scroll loop
  useEffect(() => {
    if (!needsScroll || !textRef.current) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const textEl = textRef.current
    let x = 0
    let pause = 80 // ~1.3s initial pause at 60fps

    const step = () => {
      if (pause > 0) {
        pause--
      } else {
        x += 0.45
        if (x > textEl.scrollWidth + 24) { x = 0; pause = 60 }
        setMarqueeX(x)
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [needsScroll, trackLabel])

  // ── Button handlers ───────────────────────────────────────────────────────
  const dispatch = (key: string) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

  return (
    <div style={{
      width: '200px',
      background: 'rgba(0,0,0,0.80)',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${accent}50`,
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: isOff ? 'none' : `0 0 14px ${accent}20`,
      transition: 'border-color 0.3s, box-shadow 0.3s',
      userSelect: 'none',
      pointerEvents: isMp3 ? 'auto' : 'none',
    }}>

      {/* ── Top row: station name + EQ bars ─────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '7px 10px 5px',
        borderBottom: `1px solid ${accent}20`,
      }}>
        {/* Dot indicator */}
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isOff ? '#334155' : accent,
          boxShadow: isOff ? 'none' : `0 0 6px ${accent}`,
          transition: 'background 0.3s',
        }} />

        {/* Station name */}
        <span style={{
          flex: 1,
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: isOff ? '#475569' : '#e2e8f0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textTransform: 'uppercase',
          transition: 'color 0.3s',
        }}>
          {isOff ? 'RADIO OFF' : stationInfo.name}
        </span>

        {/* EQ bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '12px', flexShrink: 0 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '3px',
              borderRadius: '1.5px',
              background: accent,
              opacity: isOff ? 0.15 : 0.9,
              height: isOff ? '3px' : undefined,
              animation: isOff ? 'none' : `rEq${i} ${0.45 + i * 0.18}s ease-in-out infinite alternate`,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Hint: tekan R */}
        {isOff && (
          <span style={{ fontSize: '8px', color: '#334155', letterSpacing: '0.05em' }}>R</span>
        )}
      </div>

      {/* ── Bottom row: prev + marquee track + next ──────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 6px 7px',
        minHeight: '26px',
      }}>
        {isMp3 ? (
          <>
            {/* Prev */}
            <button onClick={() => dispatch('[')} style={mkBtn(accent)} title="Prev  [">
              <PrevIcon color={accent} />
            </button>

            {/* Marquee track name */}
            <div
              ref={wrapRef}
              style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                ref={textRef}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: trackLabel ? '#cbd5e1' : '#475569',
                  letterSpacing: '0.01em',
                  transform: needsScroll ? `translateX(-${marqueeX}px)` : 'none',
                  display: 'inline-block',
                  willChange: needsScroll ? 'transform' : undefined,
                }}
              >
                {trackLabel ?? (currentStation === 'ngawi-fm' ? 'Ngawi FM' : 'Radio Kota')}
              </span>

              {/* Fade edges when scrolling */}
              {needsScroll && (
                <>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: 10, height: '100%', background: 'linear-gradient(to right, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, width: 10, height: '100%', background: 'linear-gradient(to left, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }} />
                </>
              )}
            </div>

            {/* Next */}
            <button onClick={() => dispatch(']')} style={mkBtn(accent)} title="Next  ]">
              <NextIcon color={accent} />
            </button>
          </>
        ) : (
          // Smooth Jazz / OFF — no controls, just a label
          <span style={{
            flex: 1,
            fontSize: '9px',
            color: isOff ? '#334155' : '#64748b',
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}>
            {isOff ? 'Tekan R untuk radio' : 'Smooth Jazz · Procedural'}
          </span>
        )}
      </div>

      <style>{`
        @keyframes rEq0 { from { height: 3px } to { height: 11px } }
        @keyframes rEq1 { from { height: 8px } to { height: 3px  } }
        @keyframes rEq2 { from { height: 11px} to { height: 5px  } }
      `}</style>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────

function mkBtn(accent: string): React.CSSProperties {
  return {
    width: 20, height: 20, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `${accent}18`,
    border: `1px solid ${accent}38`,
    borderRadius: '5px',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.15s',
  }
}

function PrevIcon({ color }: { color: string }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill={color}>
      <polygon points="19 20 9 12 19 4 19 20"/>
      <rect x="4" y="4" width="3" height="16" rx="1" fill={color}/>
    </svg>
  )
}

function NextIcon({ color }: { color: string }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill={color}>
      <polygon points="5 4 15 12 5 20 5 4"/>
      <rect x="17" y="4" width="3" height="16" rx="1" fill={color}/>
    </svg>
  )
}
