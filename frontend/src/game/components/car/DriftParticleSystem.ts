/**
 * Drift Particle System
 * =====================
 * Creates dust/smoke particle effects from rear wheels during drifting.
 * Particle intensity scales with drift intensity (slip angle).
 */

import {
  Scene,
  AbstractMesh,
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
} from '@babylonjs/core'
import type { DriftParticleConfig } from '../../types'
import { DEFAULT_DRIFT_PARTICLE_CONFIG } from '../../config'

export class DriftParticleSystem {
  private scene: Scene
  private carMesh: AbstractMesh
  private config: DriftParticleConfig
  
  // Particle systems for each rear wheel
  private leftWheelParticles: ParticleSystem | null = null
  private rightWheelParticles: ParticleSystem | null = null
  
  // State tracking
  private isEmitting: boolean = false
  private currentIntensity: number = 0
  
  constructor(
    scene: Scene,
    carMesh: AbstractMesh,
    config?: Partial<DriftParticleConfig>
  ) {
    this.scene = scene
    this.carMesh = carMesh
    this.config = { ...DEFAULT_DRIFT_PARTICLE_CONFIG, ...config }
    
    if (this.config.enabled) {
      this.createParticleSystems()
    }
    
    console.log('[DriftParticleSystem] Initialized')
  }
  
  /**
   * Create a soft circular gradient texture for smoke/dust effect
   */
  private createSmokeTexture(): string {
    const canvas = document.createElement('canvas')
    const size = 128
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Create radial gradient for soft circular particle
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,      // Inner circle (center)
      size / 2, size / 2, size / 2 // Outer circle (edge)
    )
    
