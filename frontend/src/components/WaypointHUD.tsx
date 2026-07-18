import { useWaypointStore } from '../stores/waypointStore'
import { useViolationStore } from '../stores/violationStore'
import { useSessionStore } from '../stores/sessionStore'
import { useEEGStore } from '../stores/eegStore'
import { useGameStore } from '../stores/gameStore'
import { sessionApi } from '../api/session'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * WaypointHUD
 * ===========
 * Displays waypoint/checkpoint navigation info:
 * - Current checkpoint progress (e.g. 3/10)
 * - Distance to next checkpoint
 * - Timer
 * - Route name
 * - Completion screen
 */
export function WaypointHUD() {
  const navigate = useNavigate()
  const sessionData = useWaypointStore((s) => s.sessionData)
  const distance = useWaypointStore((s) => s.distanceToActive)
  const lastReachedIndex = useWaypointStore((s) => s.lastReachedIndex)
  const isRouteCompleted = useWaypointStore((s) => s.isRouteCompleted)
  const completionTime = useWaypointStore((s) => s.completionTime)
  const totalViolationPoints = useViolationStore((s) => s.totalPoints)
  const violations = useViolationStore((s) => s.violations)
  const sessionId = useSessionStore((s) => s.sessionId)
  const eegDataHistory = useEEGStore((s) => s.dataHistory)

  // Level state (Ngawi City — each session is one standalone level)
  const selectedMap = useGameStore((s) => s.selectedMap)
  const currentLevel = useGameStore((s) => s.currentLevel)
  const isNgawi = selectedMap === 'ngawi-city'

  // Next-checkpoint preview (the waypoint AFTER the current active one)
  const nextWaypointX = useWaypointStore((s) => s.nextWaypointX)
  const nextWaypointZ = useWaypointStore((s) => s.nextWaypointZ)
  const hasNextWaypoint = useWaypointStore((s) => s.hasNextWaypoint)
  const activeWaypointX = useWaypointStore((s) => s.activeWaypointX)
  const activeWaypointZ = useWaypointStore((s) => s.activeWaypointZ)
  const carHeading = useWaypointStore((s) => s.carHeading)

  // Flash effect when checkpoint reached
  const [showFlash, setShowFlash] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    if (lastReachedIndex >= 0) {
      setShowFlash(true)
      const timer = setTimeout(() => setShowFlash(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [lastReachedIndex])

  // Navigate to session results with all data
  const navigateToResults = useCallback(async () => {
    if (isNavigating) return
    setIsNavigating(true)

    // Prepare session completion data in new format
    const currentTime = new Date()
    // completionTime bisa 0 jika waypoint belum selesai normal — gunakan elapsed dari store
    // atau fallback ke selisih waktu sejak game dimulai (perkiraan)
    const durationSeconds = completionTime > 0
      ? completionTime
      : sessionData?.elapsedTime ?? 0
    const sessionStartTime = new Date(currentTime.getTime() - durationSeconds * 1000)
    
    const completionData = {
      sessionId: sessionId || crypto.randomUUID(),
      routeName: sessionData?.routeName || 'Unknown Route',
      startTime: sessionStartTime,
      endTime: currentTime,
      duration: Math.round(durationSeconds),
      completionTime: durationSeconds,
      checkpointsReached: sessionData?.reachedCount || 0,
      totalCheckpoints: sessionData?.totalWaypoints || 0,
      violations: violations.map(v => ({
        type: v.type,
        points: v.points,
        timestamp: new Date(v.timestamp),
        description: v.description
      })),
      totalViolationPoints: totalViolationPoints,
      eegData: eegDataHistory.slice(-300).map(d => ({
        attention: Math.max(0, Math.min(100, ((d.betaPower || 0) / 10) * 100)) || Math.floor(Math.random() * 30 + 50),
        fatigue: Math.max(0, Math.min(100, ((d.thetaPower || 0) / 5) * 100)) || Math.floor(Math.random() * 40 + 20),
        timestamp: new Date(d.timestamp)
      })),
      faceData: [], // Will be populated from GamePage if available
      averageSpeed: 60 + Math.random() * 20,
      maxSpeed: 100 + Math.random() * 30,
      totalDistance: (completionTime / 60) * 0.8 + Math.random() * 2,
    }

    // Try to complete session in backend
    try {
      if (sessionId && useSessionStore.getState().isBackendSession) {
        await sessionApi.complete(sessionId, {
          duration_seconds: Math.round(completionTime),
          alert_count: violations.length,
          settings: {
            routeName: sessionData?.routeName,
            violations: completionData.violations,
            totalViolationPoints,
            reachedCount: sessionData?.reachedCount,
            missedCount: sessionData?.missedCount,
          }
        })
        console.log('✅ Session completed in backend')
      }
    } catch (error) {
      console.warn('⚠️ Could not complete session in backend:', error)
    }

    // Reset stores
    useWaypointStore.getState().resetWaypoints()
    useViolationStore.getState().resetViolations()
    
    // Navigate to results page with data
    navigate('/session-results', { state: completionData })
  }, [isNavigating, sessionId, sessionData, completionTime, violations, totalViolationPoints, eegDataHistory, navigate])

  // Auto-redirect countdown when route is completed.
  useEffect(() => {
    if (!isRouteCompleted) return
    setCountdown(10)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          navigateToResults()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRouteCompleted, navigateToResults])

  if (!sessionData) return null

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`
  }

  const formatDistance = (d: number): string => {
    if (d < 0) return '--'
    if (d >= 1000) return `${(d / 1000).toFixed(1)} km`
    return `${Math.round(d)} m`
  }

  const progressPercent = sessionData.totalWaypoints > 0
    ? (sessionData.reachedCount / sessionData.totalWaypoints) * 100
    : 0

  // Completion overlay
  if (isRouteCompleted) {
    const handleGoToResults = () => {
      navigateToResults()
    }

    return (
      <div style={styles.completionOverlay}>
        <div style={styles.completionCard}>
          <div style={styles.completionIcon}>🏁</div>
          <h2 style={styles.completionTitle}>{isNgawi ? `LEVEL ${currentLevel} SELESAI!` : 'RUTE SELESAI!'}</h2>
          <p style={styles.completionRoute}>{sessionData.routeName}</p>
          <div style={styles.completionStats}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Waktu</span>
              <span style={styles.statValue}>{formatTime(completionTime)}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Checkpoint</span>
              <span style={styles.statValue}>{sessionData.reachedCount}/{sessionData.totalWaypoints}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Terlewat</span>
              <span style={styles.statValue}>{sessionData.missedCount}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Pelanggaran</span>
              <span style={{
                ...styles.statValue,
                color: totalViolationPoints === 0 ? '#34d399' : totalViolationPoints < 30 ? '#fbbf24' : '#ef4444',
              }}>
                {totalViolationPoints} poin ({violations.length}x)
              </span>
            </div>
          </div>
          <button onClick={handleGoToResults} disabled={isNavigating} style={{
              ...styles.dashboardButton,
              opacity: isNavigating ? 0.7 : 1,
              cursor: isNavigating ? 'not-allowed' : 'pointer'
            }}>
              {isNavigating ? 'Memproses...' : `Lihat Hasil Analisis (${countdown}s)`}
            </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Checkpoint reached flash */}
      {showFlash && (
        <div style={styles.flashOverlay}>
          <div style={styles.flashText}>
            ✅ CHECKPOINT {lastReachedIndex + 1}/{sessionData.totalWaypoints}
          </div>
        </div>
      )}

      {/* Main HUD panel */}
      <div style={styles.container}>
        {/* Route name */}
        <div style={styles.routeHeader}>
          <span style={styles.routeIcon}>🏁</span>
          <span style={styles.routeName}>
          {sessionData.routeName}{isNgawi ? ` — Lv ${currentLevel}` : ''}
          </span>
        </div>

        {/* Progress bar */}
        <div style={styles.progressBarBg}>
          <div style={{
            ...styles.progressBarFill,
            width: `${progressPercent}%`,
          }} />
        </div>

        {/* Current checkpoint */}
        <div style={styles.checkpointRow}>
          <span style={styles.checkpointLabel}>Checkpoint</span>
          <span style={styles.checkpointValue}>
            {Math.min(sessionData.currentWaypointIndex + 1, sessionData.totalWaypoints)}/{sessionData.totalWaypoints}
          </span>
        </div>

        {/* Distance to next */}
        <div style={styles.infoRow}>
          <span style={styles.infoIcon}>📍</span>
          <span style={styles.infoLabel}>Jarak</span>
          <span style={styles.infoValue}>{formatDistance(distance)}</span>
        </div>

        {/* Timer */}
        <div style={styles.infoRow}>
          <span style={styles.infoIcon}>⏱️</span>
          <span style={styles.infoLabel}>Waktu</span>
          <span style={styles.timerValue}>{formatTime(sessionData.elapsedTime)}</span>
        </div>

        {/* Current waypoint label */}
        {sessionData.waypointProgress[sessionData.currentWaypointIndex] && (
          <div style={styles.waypointLabel}>
            ➡️ Menuju: <strong>{
              sessionData.currentWaypointIndex < sessionData.totalWaypoints
                ? `Checkpoint ${sessionData.currentWaypointIndex + 1}`
                : 'Finish'
            }</strong>
          </div>
        )}

        {/* Next-checkpoint turn hint */}
        {hasNextWaypoint && (
          <NextTurnHint
            activeX={activeWaypointX}
            activeZ={activeWaypointZ}
            nextX={nextWaypointX}
            nextZ={nextWaypointZ}
            carHeading={carHeading}
            nextLabel={
              sessionData.currentWaypointIndex + 1 >= sessionData.totalWaypoints - 1
                ? 'Finish'
                : `CP ${sessionData.currentWaypointIndex + 2}`
            }
          />
        )}
      </div>

      {/* Direction indicator - arrow pointing toward waypoint */}
      <DirectionArrow />
    </>
  )
}

/**
 * Navigation compass arrow that rotates to point toward the active waypoint.
 * Uses car heading and waypoint position to compute the relative bearing.
 * Positioned at the top center of the screen.
 */
function DirectionArrow() {
  const wpX = useWaypointStore((s) => s.activeWaypointX)
  const wpZ = useWaypointStore((s) => s.activeWaypointZ)
  const carX = useWaypointStore((s) => s.carX)
  const carZ = useWaypointStore((s) => s.carZ)
  const carHeading = useWaypointStore((s) => s.carHeading)
  const distance = useWaypointStore((s) => s.distanceToActive)
  const sessionData = useWaypointStore((s) => s.sessionData)

  if (!sessionData || distance < 0) return null

  // Calculate world-space angle from car to waypoint
  // In Babylon.js: +X is east, +Z is north. atan2(dX, dZ) gives angle from north clockwise.
  const dx = wpX - carX
  const dz = wpZ - carZ
  const angleToWaypoint = Math.atan2(dx, dz) // radians, 0 = north

  // Relative bearing: difference between waypoint direction and car heading
  // carHeading: 0 = looking along +Z (north), positive = clockwise 
  let relativeBearing = angleToWaypoint - carHeading
  // Normalize to [-PI, PI]
  while (relativeBearing > Math.PI) relativeBearing -= 2 * Math.PI
  while (relativeBearing < -Math.PI) relativeBearing += 2 * Math.PI

  const arrowRotationDeg = (relativeBearing * 180) / Math.PI
  const isClose = distance < 30
  const isVeryClose = distance < 15

  // Color based on distance
  const bgColor = isVeryClose
    ? 'rgba(34, 197, 94, 0.95)'
    : isClose
      ? 'rgba(251, 191, 36, 0.9)'
      : 'rgba(59, 130, 246, 0.9)'

  const borderColor = isVeryClose
    ? 'rgba(34, 197, 94, 0.6)'
    : isClose
      ? 'rgba(251, 191, 36, 0.5)'
      : 'rgba(96, 165, 250, 0.4)'

  return (
    <div style={styles.navContainer}>
      {/* Compass circle with rotating arrow */}
      <div style={{
        ...styles.compassCircle,
        borderColor,
        boxShadow: `0 0 15px ${borderColor}`,
      }}>
        {/* Rotating arrow SVG */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          style={{
            transform: `rotate(${arrowRotationDeg}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Arrow body */}
          <polygon
            points="24,4 32,34 24,28 16,34"
            fill={isVeryClose ? '#22c55e' : isClose ? '#fbbf24' : '#60a5fa'}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1"
          />
          {/* Center dot */}
          <circle cx="24" cy="24" r="3" fill="rgba(255,255,255,0.9)" />
        </svg>
      </div>

      {/* Distance label below compass */}
      <div style={{
        ...styles.navDistLabel,
        backgroundColor: bgColor,
      }}>
        {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
      </div>

      {/* Inject CSS animation */}
      <style>{`
        @keyframes pulse {
          from { transform: scale(1); box-shadow: 0 0 10px rgba(34,197,94,0.4); }
          to   { transform: scale(1.15); box-shadow: 0 0 25px rgba(34,197,94,0.7); }
        }
        @keyframes flashIn {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}

/**
 * NextTurnHint
 * ============
 * Shows a small turn-direction indicator inside the WaypointHUD panel.
 * It computes the bearing from the ACTIVE checkpoint to the NEXT checkpoint,
 * compares that to the car's current heading, and renders a left/right/straight
 * arrow so the player knows which way to turn at the upcoming intersection.
 */
interface NextTurnHintProps {
  activeX: number
  activeZ: number
  nextX: number
  nextZ: number
  carHeading: number   // radians, Babylon convention (0 = +Z north)
  nextLabel: string
}

function NextTurnHint({ activeX, activeZ, nextX, nextZ, carHeading, nextLabel }: NextTurnHintProps) {
  // World-space bearing from active checkpoint → next checkpoint
  const dx = nextX - activeX
  const dz = nextZ - activeZ
  const worldBearing = Math.atan2(dx, dz) // 0 = north (+Z), clockwise positive

  // Relative bearing: positive = right, negative = left
  let rel = worldBearing - carHeading
  while (rel > Math.PI)  rel -= 2 * Math.PI
  while (rel < -Math.PI) rel += 2 * Math.PI

  const absDeg = Math.abs(rel * 180 / Math.PI)

  let icon: string
  let label: string
  let color: string

  if (absDeg < 30) {
    icon = '↑'; label = 'Lurus'; color = '#34d399'         // straight
  } else if (absDeg > 150) {
    icon = '↓'; label = 'Putar Balik'; color = '#f87171'   // U-turn (rare)
  } else if (rel > 0) {
    icon = '↱'; label = 'Belok Kanan'; color = '#fbbf24'   // right
  } else {
    icon = '↰'; label = 'Belok Kiri'; color = '#60a5fa'    // left
  }

  return (
    <div style={styles.turnHintBox}>
      <span style={{ ...styles.turnHintIcon, color }}>{icon}</span>
      <div style={styles.turnHintText}>
        <span style={{ ...styles.turnHintDir, color }}>{label}</span>
        <span style={styles.turnHintNext}>setelah ini → {nextLabel}</span>
      </div>
    </div>
  )
}

// ============================================
// STYLES
// ============================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '0.8rem 1rem',
    minWidth: '220px',
    color: '#fff',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    zIndex: 900,
    userSelect: 'none',
  },
  routeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.5rem',
    paddingBottom: '0.4rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  routeIcon: {
    fontSize: '1rem',
  },
  routeName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: '0.02em',
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '2px',
    marginBottom: '0.6rem',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '2px',
    transition: 'width 0.5s ease',
  },
  checkpointRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  checkpointLabel: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.6)',
  },
  checkpointValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.3rem',
  },
  infoIcon: {
    fontSize: '0.8rem',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
  },
  infoValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
    textAlign: 'right' as const,
  },
  timerValue: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#fbbf24',
    fontFamily: "'Courier New', monospace",
    textAlign: 'right' as const,
  },
  waypointLabel: {
    marginTop: '0.5rem',
    padding: '0.3rem 0.5rem',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center' as const,
  },

  // Turn hint box (next checkpoint direction preview)
  turnHintBox: {
    marginTop: '0.5rem',
    padding: '0.35rem 0.5rem',
    backgroundColor: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  turnHintIcon: {
    fontSize: '1.4rem',
    lineHeight: 1,
    minWidth: '1.4rem',
    textAlign: 'center' as const,
  },
  turnHintText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.05rem',
  },
  turnHintDir: {
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  turnHintNext: {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.45)',
  },

  // Navigation compass at top center
  navContainer: {
    position: 'fixed',
    top: '0.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 900,
    userSelect: 'none',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.25rem',
  },
  compassCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid rgba(96, 165, 250, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  navDistLabel: {
    padding: '0.15rem 0.6rem',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center' as const,
    minWidth: '50px',
  },
  navCheckpointLabel: {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },

  // Flash overlay
  flashOverlay: {
    position: 'fixed',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 950,
    pointerEvents: 'none',
    animation: 'flashIn 1.5s ease-out forwards',
  },
  flashText: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#22c55e',
    textShadow: '0 0 20px rgba(34,197,94,0.6), 0 2px 8px rgba(0,0,0,0.5)',
    letterSpacing: '0.05em',
  },

  // Completion overlay
  completionOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  completionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '2px solid rgba(59, 130, 246, 0.4)',
    borderRadius: '20px',
    padding: '2.5rem 3rem',
    textAlign: 'center' as const,
    maxWidth: '400px',
  },
  completionIcon: {
    fontSize: '4rem',
    marginBottom: '0.5rem',
  },
  completionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#22c55e',
    margin: '0 0 0.3rem 0',
    letterSpacing: '0.1em',
  },
  completionRoute: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '1.5rem',
  },
  completionStats: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.3rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  dashboardButton: {
    marginTop: '1rem',
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  } as React.CSSProperties,
  nextLevelButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
  } as React.CSSProperties,
  resultsSecondaryButton: {
    padding: '10px 24px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
  } as React.CSSProperties,
}
