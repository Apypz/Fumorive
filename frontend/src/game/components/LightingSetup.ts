import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  ShadowGenerator,
  Vector3,
  Color3,
  CascadedShadowGenerator,
  AbstractMesh,
} from '@babylonjs/core'
import type { GraphicsConfig } from '../types'

export interface LightingConfig {
  ambientColor?: Color3
  ambientIntensity?: number
  sunDirection?: Vector3
  sunColor?: Color3
  sunIntensity?: number
  enableShadows?: boolean
  shadowMapSize?: number
}

const DEFAULT_CONFIG: LightingConfig = {
  ambientColor: new Color3(0.4, 0.45, 0.5),
  ambientIntensity: 0.6,
  sunDirection: new Vector3(-1, -2, -1),
  sunColor: new Color3(1, 0.95, 0.85),
  sunIntensity: 1.2,
  enableShadows: true,
  shadowMapSize: 2048,
}

export class LightingSetup {
  private scene: Scene
  private config: LightingConfig
  private graphicsConfig: GraphicsConfig

  private hemisphericLight: HemisphericLight | null = null
  private directionalLight: DirectionalLight | null = null
  private shadowGenerator: ShadowGenerator | CascadedShadowGenerator | null = null

  private additionalLights: Map<string, PointLight | SpotLight> = new Map()

  constructor(scene: Scene, graphicsConfig: GraphicsConfig, config?: Partial<LightingConfig>) {
    this.scene = scene
    this.graphicsConfig = graphicsConfig
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.setup()
  }

  private setup(): void {
    // Create ambient light (hemisphere)
    this.createAmbientLight()

    // Create directional light (sun)
    this.createSunLight()

    // Setup shadows
    if (this.config.enableShadows) {
      this.setupShadows()
    }

    console.log('[LightingSetup] Lighting initialized')
  }

  private createAmbientLight(): void {
    this.hemisphericLight = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    )

