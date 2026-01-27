/**
 * Car Physics Configuration
 * ========================
 * Semua nilai physics mobil terpusat di sini untuk kemudahan tuning.
 * 
 * Units:
 * - Speed: meters per second (m/s) | 1 m/s ≈ 3.6 km/h
 * - Acceleration: meters per second squared (m/s²)
 * - Angles: radians | π/6 ≈ 30°
 * - Mass: kilograms (kg)
 */

import type { CarPhysicsConfig } from '../types'

/**
 * Default Car Physics Configuration
 * Tuned for arcade-style driving feel
 */
export const DEFAULT_PHYSICS_CONFIG: CarPhysicsConfig = {
  // ============================================
  // ENGINE
  // ============================================
  /** Maximum forward speed in m/s. 35 m/s ≈ 126 km/h */
  maxSpeed: 35,
  
  /** Maximum reverse speed in m/s. 12 m/s ≈ 43 km/h */
  reverseMaxSpeed: 12,
  
  /** Forward acceleration force in m/s². Higher = faster acceleration */
  acceleration: 18,
  
  /** Reverse acceleration force in m/s² */
  reverseAcceleration: 10,
  
  /** Deceleration when coasting (no throttle) in m/s² */
  engineBraking: 4,

  // ============================================
  // BRAKING
  // ============================================
  /** Normal brake deceleration in m/s². Higher = stronger brakes */
  brakeForce: 30,

  // ============================================
  // STEERING
  // ============================================
  /** Maximum steering angle in radians. π/5 ≈ 36° */
  maxSteerAngle: Math.PI / 5,
  
  /** How fast steering wheel turns. Higher = more responsive */
  steeringSpeed: 5,
  
  /** Minimum turn radius at low speed in meters */
  turnRadius: 6,

  // ============================================
  // GRIP & DRIFT
  // ============================================
  /** Front tire grip (0-1). Higher = more grip, better handling */
  gripFront: 0.9,
  
  /** Rear tire grip (0-1). Lower = easier to drift/oversteer */
  gripRear: 0.85,
  
  /** Speed threshold where grip starts reducing during turns (m/s). 15 m/s ≈ 54 km/h */
  driftSpeedThreshold: 15,
  
  /** Minimum speed required for drift to occur (m/s). 8 m/s ≈ 29 km/h */
  driftMinSpeed: 8,
  
  /** Steering threshold to trigger drift (0-1). 0.6 = 60% of max steering */
  driftSteerThreshold: 0.6,
  
  /** Grip multiplier during drift conditions (0-1). Lower = more slidey */
  driftGripMultiplier: 0.35,
  
  /** How much grip is lost when braking while turning (0-1). Higher = more loss */
  brakeTurnGripLoss: 0.4,

  // ============================================
  // PHYSICS
  // ============================================
  /** Car mass in kg. Affects momentum and collision response */
  mass: 1200,
  
  /** Rolling friction coefficient. Higher = more resistance */
  rollingResistance: 0.01,
  
  /** Aerodynamic drag coefficient. Affects top speed */
  airDragCoefficient: 0.35,

  // ============================================
  // GRAVITY
  // ============================================
  /** Gravity acceleration in m/s². Negative = downward */
  gravity: -20,

  // ============================================
  // VISUAL DYNAMICS
  // ============================================
  /** Body roll intensity in radians per G-force. Higher = more lean in turns */
  bodyRollFactor: 0.02,
  
  /** Body pitch intensity in radians per G-force. Higher = more nose dive/lift */
  bodyPitchFactor: 0.02,
  
  /** How fast body returns to neutral (1-20). Higher = stiffer suspension */
  suspensionStiffness: 8,

  // ============================================
  // COLLISION
  // ============================================
  /** Car collision radius in meters */
  collisionRadius: 1.8,
  
  /** Energy loss on collision (0-1). Lower = more bounce */
  collisionDamping: 0.7,
  
  /** Bounce factor on collision. Higher = bouncier */
  collisionBounciness: 1.5,
}

/**
 * Preset: Realistic Physics
 * More simulation-like driving feel
 */
export const REALISTIC_PHYSICS_CONFIG: CarPhysicsConfig = {
  ...DEFAULT_PHYSICS_CONFIG,
  maxSpeed: 45,              // ~162 km/h
  acceleration: 12,          // Slower acceleration
  engineBraking: 6,          // More engine braking
  gripFront: 0.95,
  gripRear: 0.92,
  driftSpeedThreshold: 20,   // Need higher speed to drift
  driftMinSpeed: 12,
  driftSteerThreshold: 0.7,  // Need more steering to drift
  driftGripMultiplier: 0.5,  // Harder to drift
  brakeTurnGripLoss: 0.3,    // Less grip loss
  mass: 1400,
  bodyRollFactor: 0.06,
  suspensionStiffness: 6,
}

/**
 * Preset: Arcade Physics
 * Very responsive, easy to drift
 */
export const ARCADE_PHYSICS_CONFIG: CarPhysicsConfig = {
  ...DEFAULT_PHYSICS_CONFIG,
  maxSpeed: 40,
  acceleration: 25,          // Very quick acceleration
  engineBraking: 3,
  gripFront: 0.85,
  gripRear: 0.70,            // Very easy to drift
  driftSpeedThreshold: 10,   // Easy to trigger drift
  driftMinSpeed: 5,
  driftSteerThreshold: 0.4,  // Easy to trigger
  driftGripMultiplier: 0.25, // Very slidey
  brakeTurnGripLoss: 0.5,    // More grip loss
  bodyRollFactor: 0.08,      // Exaggerated body roll
  suspensionStiffness: 10,
}

/**
 * Physics presets for easy switching
 */
export const PHYSICS_PRESETS = {
  default: DEFAULT_PHYSICS_CONFIG,
  realistic: REALISTIC_PHYSICS_CONFIG,
  arcade: ARCADE_PHYSICS_CONFIG,
} as const

export type PhysicsPreset = keyof typeof PHYSICS_PRESETS
