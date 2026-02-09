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
  maxSpeed: 40,
  
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
  gripFront: 0.75,
  
  /** Rear tire grip (0-1). Lower = easier to drift/oversteer */
  gripRear: 0.45,
  
  /** Speed threshold where grip starts reducing during turns (m/s). 8 m/s ≈ 29 km/h */
  driftSpeedThreshold: 6,
  
  /** Minimum speed required for drift to occur (m/s). 4 m/s ≈ 14 km/h */
  driftMinSpeed: 3,
  
  /** Steering threshold to trigger drift (0-1). 0.3 = 30% of max steering */
  driftSteerThreshold: 0.2,
  
  /** Grip multiplier during drift conditions (0-1). Lower = more slidey */
  driftGripMultiplier: 0.1,
  
  /** How much grip is lost when braking while turning (0-1). Higher = more loss */
  brakeTurnGripLoss: 0.85,

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

export const PHYSICS_PRESETS = {
  default: DEFAULT_PHYSICS_CONFIG,
} as const

export type PhysicsPreset = keyof typeof PHYSICS_PRESETS
