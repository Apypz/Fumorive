/**
 * Map Configuration
 * =================
 * Konfigurasi untuk map/level dalam game.
 */

import type { MapConfig, MapBounds, SpawnPoint } from '../types'

/**
 * Default Map Bounds
 * Batas area bermain dalam meters
 */
export const DEFAULT_MAP_BOUNDS: MapBounds = {
  minX: -200,
  maxX: 200,
  minZ: -300,
  maxZ: 200,
}

/**
 * Default Spawn Point
 * Posisi awal mobil saat game dimulai
 */
export const DEFAULT_SPAWN_POINT: SpawnPoint = {
  position: { x: 50, y: 0, z: 50 },
  rotation: Math.PI / 2,  // Facing direction in radians
}

/**
 * Bahlil City Map Configuration
 * Urban environment dengan banyak obstacle
 */
export const BAHLIL_CITY_CONFIG: MapConfig = {
  id: 'bahlil-city',
  name: 'Bahlil City',
  description: 'Kota urban dengan gedung-gedung, jalan raya, dan banyak obstacle.',
  
  bounds: DEFAULT_MAP_BOUNDS,
  
  spawn: {
    position: { x: 50, y: 0, z: 50 },
    rotation: Math.PI / 2,
  },
  
  // Environment settings
  environment: {
    groundColor: { r: 0.55, g: 0.65, b: 0.45 },  // Sage green
    skyColorTop: { r: 0.4, g: 0.6, b: 0.9 },     // Bright blue
    skyColorBottom: { r: 0.7, g: 0.8, b: 0.95 }, // Light horizon
    sunDirection: { x: -1, y: -2, z: -1 },
    sunIntensity: 3,
    ambientIntensity: 1.5,
  },
  
  // Map-specific settings
  settings: {
    hasLake: true,
    hasBuildings: true,
    treeCount: 'many',
    roadWidth: 16,
  },
}

/**
 * Iclik Park Map Configuration
 * Open park dengan sedikit obstacle
 */
export const ICLIK_PARK_CONFIG: MapConfig = {
  id: 'iclik-park',
  name: 'Iclik Park',
  description: 'Taman terbuka yang luas dengan sedikit obstacle. Sempurna untuk testing.',
  
  bounds: DEFAULT_MAP_BOUNDS,
  
  spawn: {
    position: { x: 0, y: 0, z: -50 },
    rotation: 0,  // Facing north
  },
  
  environment: {
    groundColor: { r: 0.35, g: 0.55, b: 0.25 },  // Bright green
    skyColorTop: { r: 0.4, g: 0.6, b: 0.9 },
    skyColorBottom: { r: 0.7, g: 0.8, b: 0.95 },
    sunDirection: { x: -1, y: -2, z: -1 },
    sunIntensity: 3,
    ambientIntensity: 1.5,
  },
  
  settings: {
    hasLake: false,
    hasBuildings: false,
    treeCount: 'few',
    roadWidth: 12,
    hasFountain: true,
    hasBenches: true,
    hasLamps: true,
  },
}

/**
 * All available maps
 */
export const MAP_CONFIGS = {
  'bahlil-city': BAHLIL_CITY_CONFIG,
  'iclik-park': ICLIK_PARK_CONFIG,
} as const

/**
 * Get map configuration by ID
 */
export function getMapConfig(mapId: string): MapConfig | undefined {
  return MAP_CONFIGS[mapId as keyof typeof MAP_CONFIGS]
}

/**
 * List of all available map IDs
 */
export const AVAILABLE_MAPS = Object.keys(MAP_CONFIGS) as Array<keyof typeof MAP_CONFIGS>
