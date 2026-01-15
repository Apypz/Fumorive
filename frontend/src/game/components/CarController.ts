import {
  Scene,
  Vector3,
  AbstractMesh,
  Quaternion,
  KeyboardEventTypes,
  ArcRotateCamera,
} from '@babylonjs/core'

/**
 * Car Physics Configuration
 * All values are in real-world units for intuitive tuning:
 * - Speed: meters per second (m/s)
 * - Acceleration: meters per second squared (m/s²)
 * - Angles: radians per second (rad/s)
 */
export interface CarControllerConfig {
  // === ENGINE ===
  maxSpeed: number           // Maximum forward speed (m/s). 30 m/s ≈ 108 km/h
  reverseMaxSpeed: number    // Maximum reverse speed (m/s)
  acceleration: number       // Forward acceleration force (m/s²)
  reverseAcceleration: number // Reverse acceleration force (m/s²)
  engineBraking: number      // Deceleration when coasting (m/s²)
  
  // === BRAKING ===
  brakeForce: number         // Normal brake deceleration (m/s²)
  handbrakeForce: number     // Handbrake deceleration (m/s²)
  
  // === STEERING ===
  maxSteerAngle: number      // Maximum steering angle (radians). π/6 ≈ 30°
  steeringSpeed: number      // How fast steering wheel turns (multiplier)
  turnRadius: number         // Minimum turn radius at low speed (meters)
  
  // === GRIP & TRACTION ===
  gripFront: number          // Front tire grip (0-1). Higher = more grip
  gripRear: number           // Rear tire grip (0-1). Lower = easier drift
  driftGripMultiplier: number // Grip multiplier when handbrake (0-1)
  
  // === PHYSICS ===
  mass: number               // Car mass (kg) - affects momentum
  rollingResistance: number  // Rolling friction coefficient
  airDragCoefficient: number // Aerodynamic drag coefficient
  
  // === GRAVITY ===
  gravity: number            // Gravity acceleration (m/s²)
  
  // === VISUAL DYNAMICS ===
  bodyRollFactor: number     // Body roll intensity (radians per G-force)
  bodyPitchFactor: number    // Body pitch intensity (radians per G-force)
  suspensionStiffness: number // How fast body returns to neutral (1-20)
}

const DEFAULT_CONFIG: CarControllerConfig = {
  // Engine - Tuned for arcade feel
  maxSpeed: 35,              // ~126 km/h
  reverseMaxSpeed: 12,       // ~43 km/h  
  acceleration: 18,          // Quick acceleration
  reverseAcceleration: 10,
  engineBraking: 4,          // Gentle coast down
  
  // Braking
  brakeForce: 30,            // Strong brakes
  handbrakeForce: 25,
  
  // Steering
  maxSteerAngle: Math.PI / 5, // 36 degrees
  steeringSpeed: 5,          // Responsive steering
  turnRadius: 6,             // Tight turns at low speed
  
  // Grip
  gripFront: 0.9,            // Good front grip
  gripRear: 0.85,            // Slightly less rear grip for oversteer tendency
  driftGripMultiplier: 0.3,  // Loose rear when drifting
  
  // Physics  
  mass: 1200,                // Average car mass
  rollingResistance: 0.01,   // Low rolling friction
  airDragCoefficient: 0.35,  // Typical car drag
  
  // Gravity
  gravity: -20,
  
  // Visual
  bodyRollFactor: 0.04,
  bodyPitchFactor: 0.02,
  suspensionStiffness: 8,
}

export class CarController {
  private scene: Scene
  private carMesh: AbstractMesh
  private config: CarControllerConfig
  private camera: ArcRotateCamera | null = null

  // === PHYSICS STATE ===
  // Position and velocity in world space
  private velocity: Vector3 = Vector3.Zero()
  private heading: number = 0  // Car facing direction (radians)
  
  // Local space velocities (relative to car)
  private forwardVelocity: number = 0  // + forward, - backward
  private lateralVelocity: number = 0  // + right, - left
  
