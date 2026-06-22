/**
 * OffRoadWarning
 * ==============
 * Flashing warning overlay shown when the car drives off the road onto the grass
 * (Ngawi City). Mirrors WrongWayWarning but in an amber theme. Uses the
 * `isOffRoad` state from gameStore.
 */

import { useGameStore } from '../stores/gameStore'
import { useEffect, useState } from 'react'

export function OffRoadWarning() {
  const isOffRoad = useGameStore((s) => s.isOffRoad)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!isOffRoad) {
      setFlash(false)
      return
    }
    const interval = setInterval(() => setFlash((prev) => !prev), 500)
    return () => clearInterval(interval)
  }, [isOffRoad])

  if (!isOffRoad) return null

  return (
    <div style={{
      position: 'fixed',
      top: '12%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      animation: 'offRoadSlideIn 0.3s ease-out',
    }}>
      <div style={{
        background: flash ? 'rgba(217, 119, 6, 0.95)' : 'rgba(180, 95, 6, 0.9)',
        border: '3px solid #fcd34d',
        borderRadius: '12px',
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: flash
          ? '0 0 40px rgba(245, 158, 11, 0.6), 0 0 80px rgba(245, 158, 11, 0.3)'
          : '0 0 20px rgba(245, 158, 11, 0.4)',
        transition: 'all 0.3s ease',
      }}>
        {/* Warning triangle */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fffbeb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: '#fffbeb',
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            lineHeight: 1.2,
          }}>
            KELUAR JALUR
          </div>
          <div style={{
            color: '#fde68a',
            fontSize: '12px',
            fontWeight: 500,
            marginTop: '2px',
          }}>
            Kembali ke jalan!
          </div>
        </div>
      </div>

      {/* Penalty info */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '6px',
        padding: '4px 12px',
        color: '#fcd34d',
        fontSize: '11px',
        fontWeight: 600,
      }}>
        +3 poin pelanggaran setiap 3 detik
      </div>

      <style>{`
        @keyframes offRoadSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
