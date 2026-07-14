import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/gameStore'
import { EEG_DOWNLOAD_URL } from '../config/api'

interface LevelInfo {
  id: number
  name: string
  label: string
  description: string
  details: string[]
  color: string
  glowColor: string
  icon: string
  badge: string
}

const levels: LevelInfo[] = [
  {
    id: 1,
    name: 'Level 1',
    label: 'Traffic Light',
    description: 'Kota kecil (7×7) tanpa kendaraan lain. Fokus pada mematuhi lampu merah & rambu jalan.',
    details: ['Tanpa NPC kendaraan', 'Tanpa pejalan kaki', '6 traffic light aktif', 'Jalan lebar & nyaman'],
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.25)',
    icon: '🚦',
    badge: 'PEMULA',
  },
  {
    id: 2,
    name: 'Level 2',
    label: 'NPC Traffic',
    description: 'Kota sedang (9×9) dengan kendaraan NPC aktif. Berbagi jalan & waspadai kendaraan lain.',
    details: ['16 NPC kendaraan', 'Tanpa pejalan kaki', '6 traffic light', 'NPC kecepatan moderat'],
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    icon: '🚗',
    badge: 'MENENGAH',
  },
  {
    id: 3,
    name: 'Level 3',
    label: 'Full City',
    description: 'Kota besar (11×11) penuh tantangan. NPC agresif bisa terobos lampu merah + pejalan kaki.',
    details: ['28 NPC kendaraan', '4 pejalan kaki/penyeberangan', '10 traffic light', 'NPC agresif & cepat'],
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    icon: '🌆',
    badge: 'MAHIR',
  },
]

interface MapSelectionProps {
  onStartGame: () => void
  onBack?: () => void
}

