/**
 * TrafficLightHUD
 * ===============
 * Compact on-screen indicator showing the state of the traffic light governing
 * the player's own approach, so there's no guessing which physical light applies.
 * Reads `trafficLightState` from gameStore (set each frame while near a light).
 */

import { useGameStore } from '../stores/gameStore'

const CONFIG = {
  red: { color: '#ef4444', text: 'BERHENTI', glow: 'rgba(239,68,68,0.6)' },
  yellow: { color: '#f59e0b', text: 'HATI-HATI', glow: 'rgba(245,158,11,0.5)' },
  green: { color: '#22c55e', text: 'JALAN', glow: 'rgba(34,197,94,0.5)' },
} as const

export function TrafficLightHUD() {
  const state = useGameStore((s) => s.trafficLightState)
  if (!state) return null
  const cfg = CONFIG[state]

  const dot = (key: 'red' | 'yellow' | 'green', color: string) => {
    const active = state === key
    return (
      <div
        key={key}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: active ? color : 'rgba(255,255,255,0.12)',
          boxShadow: active ? `0 0 12px ${color}` : 'none',
          transition: 'all 0.2s',
        }}
      />
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: '6rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 190,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'rgba(15, 23, 42, 0.9)',
      border: `2px solid ${cfg.color}`,
      borderRadius: '999px',
      padding: '7px 18px 7px 12px',
      boxShadow: `0 0 22px ${cfg.glow}`,
      animation: state === 'red' ? 'tlPulse 0.9s ease-in-out infinite' : 'none',
    }}>
      {/* Mini traffic light (horizontal) */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '999px',
        padding: '5px 8px',
      }}>
        {dot('red', '#ef4444')}
        {dot('yellow', '#f59e0b')}
        {dot('green', '#22c55e')}
      </div>

      <div style={{
        color: cfg.color,
        fontSize: '16px',
        fontWeight: 800,
        letterSpacing: '1px',
      }}>
        {cfg.text}
      </div>

      <style>{`
        @keyframes tlPulse {
          0%, 100% { box-shadow: 0 0 18px ${cfg.glow}; }
          50% { box-shadow: 0 0 34px ${cfg.glow}; }
        }
      `}</style>
    </div>
  )
}
