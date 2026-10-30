/**
 * wheelProfiles
 * =============
 * Picks the controller profile for the connected racing wheel. Each profile
 * owns its own calibration and button layout, so switching between a Kaiju XR1
 * and a Logitech G29 never overwrites the other's settings. The Kaiju profile
 * is a thin wrapper over the original wheelConfig mapping and is the catch-all
 * for any device that no other profile claims.
 */

import { getWheelMapping, setWheelMapping, resetWheelMapping, type WheelMapping } from './wheelConfig'
import { LogitechG29Wheel, logitechG29 } from './logitechG29'
import { getActiveGamepad } from './gamepadRegistry'

export interface WheelButtons {
  shiftUp: number
  shiftDown: number
  horn: number
}

export interface WheelProfile {
  id: 'kaiju-xr1' | 'logitech-g29'
  name: string
  matches(gp: Pick<Gamepad, 'id'>): boolean
  getMapping(): WheelMapping
  setMapping(patch: Partial<WheelMapping>): void
  resetMapping(): void
  buttons: WheelButtons
}

const G29_PROFILE: WheelProfile = {
  id: 'logitech-g29',
  name: LogitechG29Wheel.NAME,
  matches: (gp) => LogitechG29Wheel.matches(gp),
  getMapping: () => logitechG29.getMapping(),
  setMapping: (patch) => logitechG29.setMapping(patch),
  resetMapping: () => logitechG29.resetMapping(),
  buttons: {
    shiftUp: LogitechG29Wheel.SHIFT_UP_BUTTON,
    shiftDown: LogitechG29Wheel.SHIFT_DOWN_BUTTON,
    horn: LogitechG29Wheel.HORN_BUTTON,
  },
}

// Kaiju XR1 (X-Input) — the original wheelConfig mapping and button layout.
const KAIJU_PROFILE: WheelProfile = {
  id: 'kaiju-xr1',
  name: 'Kaiju XR1 (X-Input)',
  matches: () => true,
  getMapping: getWheelMapping,
  setMapping: setWheelMapping,
  resetMapping: resetWheelMapping,
  buttons: {
    shiftUp: 5, // RB / right paddle
    shiftDown: 4, // LB / left paddle
    horn: 0, // A
  },
}

// Most specific first; Kaiju is the catch-all.
const PROFILES: WheelProfile[] = [G29_PROFILE, KAIJU_PROFILE]

export function profileFor(gp: Pick<Gamepad, 'id'>): WheelProfile {
  return PROFILES.find((p) => p.matches(gp)) ?? KAIJU_PROFILE
}

export interface ActiveWheel {
  gp: Gamepad
  profile: WheelProfile
  mapping: WheelMapping
}

/**
 * The wheel the game should read: a device picked in the overlay first (as
 * long as that slot still holds the same kind of wheel), otherwise whatever
 * gamepad the registry finds, with the profile that matches it.
 */
export function getActiveWheel(): ActiveWheel | null {
  const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
  for (const profile of PROFILES) {
    const idx = profile.getMapping().gamepadIndex
    const gp = idx != null ? list[idx] : null
    if (gp && profileFor(gp) === profile) return { gp, profile, mapping: profile.getMapping() }
  }
  const gp = getActiveGamepad(null)
  if (!gp) return null
  const profile = profileFor(gp)
  return { gp, profile, mapping: profile.getMapping() }
}

/** Make `index` the driving device, releasing any device another profile had picked. */
export function selectWheelDevice(index: number, profile: WheelProfile): void {
  for (const p of PROFILES) {
    if (p !== profile && p.getMapping().gamepadIndex != null) p.setMapping({ gamepadIndex: null })
  }
  profile.setMapping({ gamepadIndex: index })
}
