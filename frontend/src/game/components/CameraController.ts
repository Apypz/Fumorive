import {
  Scene,
  UniversalCamera,
  ArcRotateCamera,
  Vector3,
  Camera,
} from '@babylonjs/core'
import { InputManager } from '../engine/InputManager'

export type CameraType = 'fps' | 'orbit' | 'free'

export interface CameraConfig {
  type: CameraType
  position: Vector3
  target?: Vector3
  fov?: number
  minZ?: number
  maxZ?: number
  speed?: number
  sensitivity?: number
  // Orbit camera specific
  alpha?: number
  beta?: number
  radius?: number
  lowerRadiusLimit?: number
  upperRadiusLimit?: number
  lowerBetaLimit?: number
  upperBetaLimit?: number
}

const DEFAULT_CONFIG: CameraConfig = {
  type: 'fps',
  position: new Vector3(0, 2, -10),
  target: Vector3.Zero(),
  fov: 0.8,
  minZ: 0.1,
  maxZ: 1000,
  speed: 5,
  sensitivity: 0.002,
  alpha: Math.PI / 2,
  beta: Math.PI / 3,
  radius: 15,
  lowerRadiusLimit: 5,
  upperRadiusLimit: 50,
  lowerBetaLimit: 0.1,
  upperBetaLimit: Math.PI / 2 - 0.1,
}

export class CameraController {
  private scene: Scene
  private canvas: HTMLCanvasElement
  private camera: Camera
  private inputManager: InputManager | null = null
  private config: CameraConfig

  // Movement state
  private moveSpeed = 5
  private rotationSensitivity = 0.002
  private pitch = 0
  private yaw = 0

  constructor(scene: Scene, canvas: HTMLCanvasElement, config?: Partial<CameraConfig>) {
    this.scene = scene
    this.canvas = canvas
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.moveSpeed = this.config.speed ?? 5
    this.rotationSensitivity = this.config.sensitivity ?? 0.002

    this.camera = this.createCamera()
    console.log(`[CameraController] Created ${this.config.type} camera`)
  }

  private createCamera(): Camera {
    switch (this.config.type) {
      case 'fps':
        return this.createFPSCamera()
      case 'orbit':
        return this.createOrbitCamera()
      case 'free':
      default:
        return this.createFreeCamera()
    }
  }

  private createFPSCamera(): UniversalCamera {
    const camera = new UniversalCamera(
      'fpsCamera',
      this.config.position.clone(),
      this.scene
    )

    camera.setTarget(this.config.target ?? Vector3.Zero())
    camera.fov = this.config.fov ?? 0.8
    camera.minZ = this.config.minZ ?? 0.1
    camera.maxZ = this.config.maxZ ?? 1000

    // Disable default controls (we'll handle them manually)
    camera.inputs.clear()

    // Initialize yaw and pitch from camera rotation
    this.yaw = camera.rotation.y
    this.pitch = camera.rotation.x

    return camera
  }