export function MapSelection({ onStartGame, onBack }: MapSelectionProps) {
  const navigate = useNavigate()
  const { selectedLevel, setSelectedLevel, setSelectedMap, startAtLevel, playerName } = useGameStore()
  const [showEEGGuide, setShowEEGGuide] = useState(false)

  const handleLevelSelect = (levelId: number) => {
    setSelectedLevel(levelId)
  }

  const handleStartGame = () => {
    // Always Ngawi City, jump directly to the selected level with a fresh seed.
    setSelectedMap('ngawi-city')
    startAtLevel(selectedLevel)
    onStartGame()
  }

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.mapBadge}>🌆 NGAWI CITY</div>
          <h1 style={styles.title}>PILIH LEVEL</h1>
          <p style={styles.subtitle}>
            Peta kota di-generate acak setiap sesi — setiap permainan selalu berbeda!
          </p>
          {playerName && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: '999px', padding: '6px 18px', marginTop: '12px',
            }}>
              <span style={{ fontSize: '16px' }}>👤</span>
              <span style={{ color: '#a5b4fc', fontSize: '0.9rem', fontWeight: 700 }}>{playerName}</span>
            </div>
          )}
        </div>

        {/* Level Cards */}
        <div style={styles.levelGrid}>
          {levels.map((level) => {
            const isSelected = selectedLevel === level.id
            return (
              <div
                key={level.id}
                style={{
                  ...styles.levelCard,
                  ...(isSelected
                    ? {
                        borderColor: level.color,
                        backgroundColor: level.glowColor,
                        boxShadow: `0 0 40px ${level.glowColor}, 0 8px 32px rgba(0,0,0,0.4)`,
                        transform: 'translateY(-4px) scale(1.02)',
                      }
                    : {}),
                }}
                onClick={() => handleLevelSelect(level.id)}
              >
                {/* Level number + badge */}
                <div style={styles.cardTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.levelIcon}>{level.icon}</span>
                    <div>
                      <div style={styles.levelNumber}>{level.name}</div>
                      <div
                        style={{
                          ...styles.difficultyBadge,
                          backgroundColor: level.color + '22',
                          color: level.color,
                          borderColor: level.color + '55',
                        }}
                      >
                        {level.badge}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        ...styles.selectedBadge,
                        backgroundColor: level.color,
                      }}
                    >
                      TERPILIH ✓
                    </div>
                  )}
                </div>

                {/* Description */}
                <p style={styles.levelDescription}>{level.description}</p>

                {/* Stats */}
                <div style={styles.statsList}>
                  {level.details.map((d, i) => (
                    <div key={i} style={styles.statItem}>
                      <span style={{ ...styles.statDot, backgroundColor: level.color }} />
                      <span style={styles.statText}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          <button
            id="btn-start-game"
            style={styles.startButton}
            onClick={handleStartGame}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 30px rgba(59,130,246,0.6)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(59,130,246,0.4)'
            }}
          >
            🚗 MULAI GAME
          </button>
          <button
            id="btn-back-dashboard"
            style={styles.backButton}
            onClick={handleBackToDashboard}
          >
            {onBack ? '← UBAH NAMA' : '← KEMBALI'}
          </button>
        </div>

        {/* EEG pill toggle */}
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <button
            style={styles.eegToggleBtn}
            onClick={() => setShowEEGGuide((v) => !v)}
          >
            🧠 Punya Muse 2? Setup EEG Server &nbsp;↗
          </button>
        </div>

        {/* EEG Setup Guide floating overlay */}
        {showEEGGuide && (
          <>
            <div style={styles.eegBackdrop} onClick={() => setShowEEGGuide(false)} />
            <div style={styles.eegFloatingPanel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.95rem' }}>🧠 Setup EEG Server (Muse 2)</span>
                <button
                  onClick={() => setShowEEGGuide(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                >✕</button>
              </div>
              <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                EEG Server berjalan di komputer lokal kamu karena butuh akses hardware Muse 2.
              </p>
              {[
                {
                  num: '1', color: '#38bdf8',
                  title: 'Download EEG Server Package',
                  desc: 'Download package dan extract ke folder mana saja.',
                  action: (
                    <a href={EEG_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" download style={styles.downloadLink}>
                      ⬇ Download EEG Package
                    </a>
                  ),
                },
                {
                  num: '2', color: '#a78bfa',
                  title: 'Jalankan start_eeg.bat',
                  desc: 'Double-click start_eeg.bat. Pastikan Muse 2 nyala & Bluetooth aktif.',
                  action: <code style={styles.codeSnippet}>📂 eeg-server / start_eeg.bat</code>,
                },
                {
                  num: '3', color: '#34d399',
                  title: 'Paste Session ID',
                  desc: 'Copy Session ID dari banner atas game, lalu paste ke terminal EEG.',
                  action: null,
                },
              ].map((step) => (
                <div key={step.num} style={styles.eegStep}>
                  <div style={{ ...styles.eegStepNum, background: step.color + '22', color: step.color, borderColor: step.color + '44' }}>
                    {step.num}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.875rem', marginBottom: '2px' }}>{step.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: step.action ? '6px' : 0 }}>{step.desc}</div>
                    {step.action}
                  </div>
                </div>
              ))}
              <div style={styles.eegNote}>
                💡 Tanpa Muse 2, aplikasi tetap jalan normal dengan monitoring kamera saja.
              </div>
            </div>
          </>
        )}

        {/* Controls hint */}
        <div style={styles.controlsHint}>
          <p>Kontrol: K untuk nyalakan mesin | WASD untuk bergerak | SPACE/SHIFT untuk rem | V untuk kamera | C untuk steering</p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    maxWidth: '960px',
    width: '92%',
    padding: '2rem',
    textAlign: 'center',
  },
  header: {
    marginBottom: '2rem',
  },
  mapBadge: {
    display: 'inline-block',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '999px',
    padding: '4px 18px',
    color: '#a5b4fc',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '2.8rem',
    fontWeight: 900,
    color: '#fff',
    marginBottom: '0.5rem',
    letterSpacing: '0.1em',
    textShadow: '0 0 30px rgba(99,102,241,0.5)',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  levelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  levelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    position: 'relative',
    textAlign: 'left',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  levelIcon: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  levelNumber: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  difficultyBadge: {
    display: 'inline-block',
    border: '1px solid',
    borderRadius: '999px',
    padding: '2px 10px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  selectedBadge: {
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.06em',
    flexShrink: 0,
  },
  levelDescription: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.6,
    marginBottom: '1rem',
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statText: {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.55)',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '1rem 3rem',
    fontSize: '1.2rem',
    fontWeight: 800,
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.08em',
    boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
  },
  backButton: {
    backgroundColor: 'rgba(107,114,128,0.2)',
    color: 'rgba(255,255,255,0.7)',
    border: '2px solid rgba(255,255,255,0.15)',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: 700,
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.05em',
  },
  controlsHint: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.4)',
  },
  // EEG overlay styles (unchanged)
  eegToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(139,92,246,0.12)',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: '999px',
    padding: '7px 18px',
    color: '#c4b5fd',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  eegBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(3px)',
    zIndex: 1100,
  },
  eegFloatingPanel: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '420px',
    maxWidth: '92vw',
    background: '#0f172a',
    border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: '16px',
    padding: '20px',
    zIndex: 1101,
    boxShadow: '0 0 60px rgba(139,92,246,0.2), 0 25px 50px rgba(0,0,0,0.6)',
  },
  eegStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },
  eegStepNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.8rem',
    flexShrink: 0,
    marginTop: '1px',
  },
  downloadLink: {
    display: 'inline-block',
    background: 'rgba(56,189,248,0.15)',
    border: '1px solid rgba(56,189,248,0.4)',
    borderRadius: '6px',
    padding: '4px 12px',
    color: '#38bdf8',
    fontSize: '0.8rem',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  codeSnippet: {
    display: 'inline-block',
    background: 'rgba(167,139,250,0.1)',
    border: '1px solid rgba(167,139,250,0.25)',
    borderRadius: '6px',
    padding: '4px 10px',
    color: '#a78bfa',
    fontSize: '0.78rem',
    fontFamily: 'monospace',
  },
  eegNote: {
    marginTop: '12px',
    padding: '10px 14px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '8px',
    color: '#6ee7b7',
    fontSize: '0.8rem',
    lineHeight: 1.5,
  },
}
