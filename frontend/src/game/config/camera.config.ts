/**
 * Camera Configuration
 * ====================
 * Semua konfigurasi kamera terpusat di sini.
 * Mendukung Third Person, First Person, dan Free Camera modes.
 */

import type { CameraConfig, ThirdPersonCameraConfig, FirstPersonCameraConfig, FreeCameraConfig } from '../types'

/**
 * Third Person Camera Configuration
 * Camera yang mengikuti mobil dari belakang
 */
export const DEFAULT_THIRD_PERSON_CONFIG: ThirdPersonCameraConfig = {
  /** Distance from car center in meters */
  distance: 8,
  
  /** Height above car center in meters */
  heightOffset: 1.0,
  
  /** Height offset for camera look-at target */
  targetHeightOffset: 0.8,
  
  /** Horizontal angle in radians (rotation around car) */
  alpha: -Math.PI / 4,
  
  /** Vertical angle in radians (elevation) */
  beta: Math.PI / 3.5,
  
  /** Minimum zoom distance */
  lowerRadiusLimit: 4,
  
  /** Maximum zoom distance */
  upperRadiusLimit: 20,
  
  /** Camera smoothing inertia (0-1). Higher = smoother but slower response */
  inertia: 0.9,
  
  /** Follow speed when car moves (0-1). Higher = faster follow */
  followSpeed: 0.15,
}

/**
 * First Person Camera Configuration
 * Cockpit view dari dalam mobil
 */
export const DEFAULT_FIRST_PERSON_CONFIG: FirstPersonCameraConfig = {
  /** Forward/backward offset from car center. Positive = forward */
  forwardOffset: 0.3,
  
  /** Height above car floor (eye level) */
  heightOffset: 0.8,
  
  /** Left/right offset. Positive = right (driver's seat) */
  sideOffset: 0.3,
  
  /** Field of view in radians. ~1.2 rad ≈ 70° */
  fov: 1.2,
  
  /** How far ahead the camera looks in meters */
  lookAheadDistance: 50,
  
  /** Near clipping plane distance */
  minZ: 0.1,
  
  /** Far clipping plane distance */
  maxZ: 1000,
}

/**
 * Free Camera Configuration
 * User dapat memutar kamera bebas di sekitar mobil
 */
export const DEFAULT_FREE_CAMERA_CONFIG: FreeCameraConfig = {
  /** Initial distance from car */
  distance: 8,
  
  /** Initial horizontal angle */
  alpha: -Math.PI / 2,
  
  /** Initial vertical angle */
  beta: Math.PI / 3,
  
  /** Minimum zoom distance */
  lowerRadiusLimit: 4,
  
  /** Maximum zoom distance */
  upperRadiusLimit: 50,
  
  /** Minimum vertical angle (prevent going underground) */
  lowerBetaLimit: 0.1,
  
  /** Maximum vertical angle (prevent going too high) */
  upperBetaLimit: Math.PI / 2 - 0.1,
  
  /** Camera smoothing inertia */
  inertia: 0.9,
  
  /** Target follow speed */
  followSpeed: 0.15,
  
  /** Height offset for target */
  targetHeightOffset: 0.8,
  
  /** Mouse wheel zoom precision - lower = faster zoom */
  wheelPrecision: 20,
  
  /** Percentage of current radius to zoom per wheel delta */
  wheelDeltaPercentage: 0.05,
}

/**
 * Complete Camera Configuration
 * Menggabungkan semua mode kamera
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  thirdPerson: DEFAULT_THIRD_PERSON_CONFIG,
  firstPerson: DEFAULT_FIRST_PERSON_CONFIG,
  free: DEFAULT_FREE_CAMERA_CONFIG,
}

/**
 * Camera config untuk kendaraan yang lebih besar (truck, pickup)
 */
export const LARGE_VEHICLE_CAMERA_CONFIG: CameraConfig = {
  thirdPerson: {
    ...DEFAULT_THIRD_PERSON_CONFIG,
    distance: 10,           // Lebih jauh
    heightOffset: 3.0,      // Lebih tinggi
    targetHeightOffset: 2.5,
  },
  firstPerson: {
    ...DEFAULT_FIRST_PERSON_CONFIG,
    forwardOffset: 0.1,
    heightOffset: 2.25,     // Cab lebih tinggi
    sideOffset: -0.05,
  },
  free: {
    ...DEFAULT_FREE_CAMERA_CONFIG,
    distance: 10,
  },
}

/**
 * Camera config untuk kendaraan kecil (sports car)
 */
export const SMALL_VEHICLE_CAMERA_CONFIG: CameraConfig = {
  thirdPerson: {
    ...DEFAULT_THIRD_PERSON_CONFIG,
    distance: 6,
    heightOffset: 0.8,
    targetHeightOffset: 0.5,
  },
  firstPerson: {
    ...DEFAULT_FIRST_PERSON_CONFIG,
    heightOffset: 0.6,
    forwardOffset: 0.5,
  },
  free: {
    ...DEFAULT_FREE_CAMERA_CONFIG,
    distance: 6,
  },
}

/**
 * Camera presets for different vehicle types
 */
export const CAMERA_PRESETS = {
  default: DEFAULT_CAMERA_CONFIG,
  largeVehicle: LARGE_VEHICLE_CAMERA_CONFIG,
  smallVehicle: SMALL_VEHICLE_CAMERA_CONFIG,
} as const

export type CameraPreset = keyof typeof CAMERA_PRESETS
