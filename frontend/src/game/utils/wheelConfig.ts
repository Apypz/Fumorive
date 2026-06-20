/**
 * wheelConfig
 * ===========
 * Per-mode calibration for the racing wheel (Kaiju XR1). The wheel can run in
 * two USB modes that expose very different Gamepad-API layouts:
 *   - 'xinput' → pedals on the analog triggers (buttons), steering on a stick axis
 *   - 'dinput' → pedals on separate axes, steering on an axis
 * Each mode keeps its own steering axis + pedal sources so both can be calibrated
 * independently (via the wheel overlay) and switched with the C key. Persisted to
 * localStorage.
 */

export type WheelMode = 'dinput' | 'xinput'
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

const STORAGE_KEY = 'fumorive_wheel_mappings_v1'

const DEFAULTS: Record<WheelMode, WheelMapping> = {
  xinput: {
    gamepadIndex: null,
    steerAxis: 0,
    steerInvert: false,
    gas: { type: 'button', index: 7, invert: false }, // RT
    brake: { type: 'button', index: 6, invert: false }, // LT
  },
  dinput: {
    gamepadIndex: null,
    steerAxis: 0,
    steerInvert: false,
    gas: { type: 'axis', index: 1, invert: false },
    brake: { type: 'axis', index: 2, invert: false },
  },
}

function clone(m: WheelMapping): WheelMapping {
  return { ...m, gas: { ...m.gas }, brake: { ...m.brake } }
}

const mappings: Record<WheelMode, WheelMapping> = {
  xinput: clone(DEFAULTS.xinput),
  dinput: clone(DEFAULTS.dinput),
}

// Load persisted mappings, merging over the defaults so new fields keep a value.
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<Record<WheelMode, Partial<WheelMapping>>>
    for (const mode of ['xinput', 'dinput'] as WheelMode[]) {
      const p = parsed[mode]
      if (p) {
        mappings[mode] = {
          ...mappings[mode],
          ...p,
          gas: { ...mappings[mode].gas, ...(p.gas ?? {}) },
          brake: { ...mappings[mode].brake, ...(p.brake ?? {}) },
        }
      }
    }
  }
} catch {
  /* localStorage unavailable / bad JSON — keep defaults */
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
  } catch {
    /* ignore */
  }
}

export function getWheelMapping(mode: WheelMode): WheelMapping {
  return mappings[mode]
}

export function setWheelMapping(mode: WheelMode, patch: Partial<WheelMapping>): void {
  mappings[mode] = {
    ...mappings[mode],
    ...patch,
    gas: { ...mappings[mode].gas, ...(patch.gas ?? {}) },
    brake: { ...mappings[mode].brake, ...(patch.brake ?? {}) },
  }
  persist()
}

/**
 * Read a pedal as 0..1 from its configured source. Buttons report 0..1 directly;
 * axes rest at -1 (released) and are remapped to 0..1. `invert` flips direction.
 */
export function readPedalValue(
  axes: readonly number[],
  buttons: readonly { value: number }[],
  src: PedalSource
): number {
  let v: number
  if (src.type === 'button') {
    v = buttons[src.index]?.value ?? 0
  } else {
    const raw = axes[src.index] ?? -1
    v = (raw + 1) / 2
  }
  if (src.invert) v = 1 - v
  return Math.max(0, Math.min(1, v))
}