    this.hemisphericLight.diffuse = this.config.ambientColor ?? new Color3(0.4, 0.45, 0.5)
    this.hemisphericLight.groundColor = new Color3(0.2, 0.2, 0.25)
    this.hemisphericLight.intensity = this.config.ambientIntensity ?? 0.6
    this.hemisphericLight.specular = Color3.Black()
  }

  private createSunLight(): void {
    const direction = this.config.sunDirection ?? new Vector3(-1, -2, -1)
    direction.normalize()

    this.directionalLight = new DirectionalLight(
      'sunLight',
      direction,
      this.scene
    )

    this.directionalLight.diffuse = this.config.sunColor ?? new Color3(1, 0.95, 0.85)
    this.directionalLight.specular = new Color3(1, 0.95, 0.85)
    this.directionalLight.intensity = this.config.sunIntensity ?? 1.2

    // Position the light for shadow calculation
    this.directionalLight.position = direction.scale(-50)
  }

  private setupShadows(): void {
    if (!this.directionalLight) return

    const shadowMapSize = this.getShadowMapSize()

    // Use Cascaded Shadow Maps for better outdoor shadows
    if (this.graphicsConfig.shadowQuality === 'ultra' || this.graphicsConfig.shadowQuality === 'high') {
      this.shadowGenerator = new CascadedShadowGenerator(shadowMapSize, this.directionalLight)
      const csmGenerator = this.shadowGenerator as CascadedShadowGenerator

      csmGenerator.stabilizeCascades = true
      csmGenerator.lambda = 0.9
      csmGenerator.cascadeBlendPercentage = 0.1
      csmGenerator.shadowMaxZ = 200
      csmGenerator.depthClamp = true
      csmGenerator.autoCalcDepthBounds = true

      // Quality settings
      if (this.graphicsConfig.shadowQuality === 'ultra') {
        csmGenerator.numCascades = 4
        csmGenerator.filteringQuality = CascadedShadowGenerator.QUALITY_HIGH
        csmGenerator.usePercentageCloserFiltering = true
        csmGenerator.penumbraDarkness = 0.8
      } else {
        csmGenerator.numCascades = 3
        csmGenerator.filteringQuality = CascadedShadowGenerator.QUALITY_MEDIUM
      }
    } else {
      // Standard shadow generator for lower quality
      this.shadowGenerator = new ShadowGenerator(shadowMapSize, this.directionalLight)

      if (this.graphicsConfig.shadowQuality === 'medium') {
        this.shadowGenerator.useBlurExponentialShadowMap = true
        this.shadowGenerator.blurKernel = 32
      } else {
        this.shadowGenerator.usePoissonSampling = true
      }

      this.shadowGenerator.bias = 0.001
      this.shadowGenerator.normalBias = 0.02
    }

    console.log(`[LightingSetup] Shadows configured (${this.graphicsConfig.shadowQuality})`)
  }

  private getShadowMapSize(): number {
    switch (this.graphicsConfig.shadowQuality) {
      case 'ultra':
        return 4096
      case 'high':
        return 2048
      case 'medium':
        return 1024
      case 'low':
      default:
        return 512
    }
  }

  /**
   * Add a mesh to the shadow casters list
   */
  addShadowCaster(mesh: AbstractMesh): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(mesh)
      mesh.receiveShadows = true
    }
  }

  /**
   * Remove a mesh from shadow casters
   */
  removeShadowCaster(mesh: AbstractMesh): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.removeShadowCaster(mesh)
    }
  }

  /**
   * Add a point light
   */
  addPointLight(
    id: string,
    position: Vector3,
    color: Color3 = Color3.White(),
    intensity: number = 1,
    range: number = 20
  ): PointLight {
    const light = new PointLight(`pointLight_${id}`, position, this.scene)
    light.diffuse = color
    light.specular = color
    light.intensity = intensity
    light.range = range

    this.additionalLights.set(id, light)
    return light
  }

  /**
   * Add a spot light
   */
  addSpotLight(
    id: string,
    position: Vector3,
    direction: Vector3,
    angle: number = Math.PI / 4,
    color: Color3 = Color3.White(),
    intensity: number = 1,
    range: number = 50
  ): SpotLight {
    const light = new SpotLight(
      `spotLight_${id}`,
      position,
      direction,
      angle,
      2,
      this.scene
    )
    light.diffuse = color
    light.specular = color
    light.intensity = intensity
    light.range = range

    this.additionalLights.set(id, light)
    return light
  }

  /**
   * Remove an additional light
   */
  removeLight(id: string): void {
    const light = this.additionalLights.get(id)
    if (light) {
      light.dispose()
      this.additionalLights.delete(id)
    }
  }

  /**
   * Set sun direction
   */
  setSunDirection(direction: Vector3): void {
    if (this.directionalLight) {
      direction.normalize()
      this.directionalLight.direction = direction
      this.directionalLight.position = direction.scale(-50)
    }
  }

  /**
   * Set sun intensity
   */
  setSunIntensity(intensity: number): void {
    if (this.directionalLight) {
      this.directionalLight.intensity = intensity
    }
  }

  /**
   * Set ambient intensity
   */
  setAmbientIntensity(intensity: number): void {
    if (this.hemisphericLight) {
      this.hemisphericLight.intensity = intensity
    }
  }

  /**
   * Get shadow generator
   */
  getShadowGenerator(): ShadowGenerator | CascadedShadowGenerator | null {
    return this.shadowGenerator
  }

  /**
   * Get directional light
   */
  getDirectionalLight(): DirectionalLight | null {
    return this.directionalLight
  }

  /**
   * Get hemispheric light
   */
  getHemisphericLight(): HemisphericLight | null {
    return this.hemisphericLight
  }

  /**
   * Dispose all lights
   */
  dispose(): void {
    this.hemisphericLight?.dispose()
    this.directionalLight?.dispose()
    this.shadowGenerator?.dispose()

    this.additionalLights.forEach((light) => light.dispose())
    this.additionalLights.clear()

    console.log('[LightingSetup] Disposed')
  }
}
