import {
  Scene,
  AssetsManager,
  AbstractMesh,
  Texture,
  CubeTexture,
  Sound,
  HDRCubeTexture,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import type { AssetManifest, AssetLoadProgress } from '../types'

export type AssetType = 'mesh' | 'texture' | 'sound' | 'environment' | 'hdri'

export interface LoadedAssets {
  meshes: Map<string, AbstractMesh[]>
  textures: Map<string, Texture>
  sounds: Map<string, Sound>
  environments: Map<string, CubeTexture | HDRCubeTexture>
}

export class AssetManager {
  private scene: Scene
  private assetsManager: AssetsManager
  private loadedAssets: LoadedAssets = {
    meshes: new Map(),
    textures: new Map(),
    sounds: new Map(),
    environments: new Map(),
  }

  private onProgressCallback?: (progress: AssetLoadProgress) => void
  private totalAssets = 0
  private loadedCount = 0

  constructor(scene: Scene) {
    this.scene = scene
    this.assetsManager = new AssetsManager(scene)

    // Configure assets manager
    this.assetsManager.useDefaultLoadingScreen = false

    console.log('[AssetManager] Initialized')
  }

  /**
   * Set progress callback
   */
  onProgress(callback: (progress: AssetLoadProgress) => void): void {
    this.onProgressCallback = callback
  }

  /**
   * Load assets from manifest
   */
  async loadManifest(manifest: AssetManifest): Promise<LoadedAssets> {
    this.loadedCount = 0
    this.totalAssets = 0

    // Count total assets
    if (manifest.meshes) this.totalAssets += manifest.meshes.length
    if (manifest.textures) this.totalAssets += manifest.textures.length
    if (manifest.sounds) this.totalAssets += manifest.sounds.length
    if (manifest.environments) this.totalAssets += manifest.environments.length

    // Queue all assets
    manifest.meshes?.forEach((entry) => this.queueMesh(entry.id, entry.url))
    manifest.textures?.forEach((entry) => this.queueTexture(entry.id, entry.url))
    manifest.sounds?.forEach((entry) => this.queueSound(entry.id, entry.url))
    manifest.environments?.forEach((entry) => {
      if (entry.type === 'hdri') {
        this.queueHDRI(entry.id, entry.url)
      } else {
        this.queueEnvironment(entry.id, entry.url)
      }
    })

    // Load all assets
    return this.load()
  }

  /**
   * Queue a mesh for loading
   */
  queueMesh(id: string, url: string): void {
    const task = this.assetsManager.addMeshTask(id, '', '', url)

    task.onSuccess = (task) => {
      this.loadedAssets.meshes.set(id, task.loadedMeshes)
      this.updateProgress(id)
      console.log(`[AssetManager] Loaded mesh: ${id}`)
    }

    task.onError = (_task, message) => {
      console.error(`[AssetManager] Failed to load mesh ${id}:`, message)
      this.updateProgress(id)
    }
  }

  /**
   * Queue a texture for loading
   */
  queueTexture(id: string, url: string): void {
    const task = this.assetsManager.addTextureTask(id, url)

    task.onSuccess = (task) => {
      this.loadedAssets.textures.set(id, task.texture)
      this.updateProgress(id)
      console.log(`[AssetManager] Loaded texture: ${id}`)
    }

    task.onError = (_task, message) => {
      console.error(`[AssetManager] Failed to load texture ${id}:`, message)
      this.updateProgress(id)
    }
  }

  /**
   * Queue a cube texture (environment) for loading
   */
  queueEnvironment(id: string, url: string): void {
    const task = this.assetsManager.addCubeTextureTask(id, url)

    task.onSuccess = (task) => {
      this.loadedAssets.environments.set(id, task.texture)
      this.updateProgress(id)
      console.log(`[AssetManager] Loaded environment: ${id}`)
    }

    task.onError = (_task, message) => {
      console.error(`[AssetManager] Failed to load environment ${id}:`, message)
      this.updateProgress(id)
    }
  }

  /**
   * Queue an HDR environment for loading
   */
  queueHDRI(id: string, url: string): void {
    const task = this.assetsManager.addHDRCubeTextureTask(id, url, 512)

    task.onSuccess = (task) => {
      this.loadedAssets.environments.set(id, task.texture)
      this.updateProgress(id)
      console.log(`[AssetManager] Loaded HDRI: ${id}`)
    }

    task.onError = (_task, message) => {
      console.error(`[AssetManager] Failed to load HDRI ${id}:`, message)
      this.updateProgress(id)
    }
  }

  /**
   * Queue a sound for loading
   */
  queueSound(id: string, url: string): void {
    const task = this.assetsManager.addBinaryFileTask(id, url)

    task.onSuccess = (task) => {
      const sound = new Sound(id, task.data, this.scene, null, {
        autoplay: false,
      })
      this.loadedAssets.sounds.set(id, sound)
      this.updateProgress(id)
      console.log(`[AssetManager] Loaded sound: ${id}`)
    }

    task.onError = (_task, message) => {
      console.error(`[AssetManager] Failed to load sound ${id}:`, message)
      this.updateProgress(id)
    }
  }

  /**
   * Load all queued assets
   */
  async load(): Promise<LoadedAssets> {
    return new Promise((resolve, reject) => {
      this.assetsManager.onFinish = () => {
        console.log('[AssetManager] All assets loaded')
        resolve(this.loadedAssets)
      }

      this.assetsManager.onTaskError = (task) => {
        console.error(`[AssetManager] Task error: ${task.name}`)
      }

      this.assetsManager.load()
    })
  }

  /**
   * Update progress
   */
  private updateProgress(currentAsset: string): void {
    this.loadedCount++

    if (this.onProgressCallback) {
      this.onProgressCallback({
        loaded: this.loadedCount,
        total: this.totalAssets,
        percentage: (this.loadedCount / this.totalAssets) * 100,
        currentAsset,
      })
    }
  }

  /**
   * Get loaded mesh by ID
   */
  getMesh(id: string): AbstractMesh[] | undefined {
    return this.loadedAssets.meshes.get(id)
  }

  /**
   * Get loaded texture by ID
   */
  getTexture(id: string): Texture | undefined {
    return this.loadedAssets.textures.get(id)
  }

  /**
   * Get loaded sound by ID
   */
  getSound(id: string): Sound | undefined {
    return this.loadedAssets.sounds.get(id)
  }

  /**
   * Get loaded environment by ID
   */
  getEnvironment(id: string): CubeTexture | HDRCubeTexture | undefined {
    return this.loadedAssets.environments.get(id)
  }

  /**
   * Get all loaded assets
   */
  getAllAssets(): LoadedAssets {
    return this.loadedAssets
  }

  /**
   * Clear all loaded assets
   */
  clear(): void {
    this.loadedAssets.meshes.forEach((meshes) => {
      meshes.forEach((mesh) => mesh.dispose())
    })
    this.loadedAssets.textures.forEach((texture) => texture.dispose())
    this.loadedAssets.sounds.forEach((sound) => sound.dispose())
    this.loadedAssets.environments.forEach((env) => env.dispose())

    this.loadedAssets = {
      meshes: new Map(),
      textures: new Map(),
      sounds: new Map(),
      environments: new Map(),
    }

    console.log('[AssetManager] Assets cleared')
  }

  /**
   * Reset the assets manager for new loading
   */
  reset(): void {
    this.assetsManager.reset()
    this.loadedCount = 0
    this.totalAssets = 0
  }
}
