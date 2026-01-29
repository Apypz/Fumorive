/**
 * Game Configuration Index
 * ========================
 * Central export point for all game configurations.
 * 
 * Import configurations from here:
 * ```typescript
 * import { DEFAULT_PHYSICS_CONFIG, DEFAULT_CAMERA_CONFIG } from '../config'
 * ```
 */

// Physics Configuration
export {
  DEFAULT_PHYSICS_CONFIG,
  REALISTIC_PHYSICS_CONFIG,
  ARCADE_PHYSICS_CONFIG,
  PHYSICS_PRESETS,
  type PhysicsPreset,
} from './physics.config'

// Camera Configuration
export {
  DEFAULT_CAMERA_CONFIG,
  DEFAULT_THIRD_PERSON_CONFIG,
  DEFAULT_FIRST_PERSON_CONFIG,
  DEFAULT_FREE_CAMERA_CONFIG,
  LARGE_VEHICLE_CAMERA_CONFIG,
  SMALL_VEHICLE_CAMERA_CONFIG,
  CAMERA_PRESETS,
  type CameraPreset,
} from './camera.config'

// Controls Configuration
export {
  DEFAULT_CONTROLS_CONFIG,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_MOUSE_CONFIG,
  ARROW_KEY_BINDINGS,
  RACING_KEY_BINDINGS,
  HIGH_SENSITIVITY_MOUSE_CONFIG,
  LOW_SENSITIVITY_MOUSE_CONFIG,
  CONTROLS_PRESETS,
  type ControlsPreset,
} from './controls.config'

// Map Configuration
export {
  DEFAULT_MAP_BOUNDS,
  DEFAULT_SPAWN_POINT,
  BAHLIL_CITY_CONFIG,
  ICLIK_PARK_CONFIG,
  MAP_CONFIGS,
  AVAILABLE_MAPS,
  getMapConfig,
} from './map.config'

// Audio Configuration
export {
  AUDIO_PATHS,
  MASTER_VOLUME,
  VOLUME_CATEGORIES,
  SOUND_VOLUMES,
  ENGINE_AUDIO_CONFIG,
  AUDIO_BEHAVIOR,
  AUDIO_CONFIG,
  calculateEffectiveVolume,
  calculateEngineVolume,
  calculateEnginePitch,
  type AudioCategory,
  type SoundName,
  type AudioConfig,
} from './audio.config'
