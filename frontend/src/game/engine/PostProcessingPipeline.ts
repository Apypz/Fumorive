import {
  Scene,
  Camera,
  DefaultRenderingPipeline,
  SSAORenderingPipeline,
  MotionBlurPostProcess,
  ImageProcessingConfiguration,
  Color4,
  ColorCurves,
} from '@babylonjs/core'
import type { GraphicsConfig } from '../types'

export interface PostProcessingOptions {
  scene: Scene
  camera: Camera
  config: GraphicsConfig
}

export class PostProcessingPipeline {
  private scene: Scene
  private camera: Camera
  private config: GraphicsConfig

  private defaultPipeline: DefaultRenderingPipeline | null = null
  private ssaoPipeline: SSAORenderingPipeline | null = null
  private motionBlur: MotionBlurPostProcess | null = null

  constructor(options: PostProcessingOptions) {
    this.scene = options.scene
    this.camera = options.camera
    this.config = options.config

    this.setup()
  }

  private setup(): void {
    if (!this.config.postProcessing) {
      console.log('[PostProcessing] Post-processing disabled')
      return
    }

    // Setup Default Rendering Pipeline (handles most effects)
    this.setupDefaultPipeline()

    // Setup SSAO (Screen Space Ambient Occlusion)
    if (this.config.ssao) {
      this.setupSSAO()
    }

    // Setup Motion Blur
    if (this.config.motionBlur) {
      this.setupMotionBlur()
    }

    // Setup Image Processing
    this.setupImageProcessing()

    console.log('[PostProcessing] Pipeline setup complete')
  }

  private setupDefaultPipeline(): void {
    this.defaultPipeline = new DefaultRenderingPipeline(
      'defaultPipeline',
      this.config.hdr,
      this.scene,
      [this.camera]
    )

    // Anti-aliasing (FXAA)
    this.defaultPipeline.fxaaEnabled = this.config.fxaa

    // Bloom effect
    this.defaultPipeline.bloomEnabled = this.config.bloom
    if (this.config.bloom) {
      this.defaultPipeline.bloomThreshold = 0.8
      this.defaultPipeline.bloomWeight = 0.3
      this.defaultPipeline.bloomKernel = 64
      this.defaultPipeline.bloomScale = 0.5
    }

    // Chromatic Aberration
    this.defaultPipeline.chromaticAberrationEnabled = this.config.chromaticAberration
    if (this.config.chromaticAberration) {
      this.defaultPipeline.chromaticAberration.aberrationAmount = 30
      this.defaultPipeline.chromaticAberration.radialIntensity = 1
    }

    // Vignette
    this.defaultPipeline.imageProcessing.vignetteEnabled = this.config.vignette
    if (this.config.vignette) {
      this.defaultPipeline.imageProcessing.vignetteWeight = 2
      this.defaultPipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 1)
      this.defaultPipeline.imageProcessing.vignetteStretch = 1
    }

    // Sharpen
    this.defaultPipeline.sharpenEnabled = this.config.sharpen
    if (this.config.sharpen) {
      this.defaultPipeline.sharpen.edgeAmount = 0.3
      this.defaultPipeline.sharpen.colorAmount = 1
    }

    // Depth of Field (optional - can be enabled per scene)
    this.defaultPipeline.depthOfFieldEnabled = false

    // Grain (subtle)
    this.defaultPipeline.grainEnabled = false

