/**
 * Car Physics Engine
 * ==================
 * Handles all physics calculations for car movement including:
 * - Acceleration and braking
 * - Steering and turning
 * - Grip and drifting
 * - Collision detection and response
 * - Body dynamics (roll and pitch)
 */

import { Vector3, AbstractMesh } from '@babylonjs/core'
import type { CarPhysicsConfig, CarInputState, CarPhysicsState } from '../../types'
import { DEFAULT_PHYSICS_CONFIG } from '../../config'
import type { SimpleMap } from '../SimpleMap'

/**
 * Physics state interface for external access
 */
export interface PhysicsInfo {
  speed: number
  speedKmh: number
  forwardSpeed: number
  isDrifting: boolean
  slipAngle: number
  steerAngle: number
  isGrounded: boolean
}

export class CarPhysics {
  private config: CarPhysicsConfig
  private map: SimpleMap | null = null
  
  // Physics state
  private velocity: Vector3 = Vector3.Zero()
  private heading: number = 0
  private forwardVelocity: number = 0
  private lateralVelocity: number = 0
  private steerAngle: number = 0
  private targetSteerAngle: number = 0
  private verticalVelocity: number = 0
  private isGrounded: boolean = true
  private isDrifting: boolean = false
  private slipAngle: number = 0
  private bodyRoll: number = 0
  private bodyPitch: number = 0

