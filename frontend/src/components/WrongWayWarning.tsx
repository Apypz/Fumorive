/**
 * WrongWayWarning
 * ===============
 * Full-screen flashing warning overlay that appears when the car
 * is driving against traffic (melawan arah).
 * 
 * Uses the `isWrongWay` state from gameStore, which is updated each frame.
 */

import { useGameStore } from '../stores/gameStore'
import { useEffect, useState } from 'react'

export function WrongWayWarning() {
  const isWrongWay = useGameStore((s) => s.isWrongWay)
  const [flash, setFlash] = useState(false)

  // Flash animation toggle
  useEffect(() => {
    if (!isWrongWay) {
      setFlash(false)
      return
    }

    const interval = setInterval(() => {
      setFlash((prev) => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [isWrongWay])

  if (!isWrongWay) return null

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
      animation: 'wrongWaySlideIn 0.3s ease-out',
    }}>
      {/* Main warning box */}
      <div style={{
        background: flash
          ? 'rgba(220, 38, 38, 0.95)'
          : 'rgba(180, 20, 20, 0.9)',
        border: '3px solid #fca5a5',
        borderRadius: '12px',
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: flash
          ? '0 0 40px rgba(255, 0, 0, 0.6), 0 0 80px rgba(255, 0, 0, 0.3)'
          : '0 0 20px rgba(255, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
      }}>
        {/* Warning icon */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fef2f2"
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
            color: '#fef2f2',
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            lineHeight: 1.2,
          }}>
            MELAWAN ARAH
          </div>
          <div style={{
            color: '#fecaca',
            fontSize: '12px',
            fontWeight: 500,
            marginTop: '2px',
          }}>
            Kembali ke jalur kiri!
          </div>
        </div>

        {/* Right arrow icon pointing back */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fef2f2"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: 'scaleX(-1)' }}
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>

      {/* Penalty info */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '6px',
        padding: '4px 12px',
        color: '#fca5a5',
        fontSize: '11px',
        fontWeight: 600,
      }}>
        +15 poin pelanggaran setiap 5 detik
      </div>

      {/* Inject keyframe animation */}
      <style>{`
        @keyframes wrongWaySlideIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