  // Steering
  private steerAngle: number = 0       // Current wheel angle
  private targetSteerAngle: number = 0 // Target wheel angle
  
  // Vertical
  private verticalVelocity: number = 0
  private isGrounded: boolean = true
  
  // Drift detection
  private isDrifting: boolean = false
  private slipAngle: number = 0
  
  // Body dynamics for visual effect
  private bodyRoll: number = 0
  private bodyPitch: number = 0

  // === INPUT STATE ===
  private input = {
    throttle: 0,    // -1 to 1 (back to forward)
    steering: 0,    // -1 to 1 (left to right)
    brake: false,
    handbrake: false,
  }

  constructor(scene: Scene, carMesh: AbstractMesh, config?: Partial<CarControllerConfig>) {
    this.scene = scene
    this.carMesh = carMesh
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Handle rotationQuaternion from imported models
    if (this.carMesh.rotationQuaternion) {
      const euler = this.carMesh.rotationQuaternion.toEulerAngles()
      this.heading = euler.y
      this.carMesh.rotationQuaternion = null
    } else {
      this.heading = this.carMesh.rotation.y
    }

    this.setupInput()
    console.log('[CarController] Physics engine initialized')
  }

  setCamera(camera: ArcRotateCamera): void {
    this.camera = camera
  }

