import {
  Engine,
  Scene,
  Color4,
  SceneOptimizer,
  SceneOptimizerOptions,
  HardwareScalingOptimization,
} from '@babylonjs/core'
import type { GameConfig, SceneContext, GraphicsConfig } from '../types'
import { DEFAULT_GRAPHICS_CONFIG } from '../types'

export class GameEngine {
  private engine: Engine
  private scene: Scene | null = null
  private canvas: HTMLCanvasElement
  private graphicsConfig: GraphicsConfig
  private renderLoop: (() => void) | null = null
  private isRunning = false
  private lastFrameTime = 0
  private deltaTime = 0

  constructor(config: GameConfig) {
    this.canvas = config.canvas
    this.graphicsConfig = config.graphics ?? DEFAULT_GRAPHICS_CONFIG

    // Create the Babylon.js engine with optimal settings for high quality
    this.engine = new Engine(config.canvas, config.antialias ?? true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
      failIfMajorPerformanceCaveat: false,
      adaptToDeviceRatio: true,
      antialias: true,
      powerPreference: 'high-performance',
      ...config.engineOptions,
    })

    // Set hardware scaling to 1 for best quality (no downscaling)
    this.engine.setHardwareScalingLevel(1)

    // Handle window resize
    window.addEventListener('resize', this.handleResize)

    console.log('[GameEngine] Engine initialized')
    console.log(`[GameEngine] WebGL version: ${this.engine.webGLVersion}`)
    console.log(`[GameEngine] Hardware scaling: ${this.engine.getHardwareScalingLevel()}`)
  }

  /**
   * Create a new scene with optimized settings
   */
  createScene(): Scene {
    if (this.scene) {
      this.scene.dispose()
    }

    this.scene = new Scene(this.engine, {
      useClonedMeshMap: true,
      useGeometryIdsMap: true,
      useMaterialMeshMap: true,
    })

    // Set clear color (slightly dark for better contrast)
    this.scene.clearColor = new Color4(0.02, 0.02, 0.05, 1)

    // Enable performance optimizations
    this.scene.autoClear = false
    this.scene.autoClearDepthAndStencil = true
    this.scene.blockMaterialDirtyMechanism = false

    // Enable frustum culling and occlusion queries
    this.scene.skipFrustumClipping = false

    // Freeze materials when possible for better performance
    this.scene.blockfreeActiveMeshesAndRenderingGroups = false

    console.log('[GameEngine] Scene created')
    return this.scene
  }

  /**
   * Get the current scene context
   */
  getContext(): SceneContext {
    if (!this.scene) {
      throw new Error('Scene not created. Call createScene() first.')
    }

    return {
      engine: this.engine,
      scene: this.scene,
      canvas: this.canvas,
      activeCamera: this.scene.activeCamera,
    }
  }

  /**
   * Start the render loop
   */
  start(onUpdate?: (deltaTime: number) => void): void {
    if (this.isRunning) return

    this.isRunning = true
    this.lastFrameTime = performance.now()

    this.renderLoop = () => {
      const currentTime = performance.now()
      this.deltaTime = (currentTime - this.lastFrameTime) / 1000
      this.lastFrameTime = currentTime

      // Call update callback
      if (onUpdate) {
        onUpdate(this.deltaTime)
      }

      // Render the scene
      if (this.scene && this.scene.activeCamera) {
        this.scene.render()
      }
    }

    this.engine.runRenderLoop(this.renderLoop)
    console.log('[GameEngine] Render loop started')
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.engine.stopRenderLoop(this.renderLoop ?? undefined)
    this.renderLoop = null
    console.log('[GameEngine] Render loop stopped')
  }

  /**
   * Enable automatic scene optimization
   */
  enableOptimizer(targetFPS = 60): void {
    if (!this.scene) return

    const options = new SceneOptimizerOptions(targetFPS, 2000)

    // Add optimizations in order of impact
    options.addOptimization(new HardwareScalingOptimization(0, 1))
    options.addOptimization(new HardwareScalingOptimization(1, 1.5))
    options.addOptimization(new HardwareScalingOptimization(2, 2))

    SceneOptimizer.OptimizeAsync(this.scene, options, () => {
      console.log('[GameEngine] Scene optimizer: Target FPS reached')
    }, () => {
      console.log('[GameEngine] Scene optimizer: Unable to reach target FPS')
    })
  }

  /**
   * Handle window resize
   */
  private handleResize = (): void => {
    this.engine.resize()
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.engine.getFps()
  }

  /**
   * Get delta time in seconds
   */
  getDeltaTime(): number {
    return this.deltaTime
  }

  /**
   * Get graphics configuration
   */
  getGraphicsConfig(): GraphicsConfig {
    return { ...this.graphicsConfig }
  }

  /**
   * Update graphics configuration
   */
  setGraphicsConfig(config: Partial<GraphicsConfig>): void {
    this.graphicsConfig = { ...this.graphicsConfig, ...config }
  }

  /**
   * Check if engine is running
   */
  getIsRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get the Babylon.js engine instance
   */
  getEngine(): Engine {
    return this.engine
  }

  /**
   * Get the current scene
   */
  getScene(): Scene | null {
    return this.scene
  }

  /**
   * Show the inspector for debugging (development only)
   */
  async showInspector(): Promise<void> {
    if (!this.scene) return

    try {
      await import('@babylonjs/inspector')
      this.scene.debugLayer.show({
        embedMode: true,
        overlay: true,
      })
    } catch (error) {
      console.warn('[GameEngine] Inspector not available:', error)
    }
  }

  /**
   * Hide the inspector
   */
  hideInspector(): void {
    if (this.scene) {
      this.scene.debugLayer.hide()
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)

    if (this.scene) {
      this.scene.dispose()
      this.scene = null
    }

    this.engine.dispose()
    console.log('[GameEngine] Engine disposed')
  }
}
