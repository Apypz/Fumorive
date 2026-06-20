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
  Vector3,
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
import { getWheelMapping, readPedalValue } from '../../utils/wheelConfig'
import type { WheelMode } from '../../utils/wheelConfig'
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

// ── Kaiju XR1 racing wheel → Gamepad API ────────────────────────────────────
// Steering axis and pedals are configured per mode in wheelConfig (calibrated
// via the wheel overlay). These buttons are the shared paddle/horn defaults.
const WHEEL_SHIFT_UP_BUTTON = 5  // RB / right paddle
const WHEEL_SHIFT_DOWN_BUTTON = 4 // LB / left paddle
const WHEEL_HORN_BUTTON = 0      // A
const WHEEL_DEADZONE = 0.06

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
  
  // Collision callback for external systems (violation tracking)
  private onCollisionEventCallback: ((impactVelocity: number) => void) | null = null
  
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

  // Racing wheel (Kaiju XR1) state — read via the Gamepad API
  private gamepadIndex: number | null = null
  private wheelButtonPrev: boolean[] = []
  private wheelHornPrev = false
  private _gamepadConnectHandler: ((e: GamepadEvent) => void) | null = null
  private _gamepadDisconnectHandler: ((e: GamepadEvent) => void) | null = null

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
    
    // Setup collision callback for crash sound + external notification
    this.physics.onCollision((impactVelocity) => {
      this.engineAudio.playCrashSound(impactVelocity)
      // Notify external systems (violation tracking)
      if (this.onCollisionEventCallback) {
        this.onCollisionEventCallback(impactVelocity)
      }
    })
    
    // Setup input handling
    this.setupInput()
    this.setupGamepad()

    console.log('[CarController] Initialized with modular physics and camera')
  }

  /**
   * Set callback for collision events (external systems like violation tracking)
   */
  onCollisionEvent(callback: (impactVelocity: number) => void): void {
    this.onCollisionEventCallback = callback
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
   * Cycle control modes with the "C" key:
   * keyboard → mouse → wheel (D-Input) → wheel (X-Input) → keyboard.
   * The two Kaiju XR1 steps are only included while a wheel/controller is
   * connected, so without one the toggle still just flips keyboard/mouse.
   */
  toggleControlMode(): void {
    const modes: ControlMode[] = this.hasGamepad()
      ? ['keyboard', 'mouse', 'wheel-dinput', 'wheel-xinput']
      : ['keyboard', 'mouse']
    const idx = modes.indexOf(this.currentControlMode)
    const next = modes[(idx + 1) % modes.length]
    this.setControlMode(next)
  }

  private isWheelMode(): boolean {
    return this.currentControlMode === 'wheel-dinput' || this.currentControlMode === 'wheel-xinput'
  }

  /**
   * Set specific control mode
   */
  setControlMode(mode: ControlMode): void {
    this.currentControlMode = mode
    this.mouseSteeringTarget = 0
    this.mouseSteeringValue = 0
    this.input.steering = 0
    // Clear pedals/throttle so a held input from the previous mode doesn't stick.
    this.input.throttle = 0
    this.input.brake = false

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
        case 'x':
          // Toggle transmission mode (automatic/manual)
          if (pressed) this.physics.toggleTransmissionMode()
          break
        case 'e':
          // Shift up (manual mode)
          if (pressed) this.physics.shiftUp()
          break
        case 'q':
          // Shift down (manual mode)
          if (pressed) this.physics.shiftDown()
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

    // Handle racing-wheel (Kaiju XR1) input
    this.updateWheelInput(dt)

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
    
    // Update camera (dt needed for framerate-independent follow smoothing)
    this.cameraManager.update(this.physics.getHeading(), dt)
    
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

  // === RACING WHEEL (KAIJU XR1) ===

  /**
   * Listen for the racing wheel / controller connecting. The Gamepad API only
   * surfaces a device after the page receives input from it, so the first pedal
   * press or button tap is what makes the wheel modes available on the "C" cycle.
   */
  private setupGamepad(): void {
    // Pick up a device that is already live (e.g. after a scene remount).
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    for (const p of pads) {
      if (p) {
        this.gamepadIndex = p.index
        console.log(`[CarController] Racing wheel detected: ${p.id}`)
        break
      }
    }

    const onConnect = (e: GamepadEvent) => {
      this.gamepadIndex = e.gamepad.index
      console.log(`[CarController] Racing wheel connected: ${e.gamepad.id} — press C to use it`)
    }
    const onDisconnect = (e: GamepadEvent) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null
        if (this.isWheelMode()) this.setControlMode('keyboard')
        console.log('[CarController] Racing wheel disconnected')
      }
    }

    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    this._gamepadConnectHandler = onConnect
    this._gamepadDisconnectHandler = onDisconnect
  }

  /** Is a wheel/controller currently connected and readable? */
  private hasGamepad(): boolean {
    return this.activeGamepad() !== null
  }

  /**
   * The gamepad the game reads. Honours an explicit device chosen in the wheel
   * overlay (per mode), then the auto-detected one, then any connected pad.
   */
  private activeGamepad(chosen?: number | null): Gamepad | null {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    if (chosen !== undefined && chosen !== null && pads[chosen]) return pads[chosen]
    if (this.gamepadIndex !== null && pads[this.gamepadIndex]) return pads[this.gamepadIndex]
    for (const p of pads) if (p) return p
    return null
  }

  /** Fire `action` once on the rising edge of a wheel button press. */
  private wheelButtonEdge(gp: Gamepad, i: number, action: () => void): void {
    const pressed = gp.buttons[i]?.pressed ?? false
    if (pressed && !this.wheelButtonPrev[i]) action()
    this.wheelButtonPrev[i] = pressed
  }

  /**
   * Read the Kaiju XR1 each frame while in a wheel mode and translate it into the
   * same input the keyboard/mouse produce. Steering axis and pedals come from the
   * per-mode mapping (D-Input vs X-Input) calibrated in the wheel overlay.
   */
  private updateWheelInput(_dt: number): void {
    if (!this.isWheelMode()) return

    const mode: WheelMode = this.currentControlMode === 'wheel-dinput' ? 'dinput' : 'xinput'
    const map = getWheelMapping(mode)
    const gp = this.activeGamepad(map.gamepadIndex)
    if (!gp) {
      // Wheel vanished mid-drive — neutralise inputs.
      this.input.steering = 0
      this.input.throttle = 0
      return
    }

    // Steering from the configured wheel axis, with a small deadzone around centre.
    let steer = (gp.axes[map.steerAxis] ?? 0) * (map.steerInvert ? -1 : 1)
    if (Math.abs(steer) < WHEEL_DEADZONE) steer = 0
    this.input.steering = Math.max(-1, Math.min(1, steer))

    // Gas pedal drives forward; brake pedal decelerates / reverses (mirrors S).
    const gas = readPedalValue(gp.axes, gp.buttons, map.gas)
    const brake = readPedalValue(gp.axes, gp.buttons, map.brake)
    this.input.throttle = Math.max(-1, Math.min(1, gas - brake))
    this.input.brake = false

    // Paddle shifters → manual gear up/down (no-op in automatic).
    this.wheelButtonEdge(gp, WHEEL_SHIFT_UP_BUTTON, () => this.physics.shiftUp())
    this.wheelButtonEdge(gp, WHEEL_SHIFT_DOWN_BUTTON, () => this.physics.shiftDown())

    // Horn button (play on press, stop on release).
    const hornNow = gp.buttons[WHEEL_HORN_BUTTON]?.pressed ?? false
    if (hornNow && !this.wheelHornPrev) this.engineAudio.playHorn()
    else if (!hornNow && this.wheelHornPrev) this.engineAudio.stopHorn()
    this.wheelHornPrev = hornNow
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

  getHeading(): number {
    return this.physics.getHeading()
  }

  getPosition(): Vector3 {
    return this.carMesh.position.clone()
  }

  getCurrentGear(): number {
    return this.physics.getCurrentGear()
  }

  getGearName(): string {
    return this.physics.getGearName()
  }

  getTransmissionMode(): 'automatic' | 'manual' {
    return this.physics.getTransmissionMode()
  }

  getRPM(): number {
    return this.physics.getRPM()
  }

  /**
   * Update physics configuration
   */
  updatePhysicsConfig(config: Partial<CarPhysicsConfig>): void {
    this.physics.updateConfig(config)
  }

  /**
   * Trigger a camera shake effect (e.g. from speed bumps or big collisions).
   */
  triggerCameraShake(intensity: number = 0.35, duration: number = 0.5): void {
    this.cameraManager.triggerShake(intensity, duration)
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

    // Remove gamepad listeners
    if (this._gamepadConnectHandler) {
      window.removeEventListener('gamepadconnected', this._gamepadConnectHandler)
      this._gamepadConnectHandler = null
    }
    if (this._gamepadDisconnectHandler) {
      window.removeEventListener('gamepaddisconnected', this._gamepadDisconnectHandler)
      this._gamepadDisconnectHandler = null
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
