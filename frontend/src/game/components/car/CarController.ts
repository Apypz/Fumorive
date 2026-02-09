/**
 * Car Controller
 * ==============
 * Main controller that coordinates physics, camera, and input handling.
 * Uses CarPhysics for movement calculations and CarCameraManager for camera control.
 */

import {
  Scene,
  AbstractMesh,
  KeyboardEventTypes,
  Camera,
} from '@babylonjs/core'
import type { 
  CameraMode, 
  ControlMode, 
  CarPhysicsConfig, 
  CameraConfig, 
  CameraPositionConfig,
  CarInputState,
  MouseControlConfig,
  DriftParticleConfig,
} from '../../types'
import { 
  DEFAULT_PHYSICS_CONFIG, 
  DEFAULT_CAMERA_CONFIG,
  DEFAULT_MOUSE_CONFIG,
  DEFAULT_DRIFT_PARTICLE_CONFIG,
} from '../../config'
import { CarPhysics } from './CarPhysics'
import { CarCameraManager } from './CarCameraManager'
import { DriftParticleSystem } from './DriftParticleSystem'
import { EngineAudio } from '../../engine/EngineAudio'
import type { SimpleMap } from '../SimpleMap'

// Re-export types for backward compatibility
export type { CameraMode, ControlMode, CameraPositionConfig }

/**
 * Legacy config type for backward compatibility
 */
export type CarControllerConfig = CarPhysicsConfig

/**
 * Default camera config export for backward compatibility
 */
export const DEFAULT_CAMERA_CONFIG_LEGACY: CameraPositionConfig = {
  thirdPerson: {
    distance: DEFAULT_CAMERA_CONFIG.thirdPerson.distance,
    heightOffset: DEFAULT_CAMERA_CONFIG.thirdPerson.heightOffset,
    targetHeightOffset: DEFAULT_CAMERA_CONFIG.thirdPerson.targetHeightOffset,
    alpha: DEFAULT_CAMERA_CONFIG.thirdPerson.alpha,
    beta: DEFAULT_CAMERA_CONFIG.thirdPerson.beta,
    lowerRadiusLimit: DEFAULT_CAMERA_CONFIG.thirdPerson.lowerRadiusLimit,
    upperRadiusLimit: DEFAULT_CAMERA_CONFIG.thirdPerson.upperRadiusLimit,
  },
  firstPerson: {
    forwardOffset: DEFAULT_CAMERA_CONFIG.firstPerson.forwardOffset,
    heightOffset: DEFAULT_CAMERA_CONFIG.firstPerson.heightOffset,
    sideOffset: DEFAULT_CAMERA_CONFIG.firstPerson.sideOffset,
    fov: DEFAULT_CAMERA_CONFIG.firstPerson.fov,
    lookAheadDistance: DEFAULT_CAMERA_CONFIG.firstPerson.lookAheadDistance,
  },
}

export class CarController {
  private scene: Scene
  private carMesh: AbstractMesh
  
  // Sub-systems
  private physics: CarPhysics
  private cameraManager: CarCameraManager
  private engineAudio: EngineAudio
  private driftParticles: DriftParticleSystem
  
  // Engine state
  private engineRunning: boolean = false
  private onEngineStateChange: ((running: boolean) => void) | null = null
  
  // Control state
  private currentControlMode: ControlMode = 'keyboard'
  private onControlModeChange: ((mode: ControlMode) => void) | null = null
  private mouseConfig: MouseControlConfig
  private mouseSteeringTarget: number = 0
  private mouseSteeringValue: number = 0
  private canvas: HTMLCanvasElement | null = null
  private mouseLastMoveTime: number = 0
  private mouseIdleThreshold: number = 150 // ms before steering starts returning to center
  
  // Keyboard steering smoothing
  private keyboardSteeringTarget: number = 0
  private keyboardSteeringSpeed: number = 4.0 // How fast steering responds (higher = faster)
  private keyboardSteeringReturnSpeed: number = 6.0 // How fast steering returns to center
  
  // Input state
  private input: CarInputState = {
    throttle: 0,
    steering: 0,
    brake: false,
  }

