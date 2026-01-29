/**
 * Audio Configuration
 * ===================
 * Centralized audio settings for the game.
 * Adjust volumes, paths, and audio behavior here.
 */

// ============================================
// AUDIO FILE PATHS
// ============================================

/**
 * Paths to audio files (relative to public folder)
 */
export const AUDIO_PATHS = {
  // Engine sounds
  engine: {
    /** Main engine loop sound - pitch changes with speed */
    loop: '/assets/sfx/car_engine2.mp3',
    /** Engine start sound - plays once when engine starts */
    start: '/assets/sfx/engine_start.mp3',
  },
  
  // Vehicle sounds
  vehicle: {
    /** Horn sound */
    horn: '/assets/sfx/horn.mp3',
    /** Crash/collision sound */
    crash: '/assets/sfx/crash.mp3',
    // brake: '/assets/sfx/car_brake.mp3',
    // drift: '/assets/sfx/car_drift.mp3',
  },
  
  // UI sounds
  ui: {
    // click: '/assets/sfx/ui_click.mp3',
    // hover: '/assets/sfx/ui_hover.mp3',
    // select: '/assets/sfx/ui_select.mp3',
  },
  
  // Ambient sounds
  ambient: {
    // city: '/assets/sfx/ambient_city.mp3',
    // park: '/assets/sfx/ambient_park.mp3',
  },
} as const

// ============================================
// VOLUME SETTINGS
// ============================================

/**
 * Master volume (0.0 - 1.0)
 * Controls overall game volume
 */
export const MASTER_VOLUME = 1.0

/**
 * Category volumes (0.0 - 1.0)
 * Each category is multiplied by master volume
 */
export const VOLUME_CATEGORIES = {
  /** Engine and vehicle sounds */
  engine: 1.0,
  
  /** Sound effects (horn, crash, etc) */
  sfx: 0.7,
  
  /** UI sounds (clicks, hovers) */
  ui: 0.5,
  
  /** Background ambient sounds */
  ambient: 0.3,
  
  /** Music */
  music: 0.4,
} as const

/**
 * Individual sound volumes (0.0 - 1.0)
 * Fine-tune specific sounds
 */
export const SOUND_VOLUMES = {
  // Engine
  engineLoop: 0.6,
  engineStart: 0.6,
  
  // Vehicle
  horn: 0.8,
  brake: 0.4,
  crash: 0.9,
  drift: 0.5,
  
  // UI
  uiClick: 0.6,
  uiHover: 0.3,
} as const

// ============================================
// ENGINE AUDIO SETTINGS
// ============================================

/**
 * Engine audio configuration
 * Controls how the engine sound changes with speed and throttle
 */
export const ENGINE_AUDIO_CONFIG = {
  // === LOUDNESS SETTINGS ===
  
  /** 
   * Gain multiplier - controls overall loudness
   * 1.0 = normal volume
   * 2.0 = 2x louder  
   * 3.0 = 3x louder
   * 5.0 = 5x louder (use with caution)
   */
  gainMultiplier: 1.0,
  
  // === VOLUME SETTINGS ===
  
  /** Base volume when engine is running but car is stationary (0.0 - 1.0) */
  baseVolume: 1.0,
  
  /** Maximum volume at full throttle/high speed (0.0 - 1.0) */
  maxVolume: 1.0,
  
  /** How much throttle input boosts volume (0.0 - 1.0) */
  throttleVolumeBoost: 0.45,
  
  /** How much speed affects volume (0.0 - 1.0) */
  speedVolumeBoost: 0.25,
  
  // === PITCH SETTINGS ===
  // Pitch (playback rate) simulates engine RPM
  // Higher pitch = higher RPM sound = faster engine
  
  /** Minimum pitch when stationary/idle (0.4 - 0.8) */
  minPitch: 0.8,
  
  /** Maximum pitch at top speed (1.5 - 2.5) */
  maxPitch: 1.5,
  
  /** Speed (km/h) at which maximum pitch is reached */
  maxSpeedForPitch: 120,
  
  /** How much throttle affects pitch - revving effect (0.0 - 0.5) */
  throttlePitchBoost: 0.35,
  
  /** Extra pitch boost during acceleration (0.0 - 0.3) */
  accelerationPitchBoost: 0.2,
  
  // === SMOOTHING ===
  // Lower values = smoother transitions, higher = more responsive
  
  /** Volume transition smoothness (0.01 - 1.0) */
  volumeSmoothness: 0.15,
  
  /** Pitch transition smoothness (0.01 - 1.0) */
  pitchSmoothness: 0.12,
  
  // === FADE SETTINGS ===
  
  /** Fade in duration when starting engine loop (ms) */
  fadeInDuration: 350,
  
  /** Fade out duration when stopping engine loop (ms) */
  fadeOutDuration: 200,
  
  // === ENGINE START SOUND SETTINGS ===
  
  /** 
   * Volume for engine start sound (0.0 - 1.0)
   * This is multiplied by gainMultiplier
   */
  startVolume: 0.3,
  
  /** 
   * Fade out duration at the end of start sound (ms)
   * This creates a smooth transition to the engine loop
   */
  startFadeOutDuration: 500,
  
  /**
   * Delay before starting fade out (ms from start)
   * Set this based on your audio file length minus fade duration
   * Example: if audio is 2000ms and fade is 500ms, set to 1500
   */
  startFadeOutDelay: 1500,
} as const

// ============================================
// HORN AUDIO SETTINGS
// ============================================

/**
 * Horn audio configuration
 * Controls horn sound behavior
 */
