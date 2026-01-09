import { useGameStore } from '../stores/gameStore'

interface GraphicsSettingsProps {
  onClose: () => void
}

export function GraphicsSettings({ onClose }: GraphicsSettingsProps) {
  const { graphicsConfig, setGraphicsConfig, setGraphicsPreset } = useGameStore()

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Graphics Settings</h2>

        {/* Preset Buttons */}
        <div style={styles.presetContainer}>
          {(['low', 'medium', 'high', 'ultra'] as const).map((preset) => (
            <button
              key={preset}
              style={{
                ...styles.presetButton,
                ...(graphicsConfig.shadowQuality === preset ? styles.presetButtonActive : {}),
              }}
              onClick={() => setGraphicsPreset(preset)}
            >
              {preset.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Individual Settings */}
        <div style={styles.settingsList}>
          <SettingToggle
            label="Post Processing"
            value={graphicsConfig.postProcessing}
            onChange={(v) => setGraphicsConfig({ postProcessing: v })}
          />
          <SettingToggle
            label="Anti-aliasing (FXAA)"
            value={graphicsConfig.fxaa}
            onChange={(v) => setGraphicsConfig({ fxaa: v })}
          />
          <SettingToggle
            label="Bloom"
            value={graphicsConfig.bloom}
            onChange={(v) => setGraphicsConfig({ bloom: v })}
          />
          <SettingToggle
            label="SSAO"
            value={graphicsConfig.ssao}
            onChange={(v) => setGraphicsConfig({ ssao: v })}
          />
          <SettingToggle
            label="Motion Blur"
            value={graphicsConfig.motionBlur}
            onChange={(v) => setGraphicsConfig({ motionBlur: v })}
          />
          <SettingToggle
            label="Chromatic Aberration"
            value={graphicsConfig.chromaticAberration}
            onChange={(v) => setGraphicsConfig({ chromaticAberration: v })}
          />
          <SettingToggle
            label="Vignette"
            value={graphicsConfig.vignette}
            onChange={(v) => setGraphicsConfig({ vignette: v })}
          />
          <SettingToggle
            label="Sharpen"
            value={graphicsConfig.sharpen}
            onChange={(v) => setGraphicsConfig({ sharpen: v })}
          />
          <SettingToggle
            label="HDR"
            value={graphicsConfig.hdr}
            onChange={(v) => setGraphicsConfig({ hdr: v })}
          />
        </div>

        <button style={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

interface SettingToggleProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

function SettingToggle({ label, value, onChange }: SettingToggleProps) {
  return (
    <div style={styles.settingRow}>
      <span style={styles.settingLabel}>{label}</span>
      <button
        style={{
          ...styles.toggleButton,
          ...(value ? styles.toggleButtonOn : styles.toggleButtonOff),
        }}
        onClick={() => onChange(!value)}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    backdropFilter: 'blur(5px)',
  },
  container: {
    backgroundColor: '#1a1a24',
    borderRadius: '12px',
    padding: '2rem',
    minWidth: '400px',
    maxWidth: '500px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '1.5rem',
    textAlign: 'center',
    letterSpacing: '0.1em',
  },
  presetContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  presetButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  presetButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.875rem',
  },
  toggleButton: {
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    border: 'none',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: '60px',
    transition: 'all 0.2s',
  },
  toggleButtonOn: {
    backgroundColor: '#4ade80',
    color: '#000',
  },
  toggleButtonOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closeButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
