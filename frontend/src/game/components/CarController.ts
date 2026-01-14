import {
  Scene,
  Vector3,
  AbstractMesh,
  Quaternion,
  KeyboardEventTypes,
  ArcRotateCamera,
  Axis,
  Space,
} from '@babylonjs/core'

export interface CarControllerConfig {
  maxSpeed: number
  acceleration: number
  brakeForce: number
  turnSpeed: number
  friction: number
  gravity: number
}

const DEFAULT_CONFIG: CarControllerConfig = {
  maxSpeed: 30,
  acceleration: 15,
  brakeForce: 25,
  turnSpeed: 2.5,
  friction: 0.98,
  gravity: -20,
}

export class CarController {
  private scene: Scene
  private carMesh: AbstractMesh
  private config: CarControllerConfig
  private camera: ArcRotateCamera | null = null

  // Physics state
  private velocity: Vector3 = Vector3.Zero()
  private speed: number = 0
  private rotationY: number = 0
  private verticalVelocity: number = 0
  private isGrounded: boolean = true

  // Input state
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
  }

  constructor(scene: Scene, carMesh: AbstractMesh, config?: Partial<CarControllerConfig>) {
    this.scene = scene
    this.carMesh = carMesh
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Clear rotationQuaternion if exists (so we can use euler angles for rotation)
    // GLB/GLTF models use quaternion by default, which overrides rotation property
    if (this.carMesh.rotationQuaternion) {
      // Get current Y rotation from quaternion before clearing
      const euler = this.carMesh.rotationQuaternion.toEulerAngles()
      this.rotationY = euler.y
      this.carMesh.rotationQuaternion = null
      this.carMesh.rotation.y = this.rotationY
    } else {
      // Get initial rotation
      this.rotationY = this.carMesh.rotation.y
    }

    this.setupInput()
    console.log('[CarController] Initialized with rotationY:', this.rotationY)
  }

  /**
   * Set the camera to follow the car
   */
  setCamera(camera: ArcRotateCamera): void {
    this.camera = camera
  }

  private setupInput(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const pressed = kbInfo.type === KeyboardEventTypes.KEYDOWN

      switch (kbInfo.event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.keys.forward = pressed
          break
        case 's':
        case 'arrowdown':
          this.keys.backward = pressed
          break
        case 'a':
        case 'arrowleft':
          this.keys.left = pressed
          break
        case 'd':
        case 'arrowright':
          this.keys.right = pressed
          break
        case ' ':
          this.keys.brake = pressed
          break
      }
    })
  }

  /**
   * Update car physics - call this every frame
   */
  update(deltaTime: number): void {
    if (!this.carMesh) return

    // Clamp deltaTime to prevent large jumps
    deltaTime = Math.min(deltaTime, 0.1)

    // Calculate acceleration
    let accelerationInput = 0
    if (this.keys.forward) accelerationInput = 1
    if (this.keys.backward) accelerationInput = -1

    // Apply acceleration
    if (accelerationInput !== 0) {
      this.speed += accelerationInput * this.config.acceleration * deltaTime
    }

    // Apply braking
    if (this.keys.brake) {
      this.speed *= 1 - (this.config.brakeForce * deltaTime)
    }

    // Apply friction
    this.speed *= this.config.friction

    // Clamp speed
    this.speed = Math.max(-this.config.maxSpeed * 0.5, Math.min(this.config.maxSpeed, this.speed))

    // Stop if very slow
    if (Math.abs(this.speed) < 0.1) {
      this.speed = 0
    }

    // Handle turning (only when moving)
    if (Math.abs(this.speed) > 0.5) {
      const turnFactor = this.speed > 0 ? 1 : -1 // Reverse steering when going backward
      const speedFactor = Math.min(1, Math.abs(this.speed) / 10) // Less turning at low speed

      if (this.keys.left) {
        this.rotationY -= this.config.turnSpeed * deltaTime * turnFactor * speedFactor
      }
      if (this.keys.right) {
        this.rotationY += this.config.turnSpeed * deltaTime * turnFactor * speedFactor
      }
    }

    // Calculate velocity based on rotation and speed
    // Negated to match the car model's facing direction
    const forward = new Vector3(
      -Math.sin(this.rotationY),
      0,
      -Math.cos(this.rotationY)
    )
    this.velocity = forward.scale(this.speed)

    // Apply gravity
    if (!this.isGrounded) {
      this.verticalVelocity += this.config.gravity * deltaTime
    }

    // Update position
    const newPosition = this.carMesh.position.add(
      new Vector3(
        this.velocity.x * deltaTime,
        this.verticalVelocity * deltaTime,
        this.velocity.z * deltaTime
      )
    )

    // Ground check (simple - assume ground is at y=0)
    if (newPosition.y <= 0) {
      newPosition.y = 0
      this.verticalVelocity = 0
      this.isGrounded = true
    } else {
      this.isGrounded = false
    }

    // Apply position and rotation
    this.carMesh.position = newPosition
    this.carMesh.rotation.y = this.rotationY

    // Add slight tilt when turning
    const tiltAmount = 0.05
    if (this.keys.left && Math.abs(this.speed) > 1) {
      this.carMesh.rotation.z = -tiltAmount * (this.speed / this.config.maxSpeed)
    } else if (this.keys.right && Math.abs(this.speed) > 1) {
      this.carMesh.rotation.z = tiltAmount * (this.speed / this.config.maxSpeed)
    } else {
      this.carMesh.rotation.z *= 0.9 // Smooth return to center
    }

    // Update camera target to follow car
    if (this.camera) {
      this.camera.target = this.carMesh.position.add(new Vector3(0, 0.8, 0))
    }
  }

  /**
   * Get current speed (for UI display)
   */
  getSpeed(): number {
    return Math.abs(this.speed)
  }

  /**
   * Get speed in km/h for display
   */
  getSpeedKmh(): number {
    return Math.round(Math.abs(this.speed) * 3.6)
  }

  dispose(): void {
    // Cleanup is handled by scene disposal
    console.log('[CarController] Disposed')
  }
}