  private createOrbitCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      'orbitCamera',
      this.config.alpha ?? Math.PI / 2,
      this.config.beta ?? Math.PI / 3,
      this.config.radius ?? 15,
      this.config.target ?? Vector3.Zero(),
      this.scene
    )

    camera.fov = this.config.fov ?? 0.8
    camera.minZ = this.config.minZ ?? 0.1
    camera.maxZ = this.config.maxZ ?? 1000

    // Set limits
    camera.lowerRadiusLimit = this.config.lowerRadiusLimit ?? 5
    camera.upperRadiusLimit = this.config.upperRadiusLimit ?? 50
    camera.lowerBetaLimit = this.config.lowerBetaLimit ?? 0.1
    camera.upperBetaLimit = this.config.upperBetaLimit ?? Math.PI / 2 - 0.1

    // Smooth camera movement
    camera.inertia = 0.9
    camera.panningInertia = 0.9

    // Enable panning
    camera.panningSensibility = 1000

    // Attach controls
    camera.attachControl(this.canvas, true)

    return camera
  }

  private createFreeCamera(): UniversalCamera {
    const camera = new UniversalCamera(
      'freeCamera',
      this.config.position.clone(),
      this.scene
    )

    camera.setTarget(this.config.target ?? Vector3.Zero())
    camera.fov = this.config.fov ?? 0.8
    camera.minZ = this.config.minZ ?? 0.1
    camera.maxZ = this.config.maxZ ?? 1000

    // Enable default controls for free camera
    camera.attachControl(this.canvas, true)
    camera.speed = this.moveSpeed
    camera.angularSensibility = 1000 / this.rotationSensitivity

    return camera
  }

  /**
   * Connect input manager for FPS camera control
   */
  connectInputManager(inputManager: InputManager): void {
    this.inputManager = inputManager
  }

  /**
   * Update camera (call every frame for FPS camera)
   */
  update(deltaTime: number): void {
    if (this.config.type !== 'fps' || !this.inputManager) return

    const camera = this.camera as UniversalCamera
    const input = this.inputManager.getState()

    // Handle mouse look
    if (this.inputManager.getIsPointerLocked()) {
      this.yaw += input.mouseDeltaX * this.rotationSensitivity
      this.pitch -= input.mouseDeltaY * this.rotationSensitivity

      // Clamp pitch to prevent flipping
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch))

      camera.rotation.y = this.yaw
      camera.rotation.x = this.pitch
    }

    // Calculate movement direction
    const forward = camera.getDirection(Vector3.Forward())
    const right = camera.getDirection(Vector3.Right())

    // Zero out Y for horizontal movement only
    forward.y = 0
    forward.normalize()
    right.y = 0
    right.normalize()

    // Calculate velocity
    const velocity = Vector3.Zero()
    const currentSpeed = input.sprint ? this.moveSpeed * 2 : this.moveSpeed

    if (input.forward) velocity.addInPlace(forward.scale(currentSpeed))
    if (input.backward) velocity.addInPlace(forward.scale(-currentSpeed))
    if (input.right) velocity.addInPlace(right.scale(currentSpeed))
    if (input.left) velocity.addInPlace(right.scale(-currentSpeed))

    // Apply movement
    camera.position.addInPlace(velocity.scale(deltaTime))

    // Reset mouse delta
    this.inputManager.resetMouseDelta()
  }

  /**
   * Get the camera instance
   */
  getCamera(): Camera {
    return this.camera
  }

  /**
   * Get camera as UniversalCamera (for FPS/Free)
   */
  getUniversalCamera(): UniversalCamera | null {
    if (this.camera instanceof UniversalCamera) {
      return this.camera
    }
    return null
  }

  /**
   * Get camera as ArcRotateCamera (for Orbit)
   */
  getOrbitCamera(): ArcRotateCamera | null {
    if (this.camera instanceof ArcRotateCamera) {
      return this.camera
    }
    return null
  }

  /**
   * Set camera position
   */
  setPosition(position: Vector3): void {
    if (this.camera instanceof UniversalCamera) {
      this.camera.position.copyFrom(position)
    } else if (this.camera instanceof ArcRotateCamera) {
      this.camera.setPosition(position)
    }
  }

  /**
   * Set camera target
   */
  setTarget(target: Vector3): void {
    if (this.camera instanceof UniversalCamera) {
      this.camera.setTarget(target)
    } else if (this.camera instanceof ArcRotateCamera) {
      this.camera.setTarget(target)
    }
  }

  /**
   * Set movement speed
   */
  setSpeed(speed: number): void {
    this.moveSpeed = speed
    if (this.camera instanceof UniversalCamera) {
      this.camera.speed = speed
    }
  }

  /**
   * Set rotation sensitivity
   */
  setSensitivity(sensitivity: number): void {
    this.rotationSensitivity = sensitivity
  }

  /**
   * Enable/disable camera controls
   */
  setControlsEnabled(enabled: boolean): void {
    if (enabled) {
      if (this.config.type !== 'fps') {
        this.camera.attachControl(this.canvas, true)
      }
    } else {
      this.camera.detachControl()
    }
  }

  /**
   * Dispose camera
   */
  dispose(): void {
    this.camera.dispose()
    this.inputManager = null
    console.log('[CameraController] Disposed')
  }
}
