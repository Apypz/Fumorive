import { useRadioStore } from '../stores/radioStore'

/**
 * RadioHUD
 * ========
 * Compact radio widget positioned above the speedometer.
 * Always visible — shows OFF state when radio is off.
 */
export function RadioHUD() {
  const { currentStation, stationInfo } = useRadioStore()

  const isOff = currentStation === 'off'
  const accent = isOff ? '#64748b' : stationInfo.color

  return (
    <div style={{
      width: '160px',
      pointerEvents: 'none',
      background: 'rgba(0,0,0,0.70)',
      backdropFilter: 'blur(6px)',
      border: `1px solid ${accent}44`,
      borderRadius: '8px',
      padding: '7px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: isOff ? 'none' : `0 0 10px ${accent}22`,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Speaker icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transition: 'stroke 0.3s' }}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        {isOff ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </>
        ) : (
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        )}
      </svg>

      {/* Station name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: isOff ? '#64748b' : '#fff',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1,
          transition: 'color 0.3s',
        }}>
          {isOff ? 'Radio: OFF' : stationInfo.name}
        </div>
        <div style={{
          fontSize: '9px',
          color: isOff ? '#475569' : accent,
          marginTop: '2px',
          letterSpacing: '0.06em',
          opacity: 0.85,
          transition: 'color 0.3s',
        }}>
          {isOff ? 'Tekan R' : stationInfo.genre}
        </div>
      </div>

      {/* Equalizer bars — animated when playing, static when off */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '2px',
        height: '14px',
        flexShrink: 0,
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '3px',
            background: accent,
            borderRadius: '1px',
            opacity: isOff ? 0.25 : 0.8,
            height: isOff ? '4px' : undefined,
            animation: isOff ? 'none' : `eq${i} ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
            transition: 'background 0.3s, opacity 0.3s',
          }} />
        ))}
      </div>

      <style>{`
        @keyframes eq0 { from { height: 4px; } to { height: 13px; } }
        @keyframes eq1 { from { height: 9px; } to { height: 4px;  } }
        @keyframes eq2 { from { height: 13px;} to { height: 6px;  } }
      `}</style>
    </div>
  )
}

