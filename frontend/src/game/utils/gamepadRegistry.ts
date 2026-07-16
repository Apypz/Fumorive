/**
 * gamepadRegistry
 * ===============
 * App-level, persistent gamepad detection. The Gamepad API only surfaces a
 * device after the page first receives input from it, and per-component
 * listeners can MISS the `gamepadconnected` event across scene remounts (the
 * window between one CarController being disposed and the next being created) —
 * which is why the wheel sometimes "isn't detected" until it is physically
 * reset. To avoid that, we attach ONE set of listeners for the whole app
 * lifetime (this module is imported once at startup) and read the live gamepad
 * state on demand.
 */

const connectedIds = new Set<number>()

function onConnect(e: GamepadEvent): void {
  connectedIds.add(e.gamepad.index)
  console.log(`[gamepad] connected: ${e.gamepad.id} (index ${e.gamepad.index})`)
}

function onDisconnect(e: GamepadEvent): void {
  connectedIds.delete(e.gamepad.index)
  console.log(`[gamepad] disconnected (index ${e.gamepad.index})`)
}

if (typeof window !== 'undefined') {
  window.addEventListener('gamepadconnected', onConnect)
  window.addEventListener('gamepaddisconnected', onDisconnect)
}

function pads(): (Gamepad | null)[] {
  return typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
}

/**
 * The gamepad the game should read: a preferred index first, then any device we
 * remembered via the connect event, then any live device the API reports.
 */
export function getActiveGamepad(preferred?: number | null): Gamepad | null {
  const list = pads()
  if (preferred != null && list[preferred]) return list[preferred] as Gamepad
  for (const idx of connectedIds) {
    if (list[idx]) return list[idx] as Gamepad
  }
  for (const p of list) if (p) return p
  return null
}

export function hasGamepad(): boolean {
  return getActiveGamepad() !== null
}
