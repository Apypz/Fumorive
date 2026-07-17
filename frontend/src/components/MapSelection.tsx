import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/gameStore'
import { EEG_DOWNLOAD_URL } from '../config/api'
import car1 from '../assets/car1.png'
import car2 from '../assets/car2.png'
import car3 from '../assets/car3.png'

interface LevelInfo {
  id: number
  name: string
  label: string
  sublabel: string
  description: string
  details: { icon: string; text: string }[]
  color: string
  accentColor: string
  bgGradient: string
  gridSize: string
  difficulty: number // 1-5
  previewImage?: string // Path gambar preview
}

const levels: LevelInfo[] = [
  {
    id: 1,
    name: 'LEVEL 01',
    label: 'Traffic Light',
    sublabel: 'Pemula',
    description: 'Kuasai aturan lalu lintas dasar di kota kecil yang tenang. Tidak ada kendaraan lain yang menghalangi.',
    details: [
      { icon: '🚦', text: '4 traffic light aktif' },
      { icon: '🛣️', text: 'Grid 7×7 — jalan lebar' },
      { icon: '🚫', text: 'Tanpa NPC kendaraan' },
      { icon: '🚶', text: 'Tanpa pejalan kaki' },
    ],
    color: '#22c55e',
    accentColor: '#16a34a',
    bgGradient: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 100%)',
    gridSize: '7×7',
    difficulty: 1,
    previewImage: car1,
  },
  {
    id: 2,
    name: 'LEVEL 02',
    label: 'NPC Traffic',
    sublabel: 'Menengah',
    description: 'Berbagi jalan dengan kendaraan NPC aktif. Antisipasi pergerakan lalu lintas dan patuhi lampu merah.',
    details: [
      { icon: '🚗', text: '16 NPC kendaraan' },
      { icon: '🛣️', text: 'Grid 9×9 — kota sedang' },
      { icon: '🚦', text: '6 traffic light' },
      { icon: '⚡', text: 'NPC kecepatan moderat' },
    ],
    color: '#f59e0b',
    accentColor: '#d97706',
    bgGradient: 'linear-gradient(135deg, #1c1003 0%, #3d2906 40%, #451f00 100%)',
    gridSize: '9×9',
    difficulty: 3,
    previewImage: car2,
  },
  {
    id: 3,
    name: 'LEVEL 03',
    label: 'Full City',
    sublabel: 'Mahir',
    description: 'Kota penuh tantangan. NPC agresif bisa terobos lampu merah, pejalan kaki menyeberang sewaktu-waktu.',
    details: [
      { icon: '🚙', text: '28 NPC agresif' },
      { icon: '🏙️', text: 'Grid 11×11 — kota besar' },
      { icon: '🚦', text: '10 traffic light' },
      { icon: '🚶', text: '4 pejalan kaki/penyeberangan' },
    ],
    color: '#ef4444',
    accentColor: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #1f0505 0%, #3d0b0b 40%, #450000 100%)',
    gridSize: '11×11',
    difficulty: 5,
    previewImage: car3,
  },
]

interface MapSelectionProps {
  onStartGame: () => void
  onBack?: () => void
}

