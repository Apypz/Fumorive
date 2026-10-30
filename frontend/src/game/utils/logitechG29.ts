/**
 * LogitechG29Wheel
 * ================
 * Profile for the Logitech G29 Driving Force (PS3 or PS4 position on the
 * wheel's mode switch). Unlike the Kaiju XR1 in X-Input mode, the browser
 * exposes the G29 as a non-standard DirectInput device: each pedal is its own
 * axis resting at +1 and travelling to -1 when pressed, and the buttons follow
 * the PlayStation layout. Calibration is stored under its own key, so the Kaiju
 * mapping in wheelConfig is never touched.
 *
 * Gamepad API layout (Chrome, Windows):
 *   AX0 wheel · AX1 clutch · AX2 gas · AX5 brake · AX9 D-pad hat
 *   BTN0 Cross · BTN4 right paddle · BTN5 left paddle
 */

import type { WheelMapping } from './wheelConfig'

const STORAGE_KEY = 'fumorive_wheel_mapping_g29_v1'

// USB product ids: c24f = PS3 mode, c260 = PS4 mode.
const PRODUCT_IDS = ['c24f', 'c260']

export class LogitechG29Wheel {
  static readonly NAME = 'Logitech G29'

  static readonly DEFAULT: WheelMapping = {
    gamepadIndex: null,
    steerAxis: 0,
    steerInvert: false,
    gas: { type: 'axis', index: 2, invert: false },
    brake: { type: 'axis', index: 5, invert: false },
  }

  static readonly CLUTCH_AXIS = 1
  static readonly SHIFT_UP_BUTTON = 4 // right paddle
  static readonly SHIFT_DOWN_BUTTON = 5 // left paddle
  static readonly HORN_BUTTON = 0 // Cross

  /** Chrome reports e.g. "G29 Driving Force Racing Wheel (Vendor: 046d Product: c24f)". */
  static matches(gp: Pick<Gamepad, 'id'>): boolean {
    const id = gp.id.toLowerCase()
    if (id.includes('g29')) return true
    return id.includes('046d') && PRODUCT_IDS.some((p) => id.includes(p))
  }

  private mapping: WheelMapping = LogitechG29Wheel.clone(LogitechG29Wheel.DEFAULT)

  constructor() {
    // Load persisted mapping, merging over the defaults so new fields keep a value.
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.mapping = LogitechG29Wheel.merge(this.mapping, JSON.parse(raw))
    } catch {
      /* localStorage unavailable / bad JSON — keep defaults */
    }
  }

  getMapping(): WheelMapping {
    return this.mapping
  }

  setMapping(patch: Partial<WheelMapping>): void {
    this.mapping = LogitechG29Wheel.merge(this.mapping, patch)
    this.persist()
  }

  resetMapping(): void {
    this.mapping = LogitechG29Wheel.clone(LogitechG29Wheel.DEFAULT)
    this.persist()
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.mapping))
    } catch {
      /* ignore */
    }
  }

  private static clone(m: WheelMapping): WheelMapping {
    return { ...m, gas: { ...m.gas }, brake: { ...m.brake } }
  }

  private static merge(base: WheelMapping, patch: Partial<WheelMapping>): WheelMapping {
    return {
      ...base,
      ...patch,
      gas: { ...base.gas, ...(patch.gas ?? {}) },
      brake: { ...base.brake, ...(patch.brake ?? {}) },
    }
  }
}

export const logitechG29 = new LogitechG29Wheel()