    console.log('[PostProcessing] Default pipeline configured')
  }

  private setupSSAO(): void {
    const ssaoRatio = {
      ssaoRatio: 0.5,
      combineRatio: 1.0,
    }

    this.ssaoPipeline = new SSAORenderingPipeline(
      'ssao',
      this.scene,
      ssaoRatio,
      [this.camera]
    )

    // Configure SSAO
    this.ssaoPipeline.fallOff = 0.000001
    this.ssaoPipeline.area = 0.0075
    this.ssaoPipeline.radius = 0.0001
    this.ssaoPipeline.totalStrength = 1.5
    this.ssaoPipeline.base = 0.5

    console.log('[PostProcessing] SSAO configured')
  }

  private setupMotionBlur(): void {
    this.motionBlur = new MotionBlurPostProcess(
      'motionBlur',
      this.scene,
      1.0,
      this.camera
    )

    this.motionBlur.motionStrength = 0.5
    this.motionBlur.motionBlurSamples = 16

    console.log('[PostProcessing] Motion blur configured')
  }

  private setupImageProcessing(): void {
    // Configure scene-wide image processing
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
    this.scene.imageProcessingConfiguration.exposure = 1.0
    this.scene.imageProcessingConfiguration.contrast = 1.1

    // Color curves for cinematic look
    const colorCurves = new ColorCurves()
    colorCurves.globalSaturation = 10
    colorCurves.highlightsSaturation = 10
    colorCurves.shadowsSaturation = 5

    this.scene.imageProcessingConfiguration.colorCurvesEnabled = true
    this.scene.imageProcessingConfiguration.colorCurves = colorCurves

    console.log('[PostProcessing] Image processing configured')
  }

  /**
   * Enable/disable bloom effect
   */
  setBloomEnabled(enabled: boolean): void {
    if (this.defaultPipeline) {
      this.defaultPipeline.bloomEnabled = enabled
    }
  }

  /**
   * Set bloom intensity
   */
  setBloomIntensity(weight: number, threshold: number = 0.8): void {
    if (this.defaultPipeline && this.defaultPipeline.bloomEnabled) {
      this.defaultPipeline.bloomWeight = weight
      this.defaultPipeline.bloomThreshold = threshold
    }
  }

  /**
   * Enable/disable depth of field
   */
  setDepthOfFieldEnabled(enabled: boolean, focusDistance: number = 10): void {
    if (this.defaultPipeline) {
      this.defaultPipeline.depthOfFieldEnabled = enabled
      if (enabled) {
        this.defaultPipeline.depthOfField.focusDistance = focusDistance * 1000
        this.defaultPipeline.depthOfField.focalLength = 50
        this.defaultPipeline.depthOfField.fStop = 1.4
      }
    }
  }

  /**
   * Set exposure
   */
  setExposure(value: number): void {
    this.scene.imageProcessingConfiguration.exposure = value
  }

  /**
   * Set contrast
   */
  setContrast(value: number): void {
    this.scene.imageProcessingConfiguration.contrast = value
  }

  /**
   * Enable grain effect
   */
  setGrainEnabled(enabled: boolean, intensity: number = 10): void {
    if (this.defaultPipeline) {
      this.defaultPipeline.grainEnabled = enabled
      if (enabled) {
        this.defaultPipeline.grain.intensity = intensity
        this.defaultPipeline.grain.animated = true
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GraphicsConfig>): void {
    this.config = { ...this.config, ...config }

    // Re-apply settings
    if (this.defaultPipeline) {
      this.defaultPipeline.fxaaEnabled = this.config.fxaa
      this.defaultPipeline.bloomEnabled = this.config.bloom
      this.defaultPipeline.chromaticAberrationEnabled = this.config.chromaticAberration
      this.defaultPipeline.sharpenEnabled = this.config.sharpen
      this.defaultPipeline.imageProcessing.vignetteEnabled = this.config.vignette
    }

    // Toggle SSAO
    if (this.ssaoPipeline) {
      if (!this.config.ssao) {
        this.ssaoPipeline.dispose()
        this.ssaoPipeline = null
      }
    } else if (this.config.ssao) {
      this.setupSSAO()
    }

    // Toggle Motion Blur
    if (this.motionBlur) {
      if (!this.config.motionBlur) {
        this.motionBlur.dispose()
        this.motionBlur = null
      }
    } else if (this.config.motionBlur) {
      this.setupMotionBlur()
    }
  }

  /**
   * Dispose all post-processing effects
   */
  dispose(): void {
    if (this.defaultPipeline) {
      this.defaultPipeline.dispose()
      this.defaultPipeline = null
    }

    if (this.ssaoPipeline) {
      this.ssaoPipeline.dispose()
      this.ssaoPipeline = null
    }

    if (this.motionBlur) {
      this.motionBlur.dispose()
      this.motionBlur = null
    }

    console.log('[PostProcessing] Pipeline disposed')
  }
}