export function MapSelection({ onStartGame, onBack }: MapSelectionProps) {
  const navigate = useNavigate()
  const {
    selectedLevel,
    setSelectedLevel,
    setSelectedMap,
    startAtLevel,
    playerName,
    timeOfDay,
    setTimeOfDay,
  } = useGameStore()
  const [showEEGGuide, setShowEEGGuide] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)

  const selectedLevelData = levels.find(l => l.id === selectedLevel) ?? levels[0]

  const handleLevelSelect = (levelId: number) => {
    if (levelId === selectedLevel) return
    setAnimating(true)
    setTimeout(() => {
      setSelectedLevel(levelId)
      setAnimating(false)
    }, 150)
  }

  const handleStartGame = () => {
    setSelectedMap('ngawi-city')
    startAtLevel(selectedLevel)
    onStartGame()
  }

  const handleBackToDashboard = () => {
    if (onBack) onBack()
    else navigate('/dashboard')
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') handleLevelSelect(Math.max(1, selectedLevel - 1))
      if (e.key === 'ArrowRight' || e.key === 'd') handleLevelSelect(Math.min(3, selectedLevel + 1))
      if (e.key === 'Enter') handleStartGame()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedLevel])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#070a0f',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Animated background matching selected level */}
      <div style={{
        position: 'absolute', inset: 0,
        background: selectedLevelData.bgGradient,
        opacity: 0.35,
        transition: 'all 0.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Scanline overlay for game feel */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: selectedLevelData.color,
            boxShadow: `0 0 8px ${selectedLevelData.color}`,
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Driving Simulator
          </span>
        </div>

        {playerName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 999, padding: '5px 14px',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: `linear-gradient(135deg, ${selectedLevelData.color}, ${selectedLevelData.accentColor})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 800, color: '#fff',
            }}>
              {playerName.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', fontWeight: 600 }}>{playerName}</span>
          </div>
        )}

        <button onClick={handleBackToDashboard} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.4)',
          fontSize: '0.78rem', cursor: 'pointer', letterSpacing: '0.05em',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          ← UBAH NAMA
        </button>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 10,
        display: 'flex', overflow: 'hidden',
      }}>

        {/* LEFT: Level selector list */}
        <div style={{
          width: 220, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 0 0 24px', gap: 12,
        }}>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', marginBottom: 8 }}>
            PILIH LEVEL
          </div>
          {levels.map((level) => {
            const isSelected = selectedLevel === level.id
            const isHov = hovered === level.id
            return (
              <div key={level.id}
                onClick={() => handleLevelSelect(level.id)}
                onMouseEnter={() => setHovered(level.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'relative', cursor: 'pointer', borderRadius: 12,
                  padding: '14px 18px',
                  background: isSelected
                    ? `linear-gradient(135deg, ${level.color}22, ${level.color}11)`
                    : isHov ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? level.color + '66' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.25s ease',
                  transform: isSelected ? 'translateX(8px)' : isHov ? 'translateX(4px)' : 'none',
                  boxShadow: isSelected ? `0 0 20px ${level.color}22, inset 0 0 20px ${level.color}08` : 'none',
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: '60%', background: level.color,
                    borderRadius: '0 2px 2px 0',
                    boxShadow: `0 0 8px ${level.color}`,
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${level.color}33, ${level.color}11)`,
                    border: `1px solid ${level.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>
                    {level.details[0].icon}
                  </div>
                  <div>
                    <div style={{ color: isSelected ? level.color : 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em' }}>
                      {level.name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', marginTop: 1 }}>
                      {level.label}
                    </div>
                  </div>
                </div>
                {/* Difficulty dots */}
                <div style={{ display: 'flex', gap: 3, marginTop: 8, paddingLeft: 46 }}>
                  {[1,2,3,4,5].map(d => (
                    <div key={d} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: d <= level.difficulty ? level.color : 'rgba(255,255,255,0.1)',
                      boxShadow: d <= level.difficulty ? `0 0 4px ${level.color}` : 'none',
                    }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* CENTER: Main preview area */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '20px 24px', gap: 16, overflow: 'hidden',
        }}>
          {/* Preview "screen" */}
          <div style={{
            flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative',
            border: `1px solid ${selectedLevelData.color}33`,
            boxShadow: `0 0 40px ${selectedLevelData.color}18, 0 0 80px ${selectedLevelData.color}08`,
            opacity: animating ? 0 : 1,
            transition: 'opacity 0.15s ease',
            minHeight: 0,
          }}>
            {/* Level preview image — letakkan gambar di public/assets/previews/level1.jpg, level2.jpg, level3.jpg */}
            {selectedLevelData.previewImage ? (
              <img
                src={selectedLevelData.previewImage}
                alt={`Preview ${selectedLevelData.label}`}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  transition: 'opacity 0.3s ease',
                }}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                background: selectedLevelData.bgGradient,
                opacity: 0.6,
              }} />
            )}

            {/* Vignette layers */}
            {/* 1. Radial vignette — darkens edges, bright center */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 70% 70% at 50% 45%, transparent 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.82) 100%)',
            }} />
            {/* 2. Color tint vignette matching level color */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, ${selectedLevelData.color}22 100%)`,
              mixBlendMode: 'screen',
            }} />
            {/* 3. Horizontal scan-line texture for game feel */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.12,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
            }} />
            {/* Level name overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '40px 28px 24px',
              background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)',
            }}>
              <div style={{
                display: 'inline-block',
                background: `linear-gradient(135deg, ${selectedLevelData.color}, ${selectedLevelData.accentColor})`,
                borderRadius: 6, padding: '3px 12px', marginBottom: 8,
                fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.15em',
              }}>
                {selectedLevelData.sublabel.toUpperCase()}
              </div>
              <div style={{
                fontSize: '1.8rem', fontWeight: 900, color: '#fff',
                letterSpacing: '0.05em', lineHeight: 1.1,
                textShadow: `0 0 30px ${selectedLevelData.color}88`,
              }}>
                {selectedLevelData.label}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 4 }}>
                Kota {selectedLevelData.gridSize} · Procedurally Generated
              </div>
            </div>

            {/* Top right: grid size badge */}
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              border: `1px solid ${selectedLevelData.color}44`,
              borderRadius: 8, padding: '6px 12px',
              color: selectedLevelData.color, fontSize: '0.75rem', fontWeight: 700,
            }}>
              {selectedLevelData.gridSize} GRID
            </div>
          </div>

          {/* Navigation hint */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center',
          }}>
            {levels.map(l => (
              <div key={l.id} onClick={() => handleLevelSelect(l.id)} style={{
                width: selectedLevel === l.id ? 28 : 8,
                height: 4, borderRadius: 999, cursor: 'pointer',
                background: selectedLevel === l.id ? l.color : 'rgba(255,255,255,0.15)',
                boxShadow: selectedLevel === l.id ? `0 0 8px ${l.color}` : 'none',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>

        {/* RIGHT: Info panel */}
        <div style={{
          width: 240, flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 24px 0 0', gap: 16,
        }}>

          {/* Description */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '16px',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 8 }}>
              DESKRIPSI
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.6,
              opacity: animating ? 0 : 1, transition: 'opacity 0.15s',
            }}>
              {selectedLevelData.description}
            </p>
          </div>

          {/* Stats */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '16px',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 12 }}>
              DETAIL LEVEL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedLevelData.details.map((d, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: animating ? 0 : 1,
                  transition: `opacity 0.15s ${i * 0.04}s`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${selectedLevelData.color}18`,
                    border: `1px solid ${selectedLevelData.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem',
                  }}>
                    {d.icon}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem' }}>{d.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Static time-of-day selector */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em' }}>
                WAKTU BERKENDARA
              </div>
              <div style={{ color: selectedLevelData.color, fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {String(Math.floor(timeOfDay) % 24).padStart(2, '0')}:{timeOfDay % 1 >= 0.5 ? '30' : '00'}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={23.5}
              step={0.5}
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(Number(e.target.value))}
              aria-label="Pilih waktu berkendara"
              style={{ width: '100%', cursor: 'pointer', accentColor: selectedLevelData.color }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, color: 'rgba(255,255,255,0.28)', fontSize: '0.58rem' }}>
              <span>🌙 00</span><span>🌅 06</span><span>☀️ 12</span><span>🌇 18</span><span>24 🌙</span>
            </div>
          </div>

          {/* Start button */}
          <button onClick={handleStartGame} style={{
            padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${selectedLevelData.color}, ${selectedLevelData.accentColor})`,
            color: '#fff', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.1em',
            boxShadow: `0 4px 24px ${selectedLevelData.color}55`,
            transition: 'all 0.2s ease',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${selectedLevelData.color}88` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 24px ${selectedLevelData.color}55` }}
          >
            🚗 MULAI GAME
          </button>

          {/* EEG Setup */}
          <button onClick={() => setShowEEGGuide(v => !v)} style={{
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: 10, padding: '9px', cursor: 'pointer', color: '#c4b5fd',
            fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
          }}>
            🧠 Setup Muse 2 / EEG ↗
          </button>
        </div>
      </div>

      {/* Bottom: keyboard hint
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'center', gap: 16, padding: '10px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        {[
          { key: '←  →', desc: 'Pilih level' },
          { key: 'Enter', desc: 'Mulai game' },
          { key: 'K', desc: 'Nyalakan mesin' },
          { key: 'WASD', desc: 'Bergerak' },
          { key: 'SPACE', desc: 'Rem' },
          { key: 'V', desc: 'Kamera' },
        ].map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <kbd style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5, padding: '2px 7px', color: 'rgba(255,255,255,0.6)',
              fontSize: '0.65rem', fontWeight: 700,
            }}>{h.key}</kbd>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem' }}>{h.desc}</span>
          </div>
        ))}
      </div> */}

      {/* EEG Floating Panel */}
      {showEEGGuide && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 1100 }} onClick={() => setShowEEGGuide(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '420px', maxWidth: '92vw', background: '#0f172a',
            border: '1px solid rgba(139,92,246,0.35)', borderRadius: '16px', padding: '20px',
            zIndex: 1101, boxShadow: '0 0 60px rgba(139,92,246,0.2), 0 25px 50px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#c4b5fd', fontWeight: 700 }}>🧠 Setup EEG Server (Muse 2)</span>
              <button onClick={() => setShowEEGGuide(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            {[
              { num: '1', color: '#38bdf8', title: 'Download EEG Package', desc: 'Extract ke folder mana saja.', action: <a href={EEG_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" download style={{ display: 'inline-block', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 6, padding: '4px 12px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>⬇ Download EEG Package</a> },
              { num: '2', color: '#a78bfa', title: 'Jalankan start_eeg.bat', desc: 'Pastikan Muse 2 nyala & Bluetooth aktif.', action: <code style={{ display: 'inline-block', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6, padding: '4px 10px', color: '#a78bfa', fontSize: '0.78rem', fontFamily: 'monospace' }}>📂 eeg-server / start_eeg.bat</code> },
              { num: '3', color: '#34d399', title: 'Paste Session ID', desc: 'Copy Session ID dari banner atas game, paste ke terminal EEG.', action: null },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.color + '22', color: step.color, border: `1px solid ${step.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{step.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{step.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: step.action ? 6 : 0 }}>{step.desc}</div>
                  {step.action}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: '#6ee7b7', fontSize: '0.8rem', lineHeight: 1.5 }}>
              💡 Tanpa Muse 2, aplikasi tetap jalan normal dengan monitoring kamera saja.
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