  private setupInput(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const pressed = kbInfo.type === KeyboardEventTypes.KEYDOWN
      const key = kbInfo.event.key.toLowerCase()

      switch (key) {
        case 'w':
        case 'arrowup':
          this.input.throttle = pressed ? 1 : (this.input.throttle > 0 ? 0 : this.input.throttle)
          break
        case 's':
        case 'arrowdown':
          this.input.throttle = pressed ? -1 : (this.input.throttle < 0 ? 0 : this.input.throttle)
          break
        case 'a':
        case 'arrowleft':
          this.input.steering = pressed ? -1 : (this.input.steering < 0 ? 0 : this.input.steering)
          break
        case 'd':
        case 'arrowright':
          this.input.steering = pressed ? 1 : (this.input.steering > 0 ? 0 : this.input.steering)
          break
        case ' ':
          this.input.handbrake = pressed
          break
        case 'shift':
          this.input.brake = pressed
          break
      }
    })
  }

  /**
   * Main physics update - call every frame
   */
  update(deltaTime: number): void {
    if (!this.carMesh) return
    
    // Clamp deltaTime for stability
    const dt = Math.min(deltaTime, 0.05)
    
    // Get direction vectors
    const forward = this.getForwardVector()
    const right = this.getRightVector()
    
    // Decompose world velocity into local components
    this.forwardVelocity = Vector3.Dot(this.velocity, forward)
    this.lateralVelocity = Vector3.Dot(this.velocity, right)
    
    // Calculate slip angle for drift detection
    const speed = this.velocity.length()
    if (speed > 0.5) {
      this.slipAngle = Math.atan2(this.lateralVelocity, Math.abs(this.forwardVelocity))
      this.isDrifting = Math.abs(this.slipAngle) > 0.2 && speed > 5
    } else {
      this.slipAngle = 0
      this.isDrifting = false
    }

    // === 1. LONGITUDINAL FORCES (Forward/Backward) ===
    let longitudinalForce = 0
    
    // Throttle
    if (this.input.throttle > 0) {
      // Forward acceleration
      if (this.forwardVelocity < 0) {
        // Braking if moving backward
        longitudinalForce = this.config.brakeForce
      } else if (this.forwardVelocity < this.config.maxSpeed) {
        // Accelerate with power curve (less power at high speed)
        const powerFactor = 1 - Math.pow(this.forwardVelocity / this.config.maxSpeed, 2) * 0.6
        longitudinalForce = this.config.acceleration * powerFactor * this.input.throttle
      }
    } else if (this.input.throttle < 0) {
      // Reverse/Brake
      if (this.forwardVelocity > 0.5) {
        // Braking if moving forward
        longitudinalForce = -this.config.brakeForce
      } else if (this.forwardVelocity > -this.config.reverseMaxSpeed) {
        // Reverse acceleration
        longitudinalForce = this.config.reverseAcceleration * this.input.throttle
      }
    }
    
    // Brake pedal (Shift)
    if (this.input.brake && Math.abs(this.forwardVelocity) > 0.1) {
      longitudinalForce = -Math.sign(this.forwardVelocity) * this.config.brakeForce
    }
    
    // Handbrake effect on longitudinal
    if (this.input.handbrake && Math.abs(this.forwardVelocity) > 0.5) {
      longitudinalForce -= Math.sign(this.forwardVelocity) * this.config.handbrakeForce * 0.5
    }
    
    // Engine braking (when coasting)
    if (this.input.throttle === 0 && !this.input.brake && Math.abs(this.forwardVelocity) > 0.5) {
      longitudinalForce = -Math.sign(this.forwardVelocity) * this.config.engineBraking
    }
    
    // === 2. RESISTANCE FORCES ===
    // Rolling resistance (proportional to speed)
    const rollingResistance = this.config.rollingResistance * this.config.mass * Math.abs(this.forwardVelocity)
    
    // Air drag (proportional to speed squared)
    const airDrag = 0.5 * this.config.airDragCoefficient * speed * speed
    
    // Combine resistances
    if (Math.abs(this.forwardVelocity) > 0.1) {
      const resistanceForce = (rollingResistance + airDrag) * Math.sign(this.forwardVelocity)
      longitudinalForce -= resistanceForce / this.config.mass
    }
    
    // === 3. STEERING ===
    // Update steering angle with smooth response
    this.targetSteerAngle = this.input.steering * this.config.maxSteerAngle
    const steerDiff = this.targetSteerAngle - this.steerAngle
    this.steerAngle += steerDiff * Math.min(1, this.config.steeringSpeed * dt * 10)
    
    // Calculate turn rate based on bicycle model
    // turnRate = velocity / turnRadius * tan(steerAngle)
    let turnRate = 0
    const minSpeedForTurn = 0.5
    
    if (Math.abs(this.forwardVelocity) > minSpeedForTurn) {
      // Ackermann-like steering: turn radius varies with speed
      const effectiveRadius = this.config.turnRadius + Math.abs(this.forwardVelocity) * 0.3
      turnRate = (this.forwardVelocity / effectiveRadius) * Math.tan(this.steerAngle)
      
      // Counter-steer effect when drifting
      if (this.isDrifting) {
        turnRate *= 1.3
      }
    }
    
    // === 4. LATERAL FORCES (Grip/Sliding) ===
    // Determine grip levels
    let rearGrip = this.config.gripRear
    if (this.input.handbrake) {
      rearGrip *= this.config.driftGripMultiplier
    }
    
    // Lateral force to counteract sliding
    // High grip = velocity aligns with heading quickly
    // Low grip = car slides/drifts
    const frontGripForce = this.lateralVelocity * this.config.gripFront * 10
    const rearGripForce = this.lateralVelocity * rearGrip * 10
    const lateralForce = (frontGripForce + rearGripForce) / 2
    
    // === 5. APPLY FORCES ===
    // Update forward velocity
    this.forwardVelocity += longitudinalForce * dt
    
    // Apply lateral grip (reduces sideways velocity)
    this.lateralVelocity -= lateralForce * dt
    
    // Clamp lateral velocity to prevent numerical issues
    const maxLateralVelocity = Math.abs(this.forwardVelocity) * 0.8
    this.lateralVelocity = Math.max(-maxLateralVelocity, Math.min(maxLateralVelocity, this.lateralVelocity))
    
    // Update heading
    this.heading += turnRate * dt
    
    // Reconstruct world velocity from local components
    const newForward = this.getForwardVector()
    const newRight = this.getRightVector()
    this.velocity = newForward.scale(this.forwardVelocity).add(newRight.scale(this.lateralVelocity))
    
    // === 6. STOPPING ===
    // Come to complete stop when very slow
    if (speed < 0.3 && this.input.throttle === 0) {
      this.velocity = this.velocity.scale(0.9)
      this.forwardVelocity *= 0.9
      this.lateralVelocity *= 0.9
      
      if (speed < 0.05) {
        this.velocity = Vector3.Zero()
        this.forwardVelocity = 0
        this.lateralVelocity = 0
      }
    }
    
    // === 7. GRAVITY & VERTICAL ===
    if (!this.isGrounded) {
      this.verticalVelocity += this.config.gravity * dt
    }
    
    // === 8. UPDATE POSITION ===
    const movement = new Vector3(
      this.velocity.x * dt,
      this.verticalVelocity * dt,
      this.velocity.z * dt
    )
    const newPosition = this.carMesh.position.add(movement)
    
    // Ground collision
    if (newPosition.y <= 0) {
      newPosition.y = 0
      this.verticalVelocity = 0
      this.isGrounded = true
    } else {
      this.isGrounded = false
    }
    
    this.carMesh.position = newPosition
    this.carMesh.rotation.y = this.heading
    
    // === 9. VISUAL BODY DYNAMICS ===
    this.updateBodyDynamics(dt, turnRate)
    
    // === 10. CAMERA ===
    this.updateCamera()
  }
  
  /**
   * Update body roll and pitch for visual feedback
   */
  private updateBodyDynamics(dt: number, turnRate: number): void {
    // Calculate G-forces
    // When turning right (positive turnRate), car body should lean LEFT (negative roll)
    // This simulates centrifugal force pushing the body outward
    const lateralG = turnRate * Math.abs(this.forwardVelocity) / 9.81
    const longitudinalG = (this.input.throttle !== 0 || this.input.brake) ? 
      (this.input.throttle * this.config.acceleration - (this.input.brake ? this.config.brakeForce : 0)) / 9.81 : 0
    
    // Target body angles based on G-forces
    // Positive lateralG (turning right) should cause negative roll (lean left)
    const targetRoll = lateralG * this.config.bodyRollFactor
    const targetPitch = -longitudinalG * this.config.bodyPitchFactor * 0.3
    
    // Smooth interpolation
    const response = this.config.suspensionStiffness * dt
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(1, response)
    this.bodyPitch += (targetPitch - this.bodyPitch) * Math.min(1, response)
    
    // Clamp to reasonable values
    this.bodyRoll = Math.max(-0.15, Math.min(0.15, this.bodyRoll))
    this.bodyPitch = Math.max(-0.1, Math.min(0.1, this.bodyPitch))
    
    // Apply to mesh
    this.carMesh.rotation.z = this.bodyRoll
    this.carMesh.rotation.x = this.bodyPitch
  }
  
  /**
   * Smooth camera follow
   */
  private updateCamera(): void {
    if (!this.camera) return
    
    const targetPosition = this.carMesh.position.add(new Vector3(0, 1, 0))
    this.camera.target = Vector3.Lerp(this.camera.target, targetPosition, 0.15)
  }
  
  /**
   * Get forward direction vector based on current heading
   */
  private getForwardVector(): Vector3 {
    return new Vector3(Math.sin(this.heading), 0, Math.cos(this.heading))
  }
  
  /**
   * Get right direction vector based on current heading
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

  getIsDrifting(): boolean {
    return this.isDrifting
  }

  getSlipAngle(): number {
    return this.slipAngle * (180 / Math.PI)
  }

  getForwardSpeed(): number {
    return this.forwardVelocity
  }
  
  getSteerAngle(): number {
    return this.steerAngle * (180 / Math.PI)
  }

  dispose(): void {
    console.log('[CarController] Disposed')
  }
}
