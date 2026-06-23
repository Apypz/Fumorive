/**
 * wheelConfig
 * ===========
 * Calibration for the racing wheel (Kaiju XR1) in X-Input mode. The steering
 * axis and the gas/brake pedal sources are calibrated via the wheel overlay and
 * persisted to localStorage. Defaults follow the standard X-Input layout: pedals
 * on the analog triggers (gas = button 7 / RT, brake = button 6 / LT), steering
 * on axis 0.
 */

export type SourceType = 'axis' | 'button'

export interface PedalSource {
  type: SourceType
  index: number
  invert: boolean
}

export interface WheelMapping {
  gamepadIndex: number | null // which connected device; null = auto-detect
  steerAxis: number
  steerInvert: boolean
  gas: PedalSource
  brake: PedalSource
}

const STORAGE_KEY = 'fumorive_wheel_mapping_v3'

const DEFAULT: WheelMapping = {
  gamepadIndex: null,
  steerAxis: 0,
  steerInvert: false,
  gas: { type: 'button', index: 7, invert: false }, // RT
  brake: { type: 'button', index: 6, invert: false }, // LT
}

function clone(m: WheelMapping): WheelMapping {
  return { ...m, gas: { ...m.gas }, brake: { ...m.brake } }
}

let mapping: WheelMapping = clone(DEFAULT)

// Load persisted mapping, merging over the defaults so new fields keep a value.
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const p = JSON.parse(raw) as Partial<WheelMapping>
    mapping = {
      ...mapping,
      ...p,
      gas: { ...mapping.gas, ...(p.gas ?? {}) },
      brake: { ...mapping.brake, ...(p.brake ?? {}) },
    }
  }
} catch {
  /* localStorage unavailable / bad JSON — keep defaults */
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping))
  } catch {
    /* ignore */
  }
}

export function getWheelMapping(): WheelMapping {
  return mapping
}

export function setWheelMapping(patch: Partial<WheelMapping>): void {
  mapping = {
    ...mapping,
    ...patch,
    gas: { ...mapping.gas, ...(patch.gas ?? {}) },
    brake: { ...mapping.brake, ...(patch.brake ?? {}) },
  }
  persist()
}

export function resetWheelMapping(): void {
  mapping = clone(DEFAULT)
  persist()
}