  constructor(config?: Partial<CarPhysicsConfig>) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config }
  }

  /**
   * Initialize heading from mesh rotation
   */
  initFromMesh(mesh: AbstractMesh): void {
    if (mesh.rotationQuaternion) {
      const euler = mesh.rotationQuaternion.toEulerAngles()
      this.heading = euler.y
    } else {
      this.heading = mesh.rotation.y
    }
  }

  /**
   * Set reference to map for collision detection
   */
  setMap(map: SimpleMap): void {
    this.map = map
  }

  /**
   * Update physics configuration
   */
  updateConfig(config: Partial<CarPhysicsConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current physics configuration
   */
  getConfig(): CarPhysicsConfig {
    return { ...this.config }
  }

  /**
   * Main physics update
   * @param dt Delta time in seconds
   * @param input Current input state
   * @param mesh Car mesh for position updates
   * @returns Updated turn rate for camera calculations
   */
  update(dt: number, input: CarInputState, mesh: AbstractMesh): number {
    // Clamp deltaTime for stability
    const clampedDt = Math.min(dt, 0.05)
    
    // Get direction vectors
    const forward = this.getForwardVector()
    const right = this.getRightVector()
    
    // Decompose world velocity into local components
    this.forwardVelocity = Vector3.Dot(this.velocity, forward)
    this.lateralVelocity = Vector3.Dot(this.velocity, right)
    
    // Calculate slip angle and drift detection
    const speed = this.velocity.length()
    this.updateDriftState(speed)
    
    // Calculate forces
    const longitudinalForce = this.calculateLongitudinalForce(input, speed)
    const turnRate = this.calculateTurnRate(input, clampedDt)
    const lateralForce = this.calculateLateralForce(input)
    
    // Apply forces
    this.applyForces(clampedDt, longitudinalForce, lateralForce, turnRate, speed)
    
    // Update position with collision
    this.updatePosition(clampedDt, mesh)
    
    // Update body dynamics
    this.updateBodyDynamics(clampedDt, turnRate, input)
    
    // Apply rotation to mesh
    mesh.rotation.y = this.heading
    mesh.rotation.z = this.bodyRoll
    mesh.rotation.x = this.bodyPitch
    
    return turnRate
  }

  /**
   * Update drift detection state
   * Drift terjadi secara natural berdasarkan:
   * - Slip angle yang tinggi
   * - Kecepatan di atas threshold
   */
  private updateDriftState(speed: number): void {
    if (speed > 0.5) {
      this.slipAngle = Math.atan2(this.lateralVelocity, Math.abs(this.forwardVelocity))
      // Drift terjadi jika slip angle cukup besar dan kecepatan di atas minimum
      this.isDrifting = Math.abs(this.slipAngle) > 0.15 && speed > this.config.driftMinSpeed
    } else {
      this.slipAngle = 0
      this.isDrifting = false
    }
  }

  /**
   * Calculate longitudinal (forward/backward) force
   */
  private calculateLongitudinalForce(input: CarInputState, speed: number): number {
    let force = 0
    
    // Throttle
    if (input.throttle > 0) {
      if (this.forwardVelocity < 0) {
        // Braking if moving backward
        force = this.config.brakeForce
      } else if (this.forwardVelocity < this.config.maxSpeed) {
        // Accelerate with power curve
        const powerFactor = 1 - Math.pow(this.forwardVelocity / this.config.maxSpeed, 2) * 0.6
        force = this.config.acceleration * powerFactor * input.throttle
      }
    } else if (input.throttle < 0) {
      if (this.forwardVelocity > 0.5) {
        // Braking if moving forward
        force = -this.config.brakeForce
      } else if (this.forwardVelocity > -this.config.reverseMaxSpeed) {
        // Reverse acceleration
        force = this.config.reverseAcceleration * input.throttle
      }
    }
    
    // Brake pedal
    if (input.brake && Math.abs(this.forwardVelocity) > 0.1) {
      force = -Math.sign(this.forwardVelocity) * this.config.brakeForce
    }
    
    // Engine braking
    if (input.throttle === 0 && !input.brake && Math.abs(this.forwardVelocity) > 0.5) {
      force = -Math.sign(this.forwardVelocity) * this.config.engineBraking
    }
    
    // Resistance forces
    if (Math.abs(this.forwardVelocity) > 0.1) {
      const rollingResistance = this.config.rollingResistance * this.config.mass * Math.abs(this.forwardVelocity)
      const airDrag = 0.5 * this.config.airDragCoefficient * speed * speed
      const resistanceForce = (rollingResistance + airDrag) * Math.sign(this.forwardVelocity)
      force -= resistanceForce / this.config.mass
    }
    
    return force
  }

  /**
   * Calculate turn rate based on steering input
   */
  private calculateTurnRate(input: CarInputState, dt: number): number {
    // Update steering angle with smooth response
    this.targetSteerAngle = input.steering * this.config.maxSteerAngle
    const steerDiff = this.targetSteerAngle - this.steerAngle
    this.steerAngle += steerDiff * Math.min(1, this.config.steeringSpeed * dt * 10)
    
    // Calculate turn rate based on bicycle model
    let turnRate = 0
    const minSpeedForTurn = 0.5
    
    if (Math.abs(this.forwardVelocity) > minSpeedForTurn) {
      const effectiveRadius = this.config.turnRadius + Math.abs(this.forwardVelocity) * 0.3
      turnRate = (this.forwardVelocity / effectiveRadius) * Math.tan(this.steerAngle)
      
      // Counter-steer effect when drifting
      if (this.isDrifting) {
        turnRate *= 1.3
      }
    }
    
    return turnRate
  }

  /**
   * Calculate lateral (sideways) force based on grip
   * Drift terjadi secara natural berdasarkan:
   * - Kecepatan tinggi + belok tajam
   * - Rem saat belok
   * - Slip angle yang tinggi
   */
  private calculateLateralForce(input: CarInputState): number {
    const speed = this.velocity.length()
    const steerRatio = Math.abs(this.steerAngle) / this.config.maxSteerAngle
    
    let frontGrip = this.config.gripFront
    let rearGrip = this.config.gripRear
    
    // === NATURAL DRIFT CONDITIONS ===
    
    // 1. High speed + sharp turn = reduced rear grip
    if (speed > this.config.driftSpeedThreshold && steerRatio > this.config.driftSteerThreshold) {
      // Semakin cepat dan semakin tajam beloknya, semakin berkurang grip
      const speedFactor = Math.min(1, (speed - this.config.driftSpeedThreshold) / 15)
      const steerFactor = (steerRatio - this.config.driftSteerThreshold) / (1 - this.config.driftSteerThreshold)
      const gripReduction = speedFactor * steerFactor * (1 - this.config.driftGripMultiplier)
      
      rearGrip *= (1 - gripReduction)
    }
    
    // 2. Braking while turning = weight transfer reduces rear grip
    if (input.brake && steerRatio > 0.2 && speed > this.config.driftMinSpeed) {
      // Rem saat belok menyebabkan weight transfer ke depan
      const brakeTurnFactor = steerRatio * this.config.brakeTurnGripLoss
      rearGrip *= (1 - brakeTurnFactor)
      // Front grip slightly increases due to weight transfer
      frontGrip *= (1 + brakeTurnFactor * 0.2)
    }
    
    // 3. Already drifting = maintain reduced grip
    if (this.isDrifting) {
      // Saat sudah drift, grip tetap rendah untuk menjaga slide
      rearGrip = Math.min(rearGrip, this.config.gripRear * this.config.driftGripMultiplier * 1.2)
    }
    
    // Clamp grip values
    frontGrip = Math.max(0.1, Math.min(1, frontGrip))
    rearGrip = Math.max(0.1, Math.min(1, rearGrip))
    
    const frontGripForce = this.lateralVelocity * frontGrip * 10
    const rearGripForce = this.lateralVelocity * rearGrip * 10
    return (frontGripForce + rearGripForce) / 2
  }

  /**
   * Apply calculated forces to velocity
   */
  private applyForces(
    dt: number, 
    longitudinalForce: number, 
    lateralForce: number, 
    turnRate: number,
    speed: number
  ): void {
    // Update velocities
    this.forwardVelocity += longitudinalForce * dt
    this.lateralVelocity -= lateralForce * dt
    
    // Clamp lateral velocity
    const maxLateralVelocity = Math.abs(this.forwardVelocity) * 0.8
    this.lateralVelocity = Math.max(-maxLateralVelocity, Math.min(maxLateralVelocity, this.lateralVelocity))
    
    // Update heading
    this.heading += turnRate * dt
    
    // Reconstruct world velocity
    const newForward = this.getForwardVector()
    const newRight = this.getRightVector()
    this.velocity = newForward.scale(this.forwardVelocity).add(newRight.scale(this.lateralVelocity))
    
    // Come to complete stop when very slow
    if (speed < 0.3 && Math.abs(longitudinalForce) < 0.1) {
      this.velocity = this.velocity.scale(0.9)
      this.forwardVelocity *= 0.9
      this.lateralVelocity *= 0.9
      
      if (speed < 0.05) {
        this.velocity = Vector3.Zero()
        this.forwardVelocity = 0
        this.lateralVelocity = 0
      }
    }
  }

  /**
   * Update position with gravity and collision
   */
  private updatePosition(dt: number, mesh: AbstractMesh): void {
    // Gravity
    if (!this.isGrounded) {
      this.verticalVelocity += this.config.gravity * dt
    }
    
    // Calculate movement
    const movement = new Vector3(
      this.velocity.x * dt,
      this.verticalVelocity * dt,
      this.velocity.z * dt
    )
    let newPosition = mesh.position.add(movement)
    
    // Check collision with map
    if (this.map) {
      const collision = this.map.checkCollision(newPosition, this.config.collisionRadius)
      if (collision.collided) {
        newPosition = newPosition.add(collision.normal.scale(collision.penetration))
        
        const velocityDot = Vector3.Dot(this.velocity, collision.normal)
        if (velocityDot < 0) {
          const reflection = collision.normal.scale(velocityDot * this.config.collisionBounciness)
          this.velocity = this.velocity.subtract(reflection)
          this.velocity = this.velocity.scale(this.config.collisionDamping)
          this.forwardVelocity *= this.config.collisionDamping
          this.lateralVelocity *= this.config.collisionDamping
        }
      }
    }
    
    // Ground collision
    if (newPosition.y <= 0) {
      newPosition.y = 0
      this.verticalVelocity = 0
      this.isGrounded = true
    } else {
      this.isGrounded = false
    }
    
    mesh.position = newPosition
  }

  /**
   * Update body roll and pitch for visual feedback
   */
  private updateBodyDynamics(dt: number, turnRate: number, input: CarInputState): void {
    const lateralG = turnRate * Math.abs(this.forwardVelocity) / 9.81
    const longitudinalG = (input.throttle !== 0 || input.brake) ? 
      (input.throttle * this.config.acceleration - (input.brake ? this.config.brakeForce : 0)) / 9.81 : 0
    
    const targetRoll = lateralG * this.config.bodyRollFactor
    const targetPitch = -longitudinalG * this.config.bodyPitchFactor * 0.3
    
    const response = this.config.suspensionStiffness * dt
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(1, response)
    this.bodyPitch += (targetPitch - this.bodyPitch) * Math.min(1, response)
    
    this.bodyRoll = Math.max(-0.15, Math.min(0.15, this.bodyRoll))
    this.bodyPitch = Math.max(-0.1, Math.min(0.1, this.bodyPitch))
  }

  /**
   * Get forward direction vector
   */
  private getForwardVector(): Vector3 {
    return new Vector3(Math.sin(this.heading), 0, Math.cos(this.heading))
  }

  /**
   * Get right direction vector
   */
  private getRightVector(): Vector3 {
    return new Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading))
  }

  // === PUBLIC GETTERS ===

  getSpeed(): number {
    return this.velocity.length()
  }

  getSpeedKmh(): number {
    return Math.round(this.velocity.length() * 3.6)
  }

  getForwardSpeed(): number {
    return this.forwardVelocity
  }

  getIsDrifting(): boolean {
    return this.isDrifting
  }

  getSlipAngle(): number {
    return this.slipAngle * (180 / Math.PI)
  }

  getSteerAngle(): number {
    return this.steerAngle * (180 / Math.PI)
  }

  getIsGrounded(): boolean {
    return this.isGrounded
  }

  getHeading(): number {
    return this.heading
  }

  getPhysicsInfo(): PhysicsInfo {
    return {
      speed: this.getSpeed(),
      speedKmh: this.getSpeedKmh(),
      forwardSpeed: this.forwardVelocity,
      isDrifting: this.isDrifting,
      slipAngle: this.getSlipAngle(),
      steerAngle: this.getSteerAngle(),
      isGrounded: this.isGrounded,
    }
  }

  /**
   * Reset physics state
   */
  reset(): void {
    this.velocity = Vector3.Zero()
    this.forwardVelocity = 0
    this.lateralVelocity = 0
    this.steerAngle = 0
    this.targetSteerAngle = 0
    this.verticalVelocity = 0
    this.isGrounded = true
    this.isDrifting = false
    this.slipAngle = 0
    this.bodyRoll = 0
    this.bodyPitch = 0
  }
}
