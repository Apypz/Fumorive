import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  AbstractMesh,
  SceneLoader,
} from '@babylonjs/core'
// Import all available loaders
import '@babylonjs/loaders/OBJ'
import '@babylonjs/loaders/glTF'
import '@babylonjs/loaders'
import type { GameScene, SceneContext, GraphicsConfig, MapType, CameraMode, ControlMode, CameraPositionConfig } from '../types'
import { DEFAULT_GRAPHICS_CONFIG } from '../types'
import { LightingSetup } from '../components/LightingSetup'
import { EnvironmentSetup } from '../components/EnvironmentSetup'
import { PostProcessingPipeline } from '../engine/PostProcessingPipeline'
import { InputManager } from '../engine/InputManager'
import { CarController } from '../components/car'
import { SimpleMap } from '../components/SimpleMap'

export type { MapType }

export class DemoScene implements GameScene {
  name = 'DemoScene'

  private scene: Scene | null = null
  private canvas: HTMLCanvasElement | null = null
  private lightingSetup: LightingSetup | null = null
  private environmentSetup: EnvironmentSetup | null = null
  private postProcessing: PostProcessingPipeline | null = null
  private inputManager: InputManager | null = null
  private carController: CarController | null = null
  private simpleMap: SimpleMap | null = null

  private animatedMeshes: AbstractMesh[] = []
  private carMesh: AbstractMesh | null = null
  private graphicsConfig: GraphicsConfig
  private mapType: MapType

  // Camera mode change callback
  private onCameraModeChange: ((mode: CameraMode) => void) | null = null
  // Control mode change callback
  private onControlModeChange: ((mode: ControlMode) => void) | null = null
  // Engine state change callback
  private onEngineStateChange: ((running: boolean) => void) | null = null

  constructor(graphicsConfig?: GraphicsConfig, mapType: MapType = 'solo-city') {
    this.graphicsConfig = graphicsConfig ?? DEFAULT_GRAPHICS_CONFIG
    this.mapType = mapType
  }

  /**
   * Set callback for camera mode changes (to update UI)
   */
  setOnCameraModeChange(callback: (mode: CameraMode) => void): void {
    this.onCameraModeChange = callback
    // Also set on car controller if already initialized
    if (this.carController) {
      this.carController.onCameraModeChanged(callback)
    }
  }

  /**
   * Set callback for control mode changes (to update UI)
   */
  setOnControlModeChange(callback: (mode: ControlMode) => void): void {
    this.onControlModeChange = callback
    // Also set on car controller if already initialized
    if (this.carController) {
      this.carController.onControlModeChanged(callback)
    }
  }

  /**
   * Set callback for engine state changes (to update UI)
   */
  setOnEngineStateChange(callback: (running: boolean) => void): void {
    this.onEngineStateChange = callback
    // Also set on car controller if already initialized
    if (this.carController) {
      this.carController.onEngineStateChanged(callback)
    }
  }

  /**
   * Get current control mode
   */
  getControlMode(): ControlMode {
    return this.carController?.getControlMode() ?? 'keyboard'
  }

  /**
   * Get current camera mode
   */
  getCameraMode(): CameraMode {
    return this.carController?.getCameraMode() ?? 'third-person'
  }

  /**
   * Get camera position config for UI adjustment
   */
  getCameraConfig(): CameraPositionConfig | null {
    return this.carController ? null : null // Can be extended to expose config
  }

  /**
   * Get current steering angle (-1 to 1)
   */
  getSteeringAngle(): number {
    return this.carController?.getSteeringInput() ?? 0
  }

  /**
   * Get current speed in km/h
   */
  getSpeedKmh(): number {
    return this.carController?.getSpeedKmh() ?? 0
  }

  /**
   * Get whether car is currently drifting
   */
  getIsDrifting(): boolean {
    return this.carController?.getIsDrifting() ?? false
  }

