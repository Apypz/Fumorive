/**
 * Drift Particle Configuration
 * ============================
 * Default configuration for drift particle effects.
 */

import type { DriftParticleConfig } from '../types'

/**
 * Default drift particle configuration
 */
export const DEFAULT_DRIFT_PARTICLE_CONFIG: DriftParticleConfig = {
  // Enable by default
  enabled: true,
  
  // Emission rates
  baseEmitRate: 30,      // Particles per second at minimum drift
  maxEmitRate: 300,      // Particles per second at maximum drift
  minSlipAngle: 15,       // Start emitting at 5 degrees slip
  maxSlipAngle: 25,      // Max emission at 25 degrees slip
  
  // Particle appearance - smaller, softer particles
  minSize: 0.3,
  maxSize: 1.5,
  lifetime: 2.0,         // Longer lifetime for trailing smoke
  
  // Dust/smoke color - light brown/tan with transparency
  color: { r: 0.75, g: 0.65, b: 0.55, a: 0.5 },
  colorEnd: { r: 0.6, g: 0.55, b: 0.5, a: 0 },
  
  // Physics - slower, floatier particles
  emitPower: 1.5,
  gravity: 0,
  
  // Position offsets (relative to car center)
  rearLeftOffset: { x: -1.5, y: 0.15, z: -1.2 },
  rearRightOffset: { x: 0.7, y: 0.15, z: -1.2 },
  
  // Emit box size (spread area)
  emitBoxSize: { x: 0.5, y: 0.1, z: 0.2 },
  
  // Use standard blending for realistic dust/smoke
  additiveBlending: false,
}

/**
 * Smoke-style drift particles (white/gray tire smoke)
 */
export const SMOKE_DRIFT_PARTICLE_CONFIG: Partial<DriftParticleConfig> = {
  color: { r: 0.9, g: 0.9, b: 0.9, a: 0.45 },
  colorEnd: { r: 0.95, g: 0.95, b: 0.95, a: 0 },
  minSize: 0.2,
  maxSize: 0.5,
  lifetime: 2.5,
  emitPower: 1.2,
  gravity: 0.3, // Smoke floats up more
  additiveBlending: false,
}

/**
 * Dust/dirt style particles (for off-road)
 */
export const DUST_DRIFT_PARTICLE_CONFIG: Partial<DriftParticleConfig> = {
  color: { r: 0.65, g: 0.55, b: 0.4, a: 0.6 },
  colorEnd: { r: 0.55, g: 0.5, b: 0.4, a: 0 },
  minSize: 0.2,
  maxSize: 0.6,
  lifetime: 1.8,
  emitPower: 2.0,
  gravity: 1.5,
  additiveBlending: false,
}

/**
 * Fire/burnout style particles (orange/red)
 */
export const BURNOUT_DRIFT_PARTICLE_CONFIG: Partial<DriftParticleConfig> = {
  color: { r: 1.0, g: 0.6, b: 0.2, a: 0.7 },
  colorEnd: { r: 0.8, g: 0.3, b: 0.1, a: 0 },
  minSize: 0.1,
  maxSize: 0.35,
  lifetime: 0.8,
  emitPower: 2.5,
  gravity: -0.5, // Fire rises
  additiveBlending: true,
}
