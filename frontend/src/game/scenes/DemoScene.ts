import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  Animation,
  AbstractMesh,
} from '@babylonjs/core'
import type { GameScene, SceneContext, GraphicsConfig } from '../types'
import { CameraController } from '../components/CameraController'
import { LightingSetup } from '../components/LightingSetup'
import { EnvironmentSetup } from '../components/EnvironmentSetup'
import { PostProcessingPipeline } from '../engine/PostProcessingPipeline'
import { InputManager } from '../engine/InputManager'
import { DEFAULT_GRAPHICS_CONFIG } from '../types'

export class DemoScene implements GameScene {
  name = 'DemoScene'

  private scene: Scene | null = null
  private cameraController: CameraController | null = null
  private lightingSetup: LightingSetup | null = null
  private environmentSetup: EnvironmentSetup | null = null
  private postProcessing: PostProcessingPipeline | null = null
  private inputManager: InputManager | null = null

  private animatedMeshes: AbstractMesh[] = []
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

    // Setup camera (orbit camera for demo)
    this.cameraController = new CameraController(this.scene, canvas, {
      type: 'orbit',
      target: new Vector3(0, 1, 0),
      alpha: Math.PI / 2,
      beta: Math.PI / 3,
      radius: 15,
      lowerRadiusLimit: 5,
      upperRadiusLimit: 50,
    })

    // Set active camera
    this.scene.activeCamera = this.cameraController.getCamera()

    // Setup lighting
    this.lightingSetup = new LightingSetup(this.scene, this.graphicsConfig, {
      sunDirection: new Vector3(-1, -3, -2),
      sunIntensity: 1.5,
      ambientIntensity: 0.4,
    })

    // Setup environment
    this.environmentSetup = new EnvironmentSetup(this.scene, this.graphicsConfig)
    this.environmentSetup.createProceduralSkybox(
      new Color3(0.05, 0.1, 0.25), // Top color (deep blue)
      new Color3(0.6, 0.65, 0.8) // Bottom color (light blue)
    )
    this.environmentSetup.createGround(100, true, new Color3(0.15, 0.15, 0.18))
    this.environmentSetup.setupGlowLayer(0.4)

    // Setup post-processing
    if (this.scene.activeCamera) {
      this.postProcessing = new PostProcessingPipeline({
        scene: this.scene,
        camera: this.scene.activeCamera,
        config: this.graphicsConfig,
      })
    }

    // Create demo objects
    this.createDemoObjects()

    console.log('[DemoScene] Initialized')
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
    // Update camera controller if using FPS camera
    this.cameraController?.update(deltaTime)
  }

  dispose(): void {
    this.postProcessing?.dispose()
    this.environmentSetup?.dispose()
    this.lightingSetup?.dispose()
    this.cameraController?.dispose()
    this.inputManager?.dispose()

    this.animatedMeshes.forEach((mesh) => mesh.dispose())
    this.animatedMeshes = []

    console.log('[DemoScene] Disposed')
  }
}