  constructor(
    scene: Scene, 
    carMesh: AbstractMesh, 
    physicsConfig?: Partial<CarPhysicsConfig>,
    cameraConfig?: Partial<CameraPositionConfig>
  ) {
    this.scene = scene
    this.carMesh = carMesh
    this.mouseConfig = { ...DEFAULT_MOUSE_CONFIG }
    
    // Initialize physics engine
    this.physics = new CarPhysics(physicsConfig)
    this.physics.initFromMesh(carMesh)
    
    // Handle rotationQuaternion from imported models
    if (this.carMesh.rotationQuaternion) {
      this.carMesh.rotationQuaternion = null
    }
    
    // Convert legacy camera config to new format
    const fullCameraConfig: Partial<CameraConfig> | undefined = cameraConfig ? {
      thirdPerson: {
        ...DEFAULT_CAMERA_CONFIG.thirdPerson,
        ...cameraConfig.thirdPerson,
      },
      firstPerson: {
        ...DEFAULT_CAMERA_CONFIG.firstPerson,
        ...cameraConfig.firstPerson,
      },
      free: DEFAULT_CAMERA_CONFIG.free,
    } : undefined
    
    // Initialize camera manager
    this.cameraManager = new CarCameraManager(scene, carMesh, fullCameraConfig)
    
    // Initialize engine audio
    this.engineAudio = new EngineAudio()
    
    // Initialize drift particle system
    this.driftParticles = new DriftParticleSystem(scene, carMesh)
    
    // Setup collision callback for crash sound
    this.physics.onCollision((impactVelocity) => {
      this.engineAudio.playCrashSound(impactVelocity)
    })
    
    // Setup input handling
    this.setupInput()
    
    console.log('[CarController] Initialized with modular physics and camera')
  }

  /**
   * Setup cameras - call after constructor with canvas
   */
  setupCameras(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.cameraManager.setup(canvas)
    this.setupMouseControl(canvas)
    console.log('[CarController] Cameras initialized')
  }

  /**
   * Setup mouse control for steering
   */
  private setupMouseControl(canvas: HTMLCanvasElement): void {
    const handleMouseMove = (event: MouseEvent) => {
      if (this.currentControlMode !== 'mouse') return
      if (this.cameraManager.getMode() === 'free') return

      const movementX = event.movementX || 0
      this.mouseSteeringTarget += movementX / this.mouseConfig.sensitivity
      this.mouseSteeringTarget = Math.max(-1, Math.min(1, this.mouseSteeringTarget))
      
      // Track when mouse last moved
      this.mouseLastMoveTime = performance.now()
    }

    window.addEventListener('mousemove', handleMouseMove)
    ;(this as any)._mouseHandler = handleMouseMove

    console.log('[CarController] Mouse control initialized')
  }

  /**
   * Set callback for camera mode changes
   */
  onCameraModeChanged(callback: (mode: CameraMode) => void): void {
    this.cameraManager.onModeChanged(callback)
  }

  /**
   * Set callback for control mode changes
   */
  onControlModeChanged(callback: (mode: ControlMode) => void): void {
    this.onControlModeChange = callback
  }

  /**
   * Toggle between control modes
   */
  toggleControlMode(): void {
    this.setControlMode(this.currentControlMode === 'keyboard' ? 'mouse' : 'keyboard')
  }

  /**
   * Set specific control mode
   */
  setControlMode(mode: ControlMode): void {
    this.currentControlMode = mode
    this.mouseSteeringTarget = 0
    this.mouseSteeringValue = 0
    this.input.steering = 0
    
    console.log(`[CarController] Switched to ${mode} control`)

    if (this.onControlModeChange) {
      this.onControlModeChange(mode)
    }
  }

  /**
   * Get current control mode
   */
  getControlMode(): ControlMode {
    return this.currentControlMode
  }

  // === ENGINE CONTROL ===

  /**
   * Set callback for engine state changes
   */
  onEngineStateChanged(callback: (running: boolean) => void): void {
    this.onEngineStateChange = callback
  }

  /**
   * Toggle engine on/off
   */
  async toggleEngine(): Promise<void> {
    this.engineRunning = await this.engineAudio.toggleEngine()
    console.log(`[CarController] Engine ${this.engineRunning ? 'started' : 'stopped'}`)
    
    if (this.onEngineStateChange) {
      this.onEngineStateChange(this.engineRunning)
    }
  }