// ── City Grid Preview Component ────────────────────────────────────────────
function CityGridPreview({ level }: { level: LevelInfo }) {
  const gridN = level.id === 1 ? 7 : level.id === 2 ? 9 : 11
  const cellSize = 36
  const roadW = 6
  const total = gridN * cellSize + (gridN - 1) * roadW
  const offset = 20

  const color = level.color
  const roadColor = '#1a1a2e'
  const buildingColors = ['#1e293b', '#172033', '#1a2744', '#162030']

  // Pre-seeded "random" for deterministic layout
  const hash = (x: number, y: number) => ((x * 31 + y * 17) % 100)

  return (
    <svg
      viewBox={`0 0 ${total + offset * 2} ${total + offset * 2}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.85 }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Dark background */}
      <rect width={total + offset * 2} height={total + offset * 2} fill="#0a0f1e" />

      {/* Roads */}
      {Array.from({ length: gridN }).map((_, row) =>
        Array.from({ length: gridN }).map((_, col) => {
          const x = offset + col * (cellSize + roadW)
          const y = offset + row * (cellSize + roadW)
          const isBuilding = hash(col, row) > 20
          const bColor = buildingColors[hash(col, row) % buildingColors.length]
          const hasLight = hash(col + 3, row + 7) < (level.id * 8)

          return (
            <g key={`${row}-${col}`}>
              {/* Block */}
              {isBuilding && (
                <rect
                  x={x + 1} y={y + 1}
                  width={cellSize - 2} height={cellSize - 2}
                  fill={bColor} rx={2}
                  opacity={0.9}
                />
              )}
              {/* Building windows */}
              {isBuilding && hash(col * 2, row * 3) > 40 && (
                <>
                  <rect x={x + 5} y={y + 5} width={4} height={4} fill={`${color}44`} rx={1} />
                  <rect x={x + 12} y={y + 5} width={4} height={4} fill={`${color}33`} rx={1} />
                  <rect x={x + 5} y={y + 13} width={4} height={4} fill={`${color}22`} rx={1} />
                </>
              )}
              {/* Traffic light */}
              {hasLight && col < gridN - 1 && row < gridN - 1 && (
                <circle
                  cx={x + cellSize + roadW / 2}
                  cy={y + cellSize + roadW / 2}
                  r={2.5}
                  fill={color}
                  opacity={0.9}
                />
              )}
            </g>
          )
        })
      )}

      {/* Road lines */}
      {Array.from({ length: gridN - 1 }).map((_, i) => {
        const pos = offset + (i + 1) * (cellSize + roadW) - roadW
        return (
          <g key={i}>
            <rect x={offset} y={pos} width={total} height={roadW} fill={roadColor} />
            <rect x={pos} y={offset} width={roadW} height={total} fill={roadColor} />
            {/* Road center lines */}
            <line
              x1={offset} y1={pos + roadW / 2} x2={offset + total} y2={pos + roadW / 2}
              stroke={`${color}33`} strokeWidth={0.5} strokeDasharray="4 4"
            />
            <line
              x1={pos + roadW / 2} y1={offset} x2={pos + roadW / 2} y2={offset + total}
              stroke={`${color}33`} strokeWidth={0.5} strokeDasharray="4 4"
            />
          </g>
        )
      })}

      {/* Player car indicator */}
      <g transform={`translate(${offset + 1 * (cellSize + roadW) - roadW / 2}, ${offset + 1 * (cellSize + roadW) - roadW / 2})`}>
        <circle r={5} fill={color} opacity={0.9} />
        <circle r={8} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
        <circle r={12} fill="none" stroke={color} strokeWidth={0.5} opacity={0.2} />
      </g>

      {/* Glow overlay at intersections */}
      <radialGradient id={`glow-${level.id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={color} stopOpacity="0.08" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <rect width={total + offset * 2} height={total + offset * 2} fill={`url(#glow-${level.id})`} />
    </svg>
  )
}
