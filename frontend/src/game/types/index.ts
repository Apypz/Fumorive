/**
 * Game Types Index
 * =================
 * Central export point for all game type definitions.
 * 
 * Import types from here:
 * ```typescript
 * import type { CameraMode, CarPhysicsConfig, MapType } from '../types'
 * ```
 */

// ============================================
// GAME CORE TYPES
// ============================================
export type {
  GameConfig,
  GraphicsConfig,
  SceneContext,
  GameScene,
  AssetLoadProgress,
  AssetManifest,
  AssetEntry,
  TransformData,
  EntityComponent,
  GameEntity,
  InputState,
} from './game.types'

export {
  GRAPHICS_PRESETS,
  DEFAULT_GRAPHICS_CONFIG,
} from './game.types'

// ============================================
// CAR TYPES
// ============================================
export type {
  // Camera
  CameraMode,
  CameraConfig,
  CameraPositionConfig,
  ThirdPersonCameraConfig,
  FirstPersonCameraConfig,
  FreeCameraConfig,
  
  // Controls
  ControlMode,
  ControlsConfig,
  KeyBindings,
  MouseControlConfig,
  
  // Physics
  CarPhysicsConfig,
  CarControllerConfig,
  CarInputState,
  CarPhysicsState,
  
  // Drift Particles
  DriftParticleConfig,
  WheelOffset,
} from './car.types'

// ============================================
// MAP TYPES
// ============================================
export type {
  MapType,
  MapConfig,
  MapBounds,
  MapEnvironment,
  MapSettings,
  SpawnPoint,
  MapInfo,
  Vector3D,
  RGBColor,
  AABBCollider,
  CollisionResult,
} from './map.types'