  /**
   * Start the engine
   */
  async startEngine(): Promise<void> {
    if (this.engineRunning) return
    
    await this.engineAudio.startEngine()
    this.engineRunning = true
    console.log('[CarController] Engine started')
    
    if (this.onEngineStateChange) {
      this.onEngineStateChange(true)
    }
  }

  /**
   * Stop the engine
   */
  stopEngine(): void {
    if (!this.engineRunning) return
    
    this.engineAudio.stopEngine()
    this.engineRunning = false
    console.log('[CarController] Engine stopped')
    
    if (this.onEngineStateChange) {
      this.onEngineStateChange(false)
    }
  }

  /**
   * Check if engine is running
   */
  isEngineRunning(): boolean {
    return this.engineRunning
  }

  /**
   * Toggle between camera modes
   */
  toggleCameraMode(): void {
    this.cameraManager.toggleMode()
  }

  /**
   * Set specific camera mode
   */
  setCameraMode(mode: CameraMode): void {
    this.cameraManager.setMode(mode)
  }

  /**
   * Get current camera mode
   */
  getCameraMode(): CameraMode {
    return this.cameraManager.getMode()
  }

  /**
   * Get active camera
   */
  getActiveCamera(): Camera | null {
    return this.cameraManager.getActiveCamera()
  }

  /**
   * Update camera configuration at runtime
   */
  updateCameraConfig(config: Partial<CameraPositionConfig>): void {
    // Convert to new config format and update
    const fullConfig: Partial<CameraConfig> = {
      thirdPerson: config.thirdPerson ? {
        ...DEFAULT_CAMERA_CONFIG.thirdPerson,
        ...config.thirdPerson,
      } : undefined,
      firstPerson: config.firstPerson ? {
        ...DEFAULT_CAMERA_CONFIG.firstPerson,
        ...config.firstPerson,
      } : undefined,
    }
    this.cameraManager.updateConfig(fullConfig)
  }

  /**
   * Set reference to map for collision detection
   */
  setMap(map: SimpleMap): void {
    this.physics.setMap(map)
  }