    // Soft white smoke with fade to transparent
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    
    return canvas.toDataURL('image/png')
  }
  
  /**
   * Create particle systems for both rear wheels
   */
  private createParticleSystems(): void {
    this.leftWheelParticles = this.createWheelParticleSystem('left')
    this.rightWheelParticles = this.createWheelParticleSystem('right')
  }
  
  /**
   * Create a particle system for one wheel
   */
  private createWheelParticleSystem(side: 'left' | 'right'): ParticleSystem {
    const ps = new ParticleSystem(
      `drift_particles_${side}`,
      2000, // Max particles capacity
      this.scene
    )
    
    // Use a soft circular gradient texture for smoke/dust effect
    ps.particleTexture = new Texture(
      this.createSmokeTexture(),
      this.scene
    )
    
    // Particle colors - dust/smoke with variation
    const startColor = new Color4(
      this.config.color.r,
      this.config.color.g,
      this.config.color.b,
      this.config.color.a
    )
    const startColor2 = new Color4(
      this.config.color.r * 0.9,
      this.config.color.g * 0.9,
      this.config.color.b * 0.9,
      this.config.color.a * 0.8
    )
    const endColor = new Color4(
      this.config.colorEnd.r,
      this.config.colorEnd.g,
      this.config.colorEnd.b,
      this.config.colorEnd.a
    )
    
    ps.color1 = startColor
    ps.color2 = startColor2
    ps.colorDead = endColor
    
    // Size with growth curve - particles grow then shrink
    ps.minSize = this.config.minSize
    ps.maxSize = this.config.maxSize
    
    // Add size gradient over lifetime
    ps.addSizeGradient(0, this.config.minSize * 0.5, this.config.minSize * 0.7)
    ps.addSizeGradient(0.3, this.config.maxSize * 0.8, this.config.maxSize)
    ps.addSizeGradient(0.7, this.config.maxSize * 1.2, this.config.maxSize * 1.4)
    ps.addSizeGradient(1.0, this.config.maxSize * 0.3, this.config.maxSize * 0.5)
    
    // Add color gradient for smooth fade
    ps.addColorGradient(0, startColor)
    ps.addColorGradient(0.2, new Color4(startColor.r, startColor.g, startColor.b, startColor.a * 0.9))
    ps.addColorGradient(0.5, new Color4(
      (startColor.r + endColor.r) / 2,
      (startColor.g + endColor.g) / 2,
      (startColor.b + endColor.b) / 2,
      startColor.a * 0.6
    ))
    ps.addColorGradient(1.0, endColor)
    
    // Lifetime
    ps.minLifeTime = this.config.lifetime * 0.7
    ps.maxLifeTime = this.config.lifetime
    
    // Emission
    ps.emitRate = 0 // Start at 0, will be controlled dynamically
    
    // Emit direction (mostly backward and slightly upward, with spread)
    ps.direction1 = new Vector3(-0.3, 0.2, -1)
    ps.direction2 = new Vector3(0.3, 0.6, -0.7)
    
    // Emit power
    ps.minEmitPower = this.config.emitPower * 0.3
    ps.maxEmitPower = this.config.emitPower
    
    // Gravity - lighter for smoke effect
    ps.gravity = new Vector3(0, -this.config.gravity * 0.5, 0)
    
    // Angular speed for rotation (makes particles look more natural)
    ps.minAngularSpeed = -0.5
    ps.maxAngularSpeed = 0.5
    
    // Emit box (spread area)
    const offset = side === 'left' 
      ? this.config.rearLeftOffset 
      : this.config.rearRightOffset
    
    ps.minEmitBox = new Vector3(
      offset.x - this.config.emitBoxSize.x / 2,
      offset.y - this.config.emitBoxSize.y / 2,
      offset.z - this.config.emitBoxSize.z / 2
    )
    ps.maxEmitBox = new Vector3(
      offset.x + this.config.emitBoxSize.x / 2,
      offset.y + this.config.emitBoxSize.y / 2,
      offset.z + this.config.emitBoxSize.z / 2
    )
    
    // Blending mode - standard for realistic smoke
    if (this.config.additiveBlending) {
      ps.blendMode = ParticleSystem.BLENDMODE_ADD
    } else {
      ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    }
    
    // Attach to car mesh
    ps.emitter = this.carMesh
    
    // Start the system (but with 0 emit rate)
    ps.start()
    
    return ps
  }
  
  /**
   * Update particle systems based on drift state
   * @param isDrifting Whether the car is currently drifting
   * @param slipAngle Current slip angle in degrees
   * @param speed Current speed in m/s
   */
  update(isDrifting: boolean, slipAngle: number, speed: number): void {
    if (!this.config.enabled) return
    if (!this.leftWheelParticles || !this.rightWheelParticles) return
    
    const absSlipAngle = Math.abs(slipAngle)
    
    // Calculate intensity based on slip angle
    let intensity = 0
    
    if (isDrifting && absSlipAngle >= this.config.minSlipAngle) {
      // Map slip angle to intensity (0-1)
      const range = this.config.maxSlipAngle - this.config.minSlipAngle
      intensity = Math.min(1, (absSlipAngle - this.config.minSlipAngle) / range)
      
      // Add speed factor (more particles at higher speeds)
      const speedFactor = Math.min(1, speed / 20) // Max at 20 m/s (~72 km/h)
      intensity *= speedFactor
    }
    
    // Smooth intensity transition
    const smoothingFactor = 0.15
    this.currentIntensity += (intensity - this.currentIntensity) * smoothingFactor
    
    // Calculate emit rate based on intensity
    const emitRate = this.config.baseEmitRate + 
      (this.config.maxEmitRate - this.config.baseEmitRate) * this.currentIntensity
    
    // Update particle systems
    if (this.currentIntensity > 0.01) {
      this.leftWheelParticles.emitRate = emitRate
      this.rightWheelParticles.emitRate = emitRate
      
      // Scale particle size with intensity
      const sizeMultiplier = 0.7 + this.currentIntensity * 0.3
      this.leftWheelParticles.minSize = this.config.minSize * sizeMultiplier
      this.leftWheelParticles.maxSize = this.config.maxSize * sizeMultiplier
      this.rightWheelParticles.minSize = this.config.minSize * sizeMultiplier
      this.rightWheelParticles.maxSize = this.config.maxSize * sizeMultiplier
      
      this.isEmitting = true
    } else {
      this.leftWheelParticles.emitRate = 0
      this.rightWheelParticles.emitRate = 0
      this.isEmitting = false
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<DriftParticleConfig>): void {
    const wasEnabled = this.config.enabled
    this.config = { ...this.config, ...config }
    
    // Handle enable/disable
    if (!wasEnabled && this.config.enabled) {
      this.createParticleSystems()
    } else if (wasEnabled && !this.config.enabled) {
      this.dispose()
    }
    
    // Update existing particle systems if they exist
    if (this.leftWheelParticles && this.rightWheelParticles) {
      this.updateParticleSystemConfig(this.leftWheelParticles, 'left')
      this.updateParticleSystemConfig(this.rightWheelParticles, 'right')
    }
  }
  
  /**
   * Update a particle system with current config
   */
  private updateParticleSystemConfig(ps: ParticleSystem, side: 'left' | 'right'): void {
    // Update colors
    ps.color1 = new Color4(
      this.config.color.r,
      this.config.color.g,
      this.config.color.b,
      this.config.color.a
    )
    ps.color2 = ps.color1
    ps.colorDead = new Color4(
      this.config.colorEnd.r,
      this.config.colorEnd.g,
      this.config.colorEnd.b,
      this.config.colorEnd.a
    )
    
    // Update size
    ps.minSize = this.config.minSize
    ps.maxSize = this.config.maxSize
    
    // Update lifetime
    ps.minLifeTime = this.config.lifetime * 0.7
    ps.maxLifeTime = this.config.lifetime
    
    // Update emit power
    ps.minEmitPower = this.config.emitPower * 0.5
    ps.maxEmitPower = this.config.emitPower
    
    // Update gravity
    ps.gravity = new Vector3(0, -this.config.gravity, 0)
    
    // Update emit box position
    const offset = side === 'left' 
      ? this.config.rearLeftOffset 
      : this.config.rearRightOffset
    
    ps.minEmitBox = new Vector3(
      offset.x - this.config.emitBoxSize.x / 2,
      offset.y - this.config.emitBoxSize.y / 2,
      offset.z - this.config.emitBoxSize.z / 2
    )
    ps.maxEmitBox = new Vector3(
      offset.x + this.config.emitBoxSize.x / 2,
      offset.y + this.config.emitBoxSize.y / 2,
      offset.z + this.config.emitBoxSize.z / 2
    )
    
    // Update blending
    ps.blendMode = this.config.additiveBlending 
      ? ParticleSystem.BLENDMODE_ADD 
      : ParticleSystem.BLENDMODE_STANDARD
  }
  
  /**
   * Get current configuration
   */
  getConfig(): DriftParticleConfig {
    return { ...this.config }
  }
  
  /**
   * Check if currently emitting
   */
  getIsEmitting(): boolean {
    return this.isEmitting
  }
  
  /**
   * Get current intensity (0-1)
   */
  getIntensity(): number {
    return this.currentIntensity
  }
  
  /**
   * Force start emitting (for testing)
   */
  forceEmit(intensity: number = 1): void {
    if (!this.leftWheelParticles || !this.rightWheelParticles) return
    
    const emitRate = this.config.baseEmitRate + 
      (this.config.maxEmitRate - this.config.baseEmitRate) * intensity
    
    this.leftWheelParticles.emitRate = emitRate
    this.rightWheelParticles.emitRate = emitRate
    this.currentIntensity = intensity
    this.isEmitting = true
  }
  
  /**
   * Force stop emitting
   */
  forceStop(): void {
    if (!this.leftWheelParticles || !this.rightWheelParticles) return
    
    this.leftWheelParticles.emitRate = 0
    this.rightWheelParticles.emitRate = 0
    this.currentIntensity = 0
    this.isEmitting = false
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.leftWheelParticles) {
      this.leftWheelParticles.stop()
      this.leftWheelParticles.dispose()
      this.leftWheelParticles = null
    }
    
    if (this.rightWheelParticles) {
      this.rightWheelParticles.stop()
      this.rightWheelParticles.dispose()
      this.rightWheelParticles = null
    }
    
    console.log('[DriftParticleSystem] Disposed')
  }
}