  /**
   * Get slip angle in degrees for drift visualization
   */
  getSlipAngle(): number {
    return this.carController?.getSlipAngle() ?? 0
  }

  /**
   * Get whether engine is running
   */
  isEngineRunning(): boolean {
    return this.carController?.isEngineRunning() ?? false
  }

  async init(context: SceneContext): Promise<void> {
    this.scene = context.scene
    this.canvas = context.canvas

    console.log('[DemoScene] Initializing...')

    // Setup input manager
    this.inputManager = new InputManager(this.scene, this.canvas)

    // Setup lighting - bright daylight
    this.lightingSetup = new LightingSetup(this.scene, this.graphicsConfig, {
      sunDirection: new Vector3(-1, -2, -1),
      sunIntensity: 3,
      ambientIntensity: 1.5,
    })

    // Create map based on selected mapType
    this.simpleMap = new SimpleMap(this.scene, this.lightingSetup)
    if (this.mapType === 'sriwedari-park') {
      this.simpleMap.createSriwedariPark()
      console.log('[DemoScene] Loading Sriwedari Park map')
    } else {
      this.simpleMap.createSoloCity()
      console.log('[DemoScene] Loading Solo City map')
    }

    // Setup environment (skybox only, ground is from map)
    this.environmentSetup = new EnvironmentSetup(this.scene, this.graphicsConfig)
    this.environmentSetup.createProceduralSkybox(
      new Color3(0.4, 0.6, 0.9), // Top color (bright blue sky)
      new Color3(0.7, 0.8, 0.95) // Bottom color (light horizon)
    )
    this.environmentSetup.setupGlowLayer(0.3)

    // Setup post-processing
    if (this.scene.activeCamera) {
      this.postProcessing = new PostProcessingPipeline({
        scene: this.scene,
        camera: this.scene.activeCamera,
        config: this.graphicsConfig,
      })
    }

    // Load the car model
    await this.loadCarModel()

    // Create demo objects (optional, can be removed if you only want the car)
    // this.createDemoObjects()

    console.log('[DemoScene] Initialized')
  }

