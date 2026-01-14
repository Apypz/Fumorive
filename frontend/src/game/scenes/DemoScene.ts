import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  Animation,
  AbstractMesh,
  SceneLoader,
  StandardMaterial,
  Texture,
  ArcRotateCamera,
} from '@babylonjs/core'
// Import all available loaders
import '@babylonjs/loaders/OBJ'
import '@babylonjs/loaders/glTF'
import '@babylonjs/loaders'
import type { GameScene, SceneContext, GraphicsConfig } from '../types'
import { CameraController } from '../components/CameraController'
import { LightingSetup } from '../components/LightingSetup'
import { EnvironmentSetup } from '../components/EnvironmentSetup'
import { PostProcessingPipeline } from '../engine/PostProcessingPipeline'
import { InputManager } from '../engine/InputManager'
import { CarController } from '../components/CarController'
import { SimpleMap } from '../components/SimpleMap'
import { DEFAULT_GRAPHICS_CONFIG } from '../types'

export class DemoScene implements GameScene {
  name = 'DemoScene'

  private scene: Scene | null = null
  private cameraController: CameraController | null = null
  private lightingSetup: LightingSetup | null = null
  private environmentSetup: EnvironmentSetup | null = null
  private postProcessing: PostProcessingPipeline | null = null
  private inputManager: InputManager | null = null
  private carController: CarController | null = null
  private simpleMap: SimpleMap | null = null

  private animatedMeshes: AbstractMesh[] = []
  private carMesh: AbstractMesh | null = null
  private graphicsConfig: GraphicsConfig

  constructor(graphicsConfig?: GraphicsConfig) {
    this.graphicsConfig = graphicsConfig ?? DEFAULT_GRAPHICS_CONFIG
  }

  async init(context: SceneContext): Promise<void> {
    this.scene = context.scene
    const canvas = context.canvas

    console.log('[DemoScene] Initializing...')

    // Setup input manager
    this.inputManager = new InputManager(this.scene, canvas)

    // Setup camera (orbit camera centered on car)
    this.cameraController = new CameraController(this.scene, canvas, {
      type: 'orbit',
      target: new Vector3(0, 0.8, 0), // Target car center
      alpha: -Math.PI / 4, // 45 degrees from front-left
      beta: Math.PI / 3.5, // Slightly above
      radius: 1, // Close to the car
      lowerRadiusLimit: 0.5,
      upperRadiusLimit: 5,
    })

    // Set active camera
    this.scene.activeCamera = this.cameraController.getCamera()

    // Setup lighting - bright daylight
    this.lightingSetup = new LightingSetup(this.scene, this.graphicsConfig, {
      sunDirection: new Vector3(-1, -2, -1),
      sunIntensity: 3,
      ambientIntensity: 1.5,
    })

    // Create simple map/track (replaces old environment ground)
    this.simpleMap = new SimpleMap(this.scene, this.lightingSetup)
    this.simpleMap.createRaceTrack()

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
      // Load the GLB model
      const modelPath = '/assets/car_for_games_unity/'
      const modelFile = 'car_for_games_unity.glb'
      
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

        // Position the car at start line
        rootMesh.position = new Vector3(0, 0, 25)
        
        // Scale the car (adjust as needed based on the model)
        rootMesh.scaling = new Vector3(0.5, 0.5, 0.5)
        
        // Rotate car to face forward on the track
        rootMesh.rotation.y = Math.PI / 2
        
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

        // Setup car controller for WASD movement
        this.carController = new CarController(this.scene!, rootMesh, {
          maxSpeed: 40,
          acceleration: 20,
          brakeForce: 30,
          turnSpeed: 2.0,
          friction: 0.985,
        })

        // Set camera to follow car
        const camera = this.cameraController?.getCamera() as ArcRotateCamera
        if (camera) {
          this.carController.setCamera(camera)
          camera.target = rootMesh.position.add(new Vector3(0, 0.8, 0))
        }

        console.log('[DemoScene] Car model setup complete with controls')
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
    carBody.position = new Vector3(0, 0.6, 0)

    // Car cabin (roof)
    const carCabin = MeshBuilder.CreateBox('carCabin', { width: 2.2, height: 0.9, depth: 1.8 }, this.scene)
    carCabin.position = new Vector3(-0.3, 1.55, 0)

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

  private createDemoObjects(): void {
    if (!this.scene) return

    // Create central glowing sphere
    const centerSphere = MeshBuilder.CreateSphere(
      'centerSphere',
      { diameter: 2, segments: 32 },
      this.scene
    )
    centerSphere.position.y = 1

    const sphereMaterial = new PBRMaterial('sphereMaterial', this.scene)
    sphereMaterial.albedoColor = new Color3(0.9, 0.2, 0.3)
    sphereMaterial.metallic = 0.9
    sphereMaterial.roughness = 0.1
    sphereMaterial.emissiveColor = new Color3(0.5, 0.1, 0.15)
    sphereMaterial.emissiveIntensity = 0.5
    centerSphere.material = sphereMaterial

    this.lightingSetup?.addShadowCaster(centerSphere)

    // Add floating animation
    this.addFloatingAnimation(centerSphere, 1, 0.3, 2)
    this.animatedMeshes.push(centerSphere)

    // Create surrounding cubes
    const cubeColors = [
      new Color3(0.2, 0.6, 0.9), // Blue
      new Color3(0.2, 0.8, 0.4), // Green
      new Color3(0.9, 0.7, 0.2), // Gold
      new Color3(0.7, 0.3, 0.9), // Purple
      new Color3(0.9, 0.5, 0.2), // Orange
      new Color3(0.3, 0.8, 0.8), // Cyan
    ]

    const radius = 6
    const cubeCount = 6

    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const cube = MeshBuilder.CreateBox(
        `cube_${i}`,
        { size: 1.5 },
        this.scene
      )
      cube.position = new Vector3(x, 0.75, z)

      const cubeMaterial = new PBRMaterial(`cubeMaterial_${i}`, this.scene)
      cubeMaterial.albedoColor = cubeColors[i]
      cubeMaterial.metallic = 0.3
      cubeMaterial.roughness = 0.4
      cube.material = cubeMaterial

      this.lightingSetup?.addShadowCaster(cube)

      // Add rotation animation
      this.addRotationAnimation(cube, i * 0.5)
      this.animatedMeshes.push(cube)
    }

    // Create metallic pillars
    const pillarPositions = [
      new Vector3(-12, 3, -12),
      new Vector3(12, 3, -12),
      new Vector3(-12, 3, 12),
      new Vector3(12, 3, 12),
    ]

    pillarPositions.forEach((pos, i) => {
      const pillar = MeshBuilder.CreateCylinder(
        `pillar_${i}`,
        { diameter: 1.5, height: 6, tessellation: 24 },
        this.scene!
      )
      pillar.position = pos

      const pillarMaterial = new PBRMaterial(`pillarMaterial_${i}`, this.scene!)
      pillarMaterial.albedoColor = new Color3(0.8, 0.75, 0.6)
      pillarMaterial.metallic = 1.0
      pillarMaterial.roughness = 0.2
      pillar.material = pillarMaterial

      this.lightingSetup?.addShadowCaster(pillar)

      // Create glowing top
      const glowSphere = MeshBuilder.CreateSphere(
        `glowSphere_${i}`,
        { diameter: 0.6, segments: 16 },
        this.scene!
      )
      glowSphere.position = pos.add(new Vector3(0, 3.5, 0))

      const glowMaterial = new PBRMaterial(`glowMaterial_${i}`, this.scene!)
      glowMaterial.albedoColor = new Color3(1, 0.9, 0.5)
      glowMaterial.emissiveColor = new Color3(1, 0.8, 0.3)
      glowMaterial.emissiveIntensity = 2
      glowSphere.material = glowMaterial

      // Add point light at pillar top
      this.lightingSetup?.addPointLight(
        `pillarLight_${i}`,
        pos.add(new Vector3(0, 3.5, 0)),
        new Color3(1, 0.8, 0.5),
        0.5,
        15
      )
    })

    // Create a torus for visual interest
    const torus = MeshBuilder.CreateTorus(
      'torus',
      { diameter: 4, thickness: 0.5, tessellation: 48 },
      this.scene
    )
    torus.position.y = 1
    torus.rotation.x = Math.PI / 2

    const torusMaterial = new PBRMaterial('torusMaterial', this.scene)
    torusMaterial.albedoColor = new Color3(0.3, 0.3, 0.35)
    torusMaterial.metallic = 0.8
    torusMaterial.roughness = 0.2
    torus.material = torusMaterial

    this.lightingSetup?.addShadowCaster(torus)
    this.addRotationAnimation(torus, 0, 'y', 0.2)
    this.animatedMeshes.push(torus)

    console.log('[DemoScene] Demo objects created')
  }

