import {
  Scene,
  CubeTexture,
  Color3,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Texture,
  GlowLayer,
  HighlightLayer,
  ReflectionProbe,
  AbstractMesh,
} from '@babylonjs/core'
import type { GraphicsConfig } from '../types'

export interface EnvironmentConfig {
  useSkybox?: boolean
  skyboxSize?: number
  useGround?: boolean
  groundSize?: number
  useGlow?: boolean
  glowIntensity?: number
  useFog?: boolean
  fogDensity?: number
  fogColor?: Color3
  useReflectionProbe?: boolean
  reflectionProbeSize?: number
}

const DEFAULT_CONFIG: EnvironmentConfig = {
  useSkybox: true,
  skyboxSize: 1000,
  useGround: true,
  groundSize: 100,
  useGlow: true,
  glowIntensity: 0.5,
  useFog: false,
  fogDensity: 0.01,
  fogColor: new Color3(0.8, 0.8, 0.9),
  useReflectionProbe: false,
  reflectionProbeSize: 512,
}

export class EnvironmentSetup {
  private scene: Scene
  private config: EnvironmentConfig
  private graphicsConfig: GraphicsConfig

  private skybox: AbstractMesh | null = null
  private ground: AbstractMesh | null = null
  private glowLayer: GlowLayer | null = null
  private highlightLayer: HighlightLayer | null = null
  private reflectionProbe: ReflectionProbe | null = null

  constructor(scene: Scene, graphicsConfig: GraphicsConfig, config?: Partial<EnvironmentConfig>) {
    this.scene = scene
    this.graphicsConfig = graphicsConfig
    this.config = { ...DEFAULT_CONFIG, ...config }

    console.log('[EnvironmentSetup] Initialized')
  }

  /**
   * Setup a procedural skybox
   */
  createProceduralSkybox(
    topColor: Color3 = new Color3(0.1, 0.15, 0.35),
    bottomColor: Color3 = new Color3(0.7, 0.75, 0.85)
  ): AbstractMesh {
    const skybox = MeshBuilder.CreateBox(
      'skybox',
      { size: this.config.skyboxSize ?? 1000 },
      this.scene
    )

    const skyboxMaterial = new StandardMaterial('skyboxMaterial', this.scene)
    skyboxMaterial.backFaceCulling = false
    skyboxMaterial.disableLighting = true

    // Create a gradient texture programmatically
    skyboxMaterial.emissiveColor = topColor.scale(0.5).add(bottomColor.scale(0.5))

    skybox.material = skyboxMaterial
    skybox.infiniteDistance = true
    skybox.renderingGroupId = 0

    this.skybox = skybox
    console.log('[EnvironmentSetup] Procedural skybox created')
    return skybox
  }

  /**
   * Setup skybox from HDR environment
   */
  createHDRSkybox(hdrUrl: string): AbstractMesh {
    const skybox = MeshBuilder.CreateBox(
      'skybox',
      { size: this.config.skyboxSize ?? 1000 },
      this.scene
    )

    const skyboxMaterial = new StandardMaterial('skyboxMaterial', this.scene)
    skyboxMaterial.backFaceCulling = false
    skyboxMaterial.disableLighting = true

    // Load HDR environment
    const hdrTexture = CubeTexture.CreateFromPrefilteredData(hdrUrl, this.scene)
    skyboxMaterial.reflectionTexture = hdrTexture
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE

    skybox.material = skyboxMaterial
    skybox.infiniteDistance = true
    skybox.renderingGroupId = 0

    // Also set as environment texture for PBR materials
    this.scene.environmentTexture = hdrTexture

    this.skybox = skybox
    console.log('[EnvironmentSetup] HDR skybox created')
    return skybox
  }

  /**
   * Create a ground plane
   */
  createGround(
    size: number = 100,
    usePBR: boolean = true,
    color: Color3 = new Color3(0.3, 0.3, 0.35)
  ): AbstractMesh {
    const ground = MeshBuilder.CreateGround(
      'ground',
      {
        width: size,
        height: size,
        subdivisions: 32,
      },
      this.scene
    )

    if (usePBR) {
      const groundMaterial = new PBRMaterial('groundMaterial', this.scene)
      groundMaterial.albedoColor = color
      groundMaterial.metallic = 0.0
      groundMaterial.roughness = 0.8
      groundMaterial.environmentIntensity = 0.5
      ground.material = groundMaterial
    } else {
      const groundMaterial = new StandardMaterial('groundMaterial', this.scene)
      groundMaterial.diffuseColor = color
      groundMaterial.specularColor = Color3.Black()
      ground.material = groundMaterial
    }

    ground.receiveShadows = true
    ground.checkCollisions = true

    this.ground = ground
    console.log('[EnvironmentSetup] Ground created')
    return ground
  }

