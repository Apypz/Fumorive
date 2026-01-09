import type { Scene, Engine, Camera, AbstractMesh } from '@babylonjs/core'

// Game Configuration Types
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

// Scene Types
export interface SceneContext {
  engine: Engine
  scene: Scene
  canvas: HTMLCanvasElement
  activeCamera: Camera | null
}

export interface GameScene {
  name: string
  init: (context: SceneContext) => Promise<void>
  update?: (deltaTime: number) => void
  dispose?: () => void
}

// Asset Types
export interface AssetLoadProgress {
  loaded: number
  total: number
  percentage: number
  currentAsset: string
}

export interface AssetManifest {
  meshes?: AssetEntry[]
  textures?: AssetEntry[]
  sounds?: AssetEntry[]
  environments?: AssetEntry[]
}

export interface AssetEntry {
  id: string
  url: string
  type: 'mesh' | 'texture' | 'sound' | 'environment' | 'hdri'
}

// Player/Entity Types
export interface TransformData {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
}

export interface EntityComponent {
  type: string
  data: Record<string, unknown>
}

export interface GameEntity {
  id: string
  name: string
  mesh?: AbstractMesh
  transform: TransformData
  components: EntityComponent[]
  tags: string[]
}

// Input Types
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

// Graphics Quality Presets
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
    postProcessing: true,
    antialiasing: true,
    hdr: true,
    ssao: true,
    bloom: true,
    motionBlur: true,
    chromaticAberration: true,
    vignette: true,
    fxaa: true,
    sharpen: true,
  },
}

export const DEFAULT_GRAPHICS_CONFIG: GraphicsConfig = GRAPHICS_PRESETS.high