  /**
   * Load the car model from assets
   */
  private async loadCarModel(): Promise<void> {
    if (!this.scene) return

    console.log('[DemoScene] Loading car model...')

    try {
      // Load the GLB model - Chevrolet C10 Pickup 1963 (resized in Blender)
      const modelPath = '/assets/Chevrolet_C10_Pickup_1963/'
      const modelFile = 'quit.glb'
      
      console.log(`[DemoScene] Attempting to load: ${modelPath}${modelFile}`)
      
      // Load the model using SceneLoader
      const result = await SceneLoader.ImportMeshAsync(
        '', // Import all meshes
        modelPath, // Path to the folder
        modelFile, // File name
        this.scene
      )

      console.log('[DemoScene] Car model loaded, meshes:', result.meshes.length)

      // Get the root mesh (first one is usually the root)
      if (result.meshes.length > 0) {
        const rootMesh = result.meshes[0]
        this.carMesh = rootMesh

        // Position the car on road_center_v (vertical road at x:50)
        rootMesh.position = new Vector3(50, 0, 50)
        
        // Scale - model sudah di-resize di Blender, gunakan skala 1.0
        rootMesh.scaling = new Vector3(1.0, 1.0, 1.0)
        
        // Rotate car to face North (+Z direction) - adjust based on model's default orientation
        rootMesh.rotation.y = Math.PI / 2
        
        // Enable collision on car mesh
        rootMesh.checkCollisions = true
        result.meshes.forEach((mesh) => {
          mesh.checkCollisions = true
        })

        // Log bounding info for debugging
        rootMesh.computeWorldMatrix(true)
        const boundingInfo = rootMesh.getHierarchyBoundingVectors()
        console.log('[DemoScene] Model bounds:', boundingInfo)

        // Apply texture and materials to all meshes
        result.meshes.forEach((mesh) => {
          // Add shadow casting
          this.lightingSetup?.addShadowCaster(mesh)
          // Make mesh receive shadows
          mesh.receiveShadows = true
        })

        // Setup car controller for WASD movement with dual camera system
        // Camera position config - EASILY ADJUSTABLE VALUES
        // Disesuaikan untuk Chevrolet C10 Pickup (pickup truck lebih besar)
        const cameraConfig: Partial<CameraPositionConfig> = {
          thirdPerson: {
            distance: 10,             // Distance from car (lebih jauh untuk pickup)
            heightOffset: 3.0,        // Height above car (pickup lebih tinggi)
            targetHeightOffset: 2.5,  // Look at point height
            alpha: -Math.PI / 4,      // Horizontal angle
            beta: Math.PI / 2.2,      // Vertical angle
            lowerRadiusLimit: 5,
            upperRadiusLimit: 25,
          },
          firstPerson: {
            forwardOffset: 0.1,       // Forward from car center (driver position)
            heightOffset: 2.25,        // Eye level height (pickup cab lebih tinggi)
            sideOffset: -0.05,          // Right offset (driver seat)
            fov: 1.2,                 // Field of view
            lookAheadDistance: 50,    // How far to look ahead
          },
        }

        this.carController = new CarController(
          this.scene!, 
          rootMesh, 
          {}, // Car physics config (use defaults)
          cameraConfig
        )

        // Setup cameras with canvas
        if (this.canvas) {
          this.carController.setupCameras(this.canvas)
        }

        // Set camera mode change callback
        if (this.onCameraModeChange) {
          this.carController.onCameraModeChanged(this.onCameraModeChange)
        }

        // Set control mode change callback
        if (this.onControlModeChange) {
          this.carController.onControlModeChanged(this.onControlModeChange)
        }

        // Set engine state change callback
        if (this.onEngineStateChange) {
          this.carController.onEngineStateChanged(this.onEngineStateChange)
        }

        // Set map reference for collision detection
        if (this.simpleMap) {
          this.carController.setMap(this.simpleMap)
        }

        // Set active camera from car controller
        const activeCamera = this.carController.getActiveCamera()
        if (activeCamera) {
          this.scene!.activeCamera = activeCamera
        }

        console.log('[DemoScene] Car model setup complete with dual camera system')
      }
    } catch (error) {
      console.error('[DemoScene] Failed to load car model:', error)
      console.log('[DemoScene] Note: FBX format is not supported natively.')
      console.log('[DemoScene] Please convert your FBX file to GLB format using Blender or an online converter.')
      // Create a fallback box to show something
      this.createFallbackCar()
    }
  }

