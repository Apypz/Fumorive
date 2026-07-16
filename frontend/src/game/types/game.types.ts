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
  shadowQuality: 'low' | 'medium' | 'high'
  /** Hardware-scaling multiplier (≥1). >1 renders at a lower internal resolution for performance. */
  renderScale: number
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

  // --- Vehicle controller fields ---
  /** Nilai axis gas dari gamepad [0.0–1.0]. Keyboard forward = 1.0 jika ditekan. */
  throttleAxis: number
  /** Nilai axis rem dari gamepad [0.0–1.0]. Keyboard brake = 1.0 jika ditekan. */
  brakeAxis: number
  /** Naik gigi: Button 4 gamepad atau KeyE */
  gearUp: boolean
  /** Turun gigi: Button 5 gamepad atau KeyQ */
  gearDown: boolean
  /** Toggle handbrake: Button 1 gamepad atau tombol terkonfigurasi */
  handbrakeToggle: boolean
  /** Toggle engine: Button 2 gamepad atau tombol terkonfigurasi */
  engineToggle: boolean
}

// ============================================
// VEHICLE
// ============================================

/**
 * Urutan posisi gigi kendaraan: R → N → 1 → 2 → 3 → 4 → 5 → 6.
 * Naik gigi bergerak ke kanan, turun gigi bergerak ke kiri.
 */
export const GEAR_SEQUENCE = ['R', 'N', '1', '2', '3', '4', '5', '6'] as const

/**
 * Tipe union dari semua posisi gigi yang valid.
 */
export type GearPosition = typeof GEAR_SEQUENCE[number]

/**
 * Tabel batas kecepatan maksimum (unit/s) per posisi gigi.
 * Requirement 4.1
 */
export const GEAR_SPEED_CAPS: Record<GearPosition, number> = {
  R:   10,
  N:   0,
  '1': 29,
  '2': 50,
  '3': 75,
  '4': 100,
  '5': 130,
  '6': 160,
}

/**
 * Payload event yang dipancarkan VehicleController saat gigi berubah.
 */
export interface GearChangedPayload {
  gear: GearPosition
}

/**
 * Payload event yang dipancarkan VehicleController saat status handbrake berubah.
 */
export interface HandbrakeChangedPayload {
  active: boolean
}

/**
 * Payload event yang dipancarkan VehicleController saat status mesin berubah.
 */
export interface EngineStateChangedPayload {
  running: boolean
}

/**
 * Snapshot state internal kendaraan — digunakan untuk UI subscriber dan debugging.
 */
export interface VehicleState {
  currentGear: GearPosition
  engineRunning: boolean
  handbrakeActive: boolean
  speed: number
  brakeDepth: number
}

// ============================================
// GRAPHICS PRESETS
// ============================================

/**
 * Graphics quality presets. Only three tiers are exposed to the player; the
 * individual effect flags are managed automatically by each preset and are not
 * user-editable anymore.
 */
export type GraphicsQuality = 'low' | 'medium' | 'high'

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsConfig> = {
  // Lightest possible: no real-time shadows, no post-processing, and the scene
  // renders at a lower internal resolution. Aimed at weak hardware.
  low: {
    shadowQuality: 'low',
    renderScale: 1.4,
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
  // Balanced: standard blurred shadows plus light post-processing.
  medium: {
    shadowQuality: 'medium',
    renderScale: 1.0,
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
  // Best looking: high-res cascaded shadows and the full post-processing stack.
  high: {
    shadowQuality: 'high',
    renderScale: 1.0,
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
}

/**
 * Default graphics configuration — best-looking tier by default.
 */
export const DEFAULT_GRAPHICS_CONFIG: GraphicsConfig = GRAPHICS_PRESETS.high