  /**
   * Create a grid ground (useful for development)
   */
  createGridGround(size: number = 100, gridRatio: number = 1): AbstractMesh {
    const ground = MeshBuilder.CreateGround(
      'gridGround',
      {
        width: size,
        height: size,
        subdivisions: Math.floor(size / gridRatio),
      },
      this.scene
    )

    // Import GridMaterial dynamically
    import('@babylonjs/materials').then(({ GridMaterial }) => {
      const gridMaterial = new GridMaterial('gridMaterial', this.scene)
      gridMaterial.majorUnitFrequency = 10
      gridMaterial.minorUnitVisibility = 0.45
      gridMaterial.gridRatio = gridRatio
      gridMaterial.backFaceCulling = false
      gridMaterial.mainColor = new Color3(1, 1, 1)
      gridMaterial.lineColor = new Color3(0.3, 0.3, 0.3)
      gridMaterial.opacity = 0.98
      ground.material = gridMaterial
    })

    ground.receiveShadows = true
    ground.checkCollisions = true

    this.ground = ground
    console.log('[EnvironmentSetup] Grid ground created')
    return ground
  }

  /**
   * Setup glow layer for emissive materials
   */
  setupGlowLayer(intensity: number = 0.5): GlowLayer {
    if (this.glowLayer) {
      this.glowLayer.dispose()
    }

    this.glowLayer = new GlowLayer('glowLayer', this.scene, {
      mainTextureSamples: this.graphicsConfig.antialiasing ? 4 : 1,
      blurKernelSize: 64,
    })

    this.glowLayer.intensity = intensity

    console.log('[EnvironmentSetup] Glow layer created')
    return this.glowLayer
  }

  /**
   * Setup highlight layer for selection effects
   */
  setupHighlightLayer(): HighlightLayer {
    if (this.highlightLayer) {
      this.highlightLayer.dispose()
    }

    this.highlightLayer = new HighlightLayer('highlightLayer', this.scene, {
      blurTextureSizeRatio: 0.5,
      blurHorizontalSize: 1,
      blurVerticalSize: 1,
    })

    console.log('[EnvironmentSetup] Highlight layer created')
    return this.highlightLayer
  }

  /**
   * Add mesh to highlight layer
   */
  highlightMesh(mesh: AbstractMesh, color: Color3 = Color3.Green()): void {
    if (!this.highlightLayer) {
      this.setupHighlightLayer()
    }
    this.highlightLayer!.addMesh(mesh, color)
  }

  /**
   * Remove mesh from highlight layer
   */
  unhighlightMesh(mesh: AbstractMesh): void {
    if (this.highlightLayer) {
      this.highlightLayer.removeMesh(mesh)
    }
  }

  /**
   * Setup fog
   */
  setupFog(
    mode: 'linear' | 'exponential' | 'exponential2' = 'exponential',
    density: number = 0.01,
    color: Color3 = new Color3(0.8, 0.8, 0.9),
    start: number = 50,
    end: number = 200
  ): void {
    this.scene.fogColor = color

    switch (mode) {
      case 'linear':
        this.scene.fogMode = Scene.FOGMODE_LINEAR
        this.scene.fogStart = start
        this.scene.fogEnd = end
        break
      case 'exponential':
        this.scene.fogMode = Scene.FOGMODE_EXP
        this.scene.fogDensity = density
        break
      case 'exponential2':
        this.scene.fogMode = Scene.FOGMODE_EXP2
        this.scene.fogDensity = density
        break
    }

    console.log(`[EnvironmentSetup] Fog setup (${mode})`)
  }

  /**
   * Disable fog
   */
  disableFog(): void {
    this.scene.fogMode = Scene.FOGMODE_NONE
  }

  /**
   * Create reflection probe for realistic reflections
   */
  createReflectionProbe(
    position = this.scene.activeCamera?.position,
    size: number = 512
  ): ReflectionProbe | null {
    if (!position) return null

    this.reflectionProbe = new ReflectionProbe('reflectionProbe', size, this.scene)
    this.reflectionProbe.position = position

    console.log('[EnvironmentSetup] Reflection probe created')
    return this.reflectionProbe
  }

  /**
   * Add mesh to reflection probe
   */
  addToReflectionProbe(mesh: AbstractMesh): void {
    if (this.reflectionProbe) {
      this.reflectionProbe.renderList?.push(mesh)
    }
  }

  /**
   * Get glow layer
   */
  getGlowLayer(): GlowLayer | null {
    return this.glowLayer
  }

  /**
   * Get highlight layer
   */
  getHighlightLayer(): HighlightLayer | null {
    return this.highlightLayer
  }

  /**
   * Get skybox
   */
  getSkybox(): AbstractMesh | null {
    return this.skybox
  }

  /**
   * Get ground
   */
  getGround(): AbstractMesh | null {
    return this.ground
  }

  /**
   * Dispose all environment resources
   */
  dispose(): void {
    this.skybox?.dispose()
    this.ground?.dispose()
    this.glowLayer?.dispose()
    this.highlightLayer?.dispose()
    this.reflectionProbe?.dispose()

    console.log('[EnvironmentSetup] Disposed')
  }
}