  /**
   * Create a fallback car placeholder if model loading fails
   */
  private createFallbackCar(): void {
    if (!this.scene) return

    console.log('[DemoScene] Creating fallback car placeholder')

    // Create a more detailed car-like placeholder
    // Main car body
    const carBody = MeshBuilder.CreateBox('carBody', { width: 4, height: 1, depth: 2 }, this.scene)
    carBody.position = new Vector3(0, 0.6, 50)

    // Car cabin (roof)
    const carCabin = MeshBuilder.CreateBox('carCabin', { width: 2.2, height: 0.9, depth: 1.8 }, this.scene)
    carCabin.position = new Vector3(-0.3, 1.55, 50)

    // Hood (front)
    const hood = MeshBuilder.CreateBox('hood', { width: 1, height: 0.3, depth: 1.8 }, this.scene)
    hood.position = new Vector3(1.3, 0.9, 0)

    // Create wheels
    const wheelPositions = [
      new Vector3(1.2, 0.35, 1.1),   // Front right
      new Vector3(1.2, 0.35, -1.1),  // Front left
      new Vector3(-1.2, 0.35, 1.1),  // Back right
      new Vector3(-1.2, 0.35, -1.1), // Back left
    ]

    const wheelMaterial = new PBRMaterial('wheelMaterial', this.scene)
    wheelMaterial.albedoColor = new Color3(0.1, 0.1, 0.1)
    wheelMaterial.metallic = 0.3
    wheelMaterial.roughness = 0.8

    wheelPositions.forEach((pos, i) => {
      const wheel = MeshBuilder.CreateCylinder(`wheel_${i}`, {
        diameter: 0.7,
        height: 0.3,
        tessellation: 24
      }, this.scene!)
      wheel.rotation.x = Math.PI / 2
      wheel.position = pos
      wheel.material = wheelMaterial
      this.lightingSetup?.addShadowCaster(wheel)
    })

    // Create materials
    const bodyMaterial = new PBRMaterial('carBodyMaterial', this.scene)
    bodyMaterial.albedoColor = new Color3(0.8, 0.2, 0.2) // Red car
    bodyMaterial.metallic = 0.7
    bodyMaterial.roughness = 0.3
    carBody.material = bodyMaterial
    hood.material = bodyMaterial

    const cabinMaterial = new PBRMaterial('cabinMaterial', this.scene)
    cabinMaterial.albedoColor = new Color3(0.1, 0.1, 0.15) // Dark windows
    cabinMaterial.metallic = 0.9
    cabinMaterial.roughness = 0.1
    carCabin.material = cabinMaterial

    // Headlights
    const headlightMaterial = new PBRMaterial('headlightMaterial', this.scene)
    headlightMaterial.albedoColor = new Color3(1, 1, 0.9)
    headlightMaterial.emissiveColor = new Color3(1, 1, 0.8)
    headlightMaterial.emissiveIntensity = 1

    const headlightPositions = [
      new Vector3(2, 0.6, 0.6),
      new Vector3(2, 0.6, -0.6),
    ]

    headlightPositions.forEach((pos, i) => {
      const headlight = MeshBuilder.CreateSphere(`headlight_${i}`, { diameter: 0.3 }, this.scene!)
      headlight.position = pos
      headlight.material = headlightMaterial
    })

    // Taillights
    const taillightMaterial = new PBRMaterial('taillightMaterial', this.scene)
    taillightMaterial.albedoColor = new Color3(1, 0.1, 0.1)
    taillightMaterial.emissiveColor = new Color3(1, 0, 0)
    taillightMaterial.emissiveIntensity = 0.5

    const taillightPositions = [
      new Vector3(-2, 0.6, 0.6),
      new Vector3(-2, 0.6, -0.6),
    ]

    taillightPositions.forEach((pos, i) => {
      const taillight = MeshBuilder.CreateBox(`taillight_${i}`, { width: 0.1, height: 0.2, depth: 0.4 }, this.scene!)
      taillight.position = pos
      taillight.material = taillightMaterial
    })

    this.carMesh = carBody
    this.lightingSetup?.addShadowCaster(carBody)
    this.lightingSetup?.addShadowCaster(carCabin)
    this.lightingSetup?.addShadowCaster(hood)

    console.log('[DemoScene] Fallback car created')
  }

  update(deltaTime: number): void {
    // Update car controller (physics, movement, and camera)
    this.carController?.update(deltaTime)
  }

  dispose(): void {
    this.postProcessing?.dispose()
    this.environmentSetup?.dispose()
    this.lightingSetup?.dispose()
    this.inputManager?.dispose()
    this.carController?.dispose()
    if (typeof this.simpleMap?.dispose === 'function') {
      this.simpleMap?.dispose();
    }

    this.animatedMeshes.forEach((mesh) => mesh.dispose())
    this.animatedMeshes = []

    if (this.carMesh) {
      this.carMesh.dispose()
      this.carMesh = null
    }

    this.onCameraModeChange = null
    this.onControlModeChange = null
    this.canvas = null

    console.log('[DemoScene] Disposed')
  }
}
