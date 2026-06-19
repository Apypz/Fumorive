/**
 * wheelConfig
 * ===========
 * Runtime calibration for the racing wheel (Kaiju XR1). Different wheels expose
 * the steering on different Gamepad-API axis indices (it is NOT always axis 0),
 * and the direction can be reversed. Rather than hard-code it, the steering axis
 * and its direction are chosen at runtime via the on-screen wheel debug overlay
 * and persisted to localStorage so the choice survives reloads.
 */

const AXIS_KEY = 'fumorive_wheel_steer_axis'
const INVERT_KEY = 'fumorive_wheel_steer_invert'
const GAMEPAD_KEY = 'fumorive_wheel_gamepad_index'

function loadInt(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) {
      const n = parseInt(v, 10)
      if (!Number.isNaN(n)) return n
    }
  } catch {
    /* localStorage unavailable */
  }
  return fallback
}

let steerAxis = loadInt(AXIS_KEY, 0)
let steerInvert = loadInt(INVERT_KEY, 0) === 1
// Which gamepad index the game reads for the wheel. null = auto-detect (some
// wheels expose the steering and pedals as separate gamepad devices).
let gamepadIndex: number | null = loadInt(GAMEPAD_KEY, -1) < 0 ? null : loadInt(GAMEPAD_KEY, -1)

export function getWheelSteerAxis(): number {
  return steerAxis
}

export function setWheelSteerAxis(index: number): void {
  steerAxis = index
  try {
    localStorage.setItem(AXIS_KEY, String(index))
  } catch {
    /* ignore */
  }
}

export function getWheelSteerInvert(): boolean {
  return steerInvert
}

export function setWheelSteerInvert(value: boolean): void {
  steerInvert = value
  try {
    localStorage.setItem(INVERT_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function getWheelGamepadIndex(): number | null {
  return gamepadIndex
}

export function setWheelGamepadIndex(index: number | null): void {
  gamepadIndex = index
  try {
    if (index === null) localStorage.removeItem(GAMEPAD_KEY)
    else localStorage.setItem(GAMEPAD_KEY, String(index))
  } catch {
    /* ignore */
  }
}
