import { useGameStore } from '../stores/gameStore'

export function LoadingScreen() {
  const { isLoading, loadingProgress } = useGameStore()

  if (!isLoading) return null

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>FUMORIVE</h1>
        <p style={styles.subtitle}>Loading Experience...</p>

        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${loadingProgress?.percentage ?? 0}%`,
            }}
          />
        </div>

        {loadingProgress && (
          <p style={styles.progressText}>
            {loadingProgress.currentAsset} ({loadingProgress.loaded}/{loadingProgress.total})
          </p>
        )}

        <div style={styles.spinner} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    textAlign: 'center',
    color: '#fff',
  },
  title: {
    fontSize: '4rem',
    fontWeight: 200,
    letterSpacing: '0.5em',
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1rem',
    letterSpacing: '0.3em',
    opacity: 0.6,
    marginBottom: '2rem',
    textTransform: 'uppercase',
  },
  progressContainer: {
    width: '300px',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    margin: '0 auto 1rem',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.75rem',
    opacity: 0.4,
    marginBottom: '2rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

// Add keyframe animation via style tag
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`
document.head.appendChild(styleSheet)
