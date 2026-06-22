/**
 * ViolationToast
 * ==============
 * Transient warning that pops up each time the player commits an *instant*
 * violation (e.g. hitting a building or an NPC car). Sustained violations
 * (wrong-way, off-road) already have their own persistent overlays, so they are
 * skipped here to avoid double-signalling.
 */

import { useEffect, useRef, useState } from 'react'
import { useViolationStore } from '../stores/violationStore'
import type { ViolationType } from '../stores/violationStore'

const LABELS: Record<ViolationType, { label: string; color: string }> = {
  collision: { label: 'Menabrak Objek', color: '#ef4444' },
  'wrong-way': { label: 'Melawan Arah', color: '#dc2626' },
  speeding: { label: 'Melebihi Kecepatan', color: '#f59e0b' },
  'red-light': { label: 'Melanggar Lampu Merah', color: '#dc2626' },
  'off-road': { label: 'Keluar Jalur', color: '#d97706' },
  pedestrian: { label: 'Menabrak Pejalan Kaki!', color: '#b91c1c' },
}

// These have dedicated persistent overlays — don't also toast them.
const SKIP_TOAST = new Set<ViolationType>(['wrong-way', 'off-road'])

interface ToastItem {
  id: number
  type: ViolationType
  points: number
}

export function ViolationToast() {
  const violations = useViolationStore((s) => s.violations)
  const lastCount = useRef(0)
  const [toast, setToast] = useState<ToastItem | null>(null)

  // Detect a newly-added violation.
  useEffect(() => {
    if (violations.length > lastCount.current) {
      const v = violations[violations.length - 1]
      if (v && !SKIP_TOAST.has(v.type)) {
        setToast({ id: v.id, type: v.type, points: v.points })
      }
    }
    lastCount.current = violations.length
  }, [violations])

  // Auto-dismiss.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast) return null
  const info = LABELS[toast.type] ?? { label: toast.type, color: '#ef4444' }

  return (
    <div
      key={toast.id}
      style={{
        position: 'fixed',
        top: '22%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 210,
        pointerEvents: 'none',
        animation: 'violationPop 0.3s ease-out',
      }}
    >
      <div style={{
        background: 'rgba(15, 23, 42, 0.92)',
        border: `2px solid ${info.color}`,
        borderRadius: '12px',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: `0 0 28px ${info.color}66`,
        animation: 'violationPulse 0.6s ease-in-out',
      }}>
        {/* Warning triangle */}
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke={info.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Pelanggaran
          </div>
          <div style={{
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: 1.2,
          }}>
            {info.label}
          </div>
        </div>

        {/* Points badge */}
        <div style={{
          background: info.color,
          color: '#fff',
          fontSize: '15px',
          fontWeight: 800,
          borderRadius: '8px',
          padding: '4px 10px',
          whiteSpace: 'nowrap',
        }}>
          +{toast.points}
        </div>
      </div>

      <style>{`
        @keyframes violationPop {
          from { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(0.92); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes violationPulse {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}
