/**
 * Car Types
 * =========
 * Type definitions untuk konfigurasi dan state mobil.
 */

// ============================================
// CAMERA TYPES
// ============================================

/**
 * Available camera modes
 */
export type CameraMode = 'third-person' | 'first-person' | 'free'

/**
 * Third Person Camera Configuration
 */
export interface ThirdPersonCameraConfig {
  distance: number
  heightOffset: number
  targetHeightOffset: number
  alpha: number
  beta: number
  lowerRadiusLimit: number
  upperRadiusLimit: number
  inertia: number
  followSpeed: number
}

/**
 * First Person Camera Configuration
 */
export interface FirstPersonCameraConfig {
  forwardOffset: number
  heightOffset: number
  sideOffset: number
  fov: number
  lookAheadDistance: number
  minZ: number
  maxZ: number
}

/**
 * Free Camera Configuration
 */
export interface FreeCameraConfig {
  distance: number
  alpha: number
  beta: number
  lowerRadiusLimit: number
  upperRadiusLimit: number
  lowerBetaLimit: number
  upperBetaLimit: number
  inertia: number
  followSpeed: number
  targetHeightOffset: number
}

/**
 * Complete Camera Configuration
 */
export interface CameraConfig {
  thirdPerson: ThirdPersonCameraConfig
  firstPerson: FirstPersonCameraConfig
  free: FreeCameraConfig
}

/**
 * Legacy Camera Position Config (untuk backward compatibility)
 */
export interface CameraPositionConfig {
  thirdPerson: {
    distance: number
    heightOffset: number
    targetHeightOffset: number
    alpha: number
    beta: number
    lowerRadiusLimit: number
    upperRadiusLimit: number
  }
  firstPerson: {
    forwardOffset: number
    heightOffset: number
    sideOffset: number
    fov: number
    lookAheadDistance: number
  }
}

// ============================================
// CONTROL TYPES
// ============================================

/**
 * Available control modes
 */
export type ControlMode = 'keyboard' | 'mouse'

/**
 * Key bindings mapping
 */
export interface KeyBindings {
  forward: string[]
  backward: string[]
  left: string[]
  right: string[]
  brake: string[]
  toggleCamera: string[]
  toggleControlMode: string[]
  horn?: string[]
  resetCar?: string[]
  pause?: string[]
}

/**
 * Mouse control configuration
 */
export interface MouseControlConfig {
  sensitivity: number
  returnSpeed: number
  steeringSmoothness: number
  deadZone: number
  invertX: boolean
}

/**
 * Complete controls configuration
 */
export interface ControlsConfig {
  keyBindings: KeyBindings
  mouse: MouseControlConfig
  defaultControlMode: ControlMode
  defaultCameraMode: CameraMode
}

// ============================================
// PHYSICS TYPES
// ============================================

/**
 * Car Physics Configuration
 */
export interface CarPhysicsConfig {
  // Engine
  maxSpeed: number
  reverseMaxSpeed: number
  acceleration: number
  reverseAcceleration: number
  engineBraking: number
  
  // Braking
  brakeForce: number
  
  // Steering
  maxSteerAngle: number
  steeringSpeed: number
  turnRadius: number
  
  // Grip & Drift
  gripFront: number
  gripRear: number
  /** Speed threshold untuk mulai kehilangan grip saat belok (m/s) */
  driftSpeedThreshold: number
  /** Kecepatan minimum untuk drift terjadi (m/s) */
  driftMinSpeed: number
  /** Sudut steer minimum untuk trigger drift (0-1, relatif terhadap maxSteerAngle) */
  driftSteerThreshold: number
  /** Grip multiplier saat kondisi drift (0-1). Lower = more slidey */
  driftGripMultiplier: number
  /** Seberapa cepat grip berkurang saat brake + turn (0-1) */
  brakeTurnGripLoss: number
  
  // Physics
  mass: number
  rollingResistance: number
  airDragCoefficient: number
  
  // Gravity
  gravity: number
  
  // Visual
  bodyRollFactor: number
  bodyPitchFactor: number
  suspensionStiffness: number
  
  // Collision
  collisionRadius: number
  collisionDamping: number
  collisionBounciness: number
}

/**
 * Legacy CarControllerConfig (untuk backward compatibility)
 */
export type CarControllerConfig = Omit<CarPhysicsConfig, 'collisionRadius' | 'collisionDamping' | 'collisionBounciness'>

// ============================================
// STATE TYPES
// ============================================

/**
 * Car input state
 */
export interface CarInputState {
  throttle: number    // -1 to 1
  steering: number    // -1 to 1
  brake: boolean
}

/**
 * Car physics state (internal)
 */
export interface CarPhysicsState {
  velocity: { x: number; y: number; z: number }
  heading: number
  forwardVelocity: number
  lateralVelocity: number
  steerAngle: number
  targetSteerAngle: number
  verticalVelocity: number
  isGrounded: boolean
  isDrifting: boolean
  slipAngle: number
  bodyRoll: number
  bodyPitch: number
}