  private addFloatingAnimation(
    mesh: AbstractMesh,
    baseY: number,
    amplitude: number,
    duration: number
  ): void {
    const animation = new Animation(
      'floatAnimation',
      'position.y',
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    )

    const keys = [
      { frame: 0, value: baseY },
      { frame: 30 * (duration / 2), value: baseY + amplitude },
      { frame: 30 * duration, value: baseY },
    ]

    animation.setKeys(keys)
    mesh.animations.push(animation)
    this.scene?.beginAnimation(mesh, 0, 30 * duration, true)
  }

  private addRotationAnimation(
    mesh: AbstractMesh,
    delay: number,
    axis: 'x' | 'y' | 'z' = 'y',
    speed: number = 0.5
  ): void {
    const animation = new Animation(
      `rotateAnimation_${axis}`,
      `rotation.${axis}`,
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    )

    const duration = (Math.PI * 2) / speed
    const keys = [
      { frame: 0, value: delay },
      { frame: 30 * duration, value: delay + Math.PI * 2 },
    ]

    animation.setKeys(keys)
    mesh.animations.push(animation)
    this.scene?.beginAnimation(mesh, 0, 30 * duration, true)
  }

  update(deltaTime: number): void {
    // Update car controller (physics and movement)
    this.carController?.update(deltaTime)
    
    // Update camera controller if using FPS camera
    this.cameraController?.update(deltaTime)
  }

  dispose(): void {
    this.postProcessing?.dispose()
    this.environmentSetup?.dispose()
    this.lightingSetup?.dispose()
    this.cameraController?.dispose()
    this.inputManager?.dispose()
    this.carController?.dispose()
    this.simpleMap?.dispose()

    this.animatedMeshes.forEach((mesh) => mesh.dispose())
    this.animatedMeshes = []

    if (this.carMesh) {
      this.carMesh.dispose()
      this.carMesh = null
    }

    console.log('[DemoScene] Disposed')
  }
}
