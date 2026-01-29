/**
 * Car Module Index
 * =================
 * Central export point for all car-related classes and types.
 */

// Main controller
export { CarController, DEFAULT_CAMERA_CONFIG } from './CarController'
export type { CarControllerConfig } from './CarController'

// Sub-systems
export { CarPhysics } from './CarPhysics'
export type { PhysicsInfo } from './CarPhysics'

export { CarCameraManager } from './CarCameraManager'

// Re-export types for convenience
export type { 
  CameraMode, 
  ControlMode, 
  CameraPositionConfig,
} from './CarController'
