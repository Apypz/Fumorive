/**
 * Game Core Types
 * ================
 * Type definitions untuk game engine, scene, assets, dan entities.
 */

import type { Scene, Engine, Camera, AbstractMesh } from '@babylonjs/core'

// ============================================
// GAME CONFIGURATION
// ============================================

/**
 * Game initialization configuration
 */
export interface GameConfig {
  canvas: HTMLCanvasElement
  antialias?: boolean
  engineOptions?: {
    preserveDrawingBuffer?: boolean
    stencil?: boolean
    disableWebGL2Support?: boolean
    failIfMajorPerformanceCaveat?: boolean
    adaptToDeviceRatio?: boolean
  }
  sceneOptions?: {
    useClonedMeshMap?: boolean
    useGeometryIdsMap?: boolean
    useMaterialMeshMap?: boolean
  }
  graphics?: GraphicsConfig
}

/**
 * Graphics quality configuration
 */
export interface GraphicsConfig {
  shadowQuality: 'low' | 'medium' | 'high' | 'ultra'
  postProcessing: boolean
  antialiasing: boolean
  hdr: boolean
  ssao: boolean
  bloom: boolean
  motionBlur: boolean
  chromaticAberration: boolean
  vignette: boolean
  fxaa: boolean
  sharpen: boolean
}

// ============================================
// SCENE
// ============================================

/**
 * Context passed to scene initialization
 */
export interface SceneContext {
  engine: Engine
  scene: Scene
  canvas: HTMLCanvasElement
  activeCamera: Camera | null
}

/**
 * Interface for game scenes
 */
export interface GameScene {
  name: string
  init: (context: SceneContext) => Promise<void>
  update?: (deltaTime: number) => void
  dispose?: () => void
}

// ============================================
// ASSETS
// ============================================

/**
 * Asset loading progress
 */
export interface AssetLoadProgress {
  loaded: number
  total: number
  percentage: number
  currentAsset: string
}

/**
 * Asset manifest for preloading
 */
export interface AssetManifest {
  meshes?: AssetEntry[]
  textures?: AssetEntry[]
  sounds?: AssetEntry[]
  environments?: AssetEntry[]
}

/**
 * Single asset entry
 */
export interface AssetEntry {
  id: string
  url: string
  type: 'mesh' | 'texture' | 'sound' | 'environment' | 'hdri'
}

// ============================================
// ENTITIES
// ============================================

/**
 * Transform data (position, rotation, scale)
 */
export interface TransformData {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
}

/**
 * Entity component
 */
export interface EntityComponent {
  type: string
  data: Record<string, unknown>
}

/**
 * Game entity
 */
export interface GameEntity {
  id: string
  name: string
  mesh?: AbstractMesh
  transform: TransformData
  components: EntityComponent[]
  tags: string[]
}

// ============================================
// INPUT
// ============================================

/**
 * General input state
 */
export interface InputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  sprint: boolean
  interact: boolean
  mouseX: number
  mouseY: number
  mouseDeltaX: number
  mouseDeltaY: number
}

// ============================================
// GRAPHICS PRESETS
// ============================================

/**
 * Graphics quality presets
 */
export const GRAPHICS_PRESETS: Record<string, GraphicsConfig> = {
  low: {
    shadowQuality: 'low',
    postProcessing: false,
    antialiasing: false,
    hdr: false,
    ssao: false,
    bloom: false,
    motionBlur: false,
    chromaticAberration: false,
    vignette: false,
    fxaa: false,
    sharpen: false,
  },
  medium: {
    shadowQuality: 'medium',
    postProcessing: true,
    antialiasing: true,
    hdr: false,
    ssao: false,
    bloom: true,
    motionBlur: false,
    chromaticAberration: false,
    vignette: true,
    fxaa: true,
    sharpen: false,
  },
  high: {
    shadowQuality: 'high',
    postProcessing: true,
    antialiasing: true,
    hdr: true,
    ssao: true,
    bloom: true,
    motionBlur: false,
    chromaticAberration: true,
    vignette: true,
    fxaa: true,
    sharpen: true,
  },
  ultra: {
    shadowQuality: 'ultra',
    postProcessing: false,
    antialiasing: true,
    hdr: false,
    ssao: false,
    bloom: false,
    motionBlur: false,
    chromaticAberration: false,
    vignette: false,
    fxaa: true,
    sharpen: false,
  },
}

/**
 * Default graphics configuration
 */
export const DEFAULT_GRAPHICS_CONFIG: GraphicsConfig = GRAPHICS_PRESETS.ultra
