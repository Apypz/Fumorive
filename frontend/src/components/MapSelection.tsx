import { useGameStore } from '../stores/gameStore'
import type { MapType } from '../game/types/map.types'

interface MapInfo {
  id: MapType
  name: string
  description: string
  thumbnail: string
}

const maps: MapInfo[] = [
  {
    id: 'solo-city' as MapType,
    name: 'Solo City',
    description: 'Kota urban dengan gedung-gedung, jalan raya, dan banyak obstacle. Cocok untuk pengalaman berkendara yang menantang.',
    thumbnail: '🏙️',
  },
  {
    id: 'sriwedari-park' as MapType,
    name: 'Sriwedari Park',
    description: 'Taman terbuka yang luas dengan sedikit obstacle. Sempurna untuk berlatih dan menguji kendaraan dengan bebas.',
    thumbnail: '🌳',
  },
]

interface MapSelectionProps {
  onStartGame: () => void
}

export function MapSelection({ onStartGame }: MapSelectionProps) {
  const { selectedMap, setSelectedMap } = useGameStore()

  const handleMapSelect = (mapId: MapType) => {
    setSelectedMap(mapId)
  }

  const handleStartGame = () => {
    onStartGame()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h1 style={styles.title}>PILIH MAP</h1>
        <p style={styles.subtitle}>Pilih map untuk memulai permainan</p>

        <div style={styles.mapGrid}>
          {maps.map((map) => (
            <div
              key={map.id}
              style={{
                ...styles.mapCard,
                ...(selectedMap === map.id ? styles.mapCardSelected : {}),
              }}
              onClick={() => handleMapSelect(map.id)}
            >
              <div style={styles.mapThumbnail}>{map.thumbnail}</div>
              <div style={styles.mapInfo}>
                <h2 style={styles.mapName}>{map.name}</h2>
                <p style={styles.mapDescription}>{map.description}</p>
              </div>
              {selectedMap === map.id && (
                <div style={styles.selectedBadge}>TERPILIH</div>
              )}
            </div>
          ))}
        </div>

        <button style={styles.startButton} onClick={handleStartGame}>
          MULAI GAME
        </button>

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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    maxWidth: '900px',
    width: '90%',
    padding: '2rem',
    textAlign: 'center',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '0.5rem',
    letterSpacing: '0.1em',
    textShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: '2rem',
  },
  mapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  mapCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  mapCardSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
  },
  mapThumbnail: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  mapInfo: {
    textAlign: 'left',
  },
  mapName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '0.5rem',
  },
  mapDescription: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 1.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '1rem 3rem',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.1em',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
  },
  controlsHint: {
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
  },
}