  /**
   * Setup keyboard input handling
   */
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
          if (this.currentControlMode === 'keyboard') {
            // Set target steering, actual value will interpolate smoothly
            this.keyboardSteeringTarget = pressed ? -1 : (this.keyboardSteeringTarget < 0 ? 0 : this.keyboardSteeringTarget)
          }
          break
        case 'd':
        case 'arrowright':
          if (this.currentControlMode === 'keyboard') {
            // Set target steering, actual value will interpolate smoothly
            this.keyboardSteeringTarget = pressed ? 1 : (this.keyboardSteeringTarget > 0 ? 0 : this.keyboardSteeringTarget)
          }
          break
        case ' ':
          // Brake - space only
          this.input.brake = pressed
          break
        case 'shift':
          // Horn - shift key
          if (pressed) {
            this.engineAudio.playHorn()
          } else {
            this.engineAudio.stopHorn()
          }
          break
        case 'v':
          if (pressed) this.toggleCameraMode()
          break
        case 'c':
          if (pressed) this.toggleControlMode()
          break
        case 'k':
          // Toggle engine on/off
          if (pressed) this.toggleEngine()
          break
      }
    })
  }

  /**
   * Main update - call every frame
   */
  update(deltaTime: number): void {
    if (!this.carMesh) return
    
    const dt = Math.min(deltaTime, 0.05)

    // Handle keyboard steering smoothing
    this.updateKeyboardSteering(dt)
    
    // Handle mouse steering
    this.updateMouseSteering(dt)
    
    // Create effective input - block throttle if engine is off
    const effectiveInput: CarInputState = {
      ...this.input,
      throttle: this.engineRunning ? this.input.throttle : 0,
    }
    
    // Update physics with effective input
    const turnRate = this.physics.update(dt, effectiveInput, this.carMesh)
    
    // Update engine audio based on speed and throttle
    if (this.engineRunning) {
      this.engineAudio.updateEngineSound(
        this.physics.getSpeedKmh(),
        effectiveInput.throttle
      )
    }
    
    // Update camera
    this.cameraManager.update(this.physics.getHeading())
    
    // Update drift particles
    this.driftParticles.update(
      this.physics.getIsDrifting(),
      this.physics.getSlipAngle(),
      this.physics.getSpeed()
    )
  }

  /**
   * Update mouse steering input
   */
  private updateKeyboardSteering(dt: number): void {
    if (this.currentControlMode !== 'keyboard') return
    
    // Smoothly interpolate actual steering toward the target
    const diff = this.keyboardSteeringTarget - this.input.steering
    
    if (Math.abs(diff) < 0.01) {
      // Close enough, snap to target
      this.input.steering = this.keyboardSteeringTarget
    } else if (this.keyboardSteeringTarget === 0) {
      // Returning to center - use return speed
      this.input.steering += diff * Math.min(1, this.keyboardSteeringReturnSpeed * dt)
    } else {
      // Steering toward target - use normal speed
      this.input.steering += diff * Math.min(1, this.keyboardSteeringSpeed * dt)
    }
    
    // Clamp to valid range
    this.input.steering = Math.max(-1, Math.min(1, this.input.steering))
  }

  private updateMouseSteering(dt: number): void {
    if (this.currentControlMode !== 'mouse') return
    
    const cameraMode = this.cameraManager.getMode()
    
    if (cameraMode !== 'free') {
      // NO automatic return to center - steering stays where user puts it
      // User must move mouse in opposite direction to straighten
      
      // Dead zone only at very center
      if (Math.abs(this.mouseSteeringTarget) < this.mouseConfig.deadZone) {
        this.mouseSteeringTarget = 0
      }
      
      // Smooth interpolation for responsive but not jerky steering
      this.mouseSteeringValue += (this.mouseSteeringTarget - this.mouseSteeringValue) * 
        Math.min(1, this.mouseConfig.steeringSmoothness * dt)
      this.input.steering = this.mouseSteeringValue
    } else {
      // In free camera mode, return to center
      this.mouseSteeringTarget = 0
      this.mouseSteeringValue *= 0.95
      this.input.steering = this.mouseSteeringValue
    }
  }

  // === PUBLIC GETTERS ===

  getSpeed(): number {
    return this.physics.getSpeed()
  }

  getSpeedKmh(): number {
    return this.physics.getSpeedKmh()
  }

  getIsDrifting(): boolean {
    return this.physics.getIsDrifting()
  }

  getSlipAngle(): number {
    return this.physics.getSlipAngle()
  }

  getForwardSpeed(): number {
    return this.physics.getForwardSpeed()
  }

  getSteerAngle(): number {
    return this.physics.getSteerAngle()
  }

  getSteeringInput(): number {
    return this.input.steering
  }

  /**
   * Update physics configuration
   */
  updatePhysicsConfig(config: Partial<CarPhysicsConfig>): void {
    this.physics.updateConfig(config)
  }

  /**
   * Update mouse control configuration
   */
  updateMouseConfig(config: Partial<MouseControlConfig>): void {
    this.mouseConfig = { ...this.mouseConfig, ...config }
  }

  /**
   * Update drift particle configuration
   */
  updateDriftParticleConfig(config: Partial<DriftParticleConfig>): void {
    this.driftParticles.updateConfig(config)
  }

  /**
   * Get drift particle configuration
   */
  getDriftParticleConfig(): DriftParticleConfig {
    return this.driftParticles.getConfig()
  }

  /**
   * Check if drift particles are currently emitting
   */
  getDriftParticlesEmitting(): boolean {
    return this.driftParticles.getIsEmitting()
  }

  /**
   * Get current drift particle intensity (0-1)
   */
  getDriftParticleIntensity(): number {
    return this.driftParticles.getIntensity()
  }

  /**
   * Dispose controller and all sub-systems
   */
  dispose(): void {
    // Remove mouse handler
    if ((this as any)._mouseHandler) {
      window.removeEventListener('mousemove', (this as any)._mouseHandler)
      ;(this as any)._mouseHandler = null
    }
    
    // Dispose engine audio
    this.engineAudio.dispose()
    
    // Dispose drift particles
    this.driftParticles.dispose()
    
    // Dispose camera manager
    this.cameraManager.dispose()
    
    this.onControlModeChange = null
    this.onEngineStateChange = null
    this.canvas = null
    
    console.log('[CarController] Disposed')
  }
}

// Export for backward compatibility
export { DEFAULT_CAMERA_CONFIG_LEGACY as DEFAULT_CAMERA_CONFIG }