export const HORN_AUDIO_CONFIG = {
  /** 
   * Horn volume (0.0 - 1.0)
   * This is multiplied by gainMultiplier from ENGINE_AUDIO_CONFIG
   */
  volume: 1.0,
  
  /**
   * Gain multiplier for horn - controls overall loudness
   * 1.0 = normal, 2.0 = 2x louder
   */
  gainMultiplier: 1.5,
  
  /**
   * Whether horn should loop while key is held
   * true = loop continuously, false = play once per press
   */
  loop: true,
  
  /**
   * Fade in duration when horn starts (ms)
   */
  fadeInDuration: 50,
  
  /**
   * Fade out duration when horn stops (ms)
   */
  fadeOutDuration: 100,
} as const

// ============================================
// CRASH AUDIO SETTINGS
// ============================================

/**
 * Crash/collision audio configuration
 */
export const CRASH_AUDIO_CONFIG = {
  /** 
   * Crash sound volume (0.0 - 1.0)
   */
  volume: 0.8,
  
  /**
   * Gain multiplier for crash sound
   * 1.0 = normal, 2.0 = 2x louder
   */
  gainMultiplier: 1.0,
  
  /**
   * Minimum impact velocity to trigger crash sound (m/s)
   * Lower = more sensitive, higher = only big crashes
   */
  minImpactVelocity: 3.0,
  
  /**
   * Cooldown between crash sounds (ms)
   * Prevents rapid repeated sounds
   */
  cooldown: 500,
  
  /**
   * Whether to scale volume based on impact force
   * true = harder crash = louder sound
   */
  scaleVolumeByImpact: true,
  
  /**
   * Maximum impact velocity for volume scaling (m/s)
   * Impacts above this will play at full volume
   */
  maxImpactVelocity: 15.0,
} as const

// ============================================
// AUDIO BEHAVIOR
// ============================================

/**
 * General audio behavior settings
 */
export const AUDIO_BEHAVIOR = {
  /** Whether to loop background sounds */
  loopAmbient: true,
  
  /** Whether to loop engine sounds */
  loopEngine: true,
  
  /** Maximum simultaneous sounds */
  maxSimultaneousSounds: 8,
  
  /** Default fade duration (ms) */
  defaultFadeDuration: 200,
  
  /** Whether to pause audio when game is paused */
  pauseOnGamePause: true,
  
  /** Whether to mute when window loses focus */
  muteOnBlur: false,
} as const

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AudioCategory = keyof typeof VOLUME_CATEGORIES
export type SoundName = keyof typeof SOUND_VOLUMES

export interface AudioConfig {
  masterVolume: number
  categories: typeof VOLUME_CATEGORIES
  sounds: typeof SOUND_VOLUMES
  engine: typeof ENGINE_AUDIO_CONFIG
  behavior: typeof AUDIO_BEHAVIOR
  paths: typeof AUDIO_PATHS
}

// ============================================
// COMBINED CONFIG EXPORT
// ============================================

/**
 * Complete audio configuration object
 */
export const AUDIO_CONFIG: AudioConfig = {
  masterVolume: MASTER_VOLUME,
  categories: VOLUME_CATEGORIES,
  sounds: SOUND_VOLUMES,
  engine: ENGINE_AUDIO_CONFIG,
  behavior: AUDIO_BEHAVIOR,
  paths: AUDIO_PATHS,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate effective volume for a sound
 * @param soundVolume Individual sound volume (0-1)
 * @param category Audio category
 * @returns Effective volume (0-1)
 */
export function calculateEffectiveVolume(
  soundVolume: number,
  category: AudioCategory = 'sfx'
): number {
  return Math.min(1, Math.max(0, 
    soundVolume * VOLUME_CATEGORIES[category] * MASTER_VOLUME
  ))
}

/**
 * Calculate engine volume based on throttle and speed
 * @param throttle Current throttle input (-1 to 1)
 * @param speedKmh Current speed in km/h
 * @returns Volume (0-1)
 */
export function calculateEngineVolume(throttle: number, speedKmh: number): number {
  const config = ENGINE_AUDIO_CONFIG
  
  // Base volume
  let volume: number = config.baseVolume
  
  // Boost from throttle input
  volume += Math.abs(throttle) * config.throttleVolumeBoost
  
  // Boost from speed
  const speedFactor = Math.min(1, speedKmh / config.maxSpeedForPitch)
  volume += speedFactor * config.speedVolumeBoost
  
  // Cap at maxVolume
  volume = Math.min(config.maxVolume, volume)
  
  // Apply category and master volume
  return calculateEffectiveVolume(volume, 'engine')
}

/**
 * Calculate engine pitch based on speed and throttle
 * Higher speed = higher pitch (simulates RPM)
 * @param speedKmh Current speed in km/h
 * @param throttle Current throttle input (-1 to 1)
 * @param isAccelerating Whether the car is currently accelerating
 * @returns Playback rate (pitch multiplier)
 */
export function calculateEnginePitch(
  speedKmh: number, 
  throttle: number = 0,
  isAccelerating: boolean = false
): number {
  const config = ENGINE_AUDIO_CONFIG
  
  // Base pitch from speed with exponential curve
  const speedFactor = Math.min(1, speedKmh / config.maxSpeedForPitch)
  const speedPitchFactor = Math.pow(speedFactor, 0.8)
  let pitch = config.minPitch + speedPitchFactor * (config.maxPitch - config.minPitch)
  
  // Throttle boost (revving effect)
  pitch += Math.abs(throttle) * config.throttlePitchBoost
  
  // Extra boost during acceleration
  if (isAccelerating && throttle > 0) {
    pitch += config.accelerationPitchBoost
  }
  
  // Clamp pitch to reasonable range
  return Math.max(0.5, Math.min(2.5, pitch))
}
