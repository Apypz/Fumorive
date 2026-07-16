import { Scene, KeyboardEventTypes, PointerEventTypes } from '@babylonjs/core'
import type { InputState } from '../types'

// ============================================
// Task 2.1 — Perluasan KeyBindings
// ============================================

export interface KeyBindings {
  forward: string[]
  backward: string[]
  left: string[]
  right: string[]
  jump: string[]
  sprint: string[]
  interact: string[]
  // --- field baru untuk fitur kendaraan ---
  gearUp: string[]
  gearDown: string[]
  handbrake: string[]
  engineToggle: string[]
  brake: string[]
}

const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  // KeyE dipindahkan ke gearUp — interact kini hanya KeyF
  interact: ['KeyF'],
  // --- binding kendaraan ---
  gearUp: ['KeyE'],
  gearDown: ['KeyQ'],
  handbrake: ['Space'],
  engineToggle: ['KeyR'],
  // S/ArrowDown sudah dipakai untuk throttle negatif (mundur) di CarController.
  // Brake keyboard hanya Space — S tidak boleh double-bind sebagai brake
  // agar mode auto bisa mundur tanpa di-override oleh brakeAxis.
  brake: [],
}

export class InputManager {
  private scene: Scene
  private canvas: HTMLCanvasElement
  private keyBindings: KeyBindings
  private pressedKeys: Set<string> = new Set()
  private isPointerLocked = false

  // ============================================
  // Task 2.1 — State gamepad baru
  // ============================================
  private activeGamepadIndex: number | null = null
  private gamepadButtonPrev: boolean[] = []

  // ============================================
  // Task 2.4 — Edge detection keyboard
  // ============================================
  private justPressedKeys: Set<string> = new Set()
  private prevPressedKeys: Set<string> = new Set()

  private state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    interact: false,
    mouseX: 0,
    mouseY: 0,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    // Vehicle controller fields
    throttleAxis: 0,
    brakeAxis: 0,
    gearUp: false,
    gearDown: false,
    handbrakeToggle: false,
    engineToggle: false,
  }

  private onStateChangeCallbacks: ((state: InputState) => void)[] = []

  constructor(scene: Scene, canvas: HTMLCanvasElement, keyBindings?: Partial<KeyBindings>) {
    this.scene = scene
    this.canvas = canvas
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...keyBindings }

    this.setupKeyboardListeners()
    this.setupPointerListeners()
    this.setupPointerLock()
    // Task 2.2 — daftarkan gamepad listeners setelah pointer lock
    this.setupGamepadListeners()

    console.log('[InputManager] Initialized')
  }

  // ============================================
  // Task 2.4 — setupKeyboardListeners (diperbarui)
  // ============================================
  private setupKeyboardListeners(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const code = kbInfo.event.code

      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        // Rising edge: tambahkan ke justPressedKeys hanya jika belum ada di prevPressedKeys
        if (!this.prevPressedKeys.has(code)) {
          this.justPressedKeys.add(code)
        }
        this.pressedKeys.add(code)
        // Update prevPressedKeys untuk frame berikutnya
        this.prevPressedKeys.add(code)
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this.pressedKeys.delete(code)
        this.prevPressedKeys.delete(code)
      }

      this.updateState()
    })
  }

  private setupPointerListeners(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        const event = pointerInfo.event as PointerEvent

        if (this.isPointerLocked) {
          this.state.mouseDeltaX = event.movementX
          this.state.mouseDeltaY = event.movementY
        }

        this.state.mouseX = event.clientX
        this.state.mouseY = event.clientY

        this.notifyStateChange()
      }
    })
  }

  private setupPointerLock(): void {
    // Request pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.canvas.requestPointerLock()
      }
    })

    // Track pointer lock state
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas
      console.log(`[InputManager] Pointer lock: ${this.isPointerLocked}`)
    })

    document.addEventListener('pointerlockerror', () => {
      console.error('[InputManager] Pointer lock error')
    })
  }

  // ============================================
  // Task 2.2 — setupGamepadListeners()
  // ============================================
  private setupGamepadListeners(): void {
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.activeGamepadIndex = e.gamepad.index
      this.gamepadButtonPrev = new Array(e.gamepad.buttons.length).fill(false)
      console.log(`[InputManager] Gamepad terhubung: ${e.gamepad.id}`)
    })

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null
        this.gamepadButtonPrev = []
        // Reset semua field gamepad di state ke default
        this.state.throttleAxis = 0
        this.state.brakeAxis = 0
        this.state.gearUp = false
        this.state.gearDown = false
        this.state.handbrakeToggle = false
        this.state.engineToggle = false
        console.log(`[InputManager] Gamepad terputus: ${e.gamepad.id}`)
      }
    })
  }

  // ============================================
  // Task 2.3 — normalizeTriggerAxis() & getGamepadAxisValue()
  // ============================================

  /**
   * Menormalkan nilai axis trigger dari rentang [-1, 1] ke [0, 1].
   * raw = -1.0 → 0.0 (tidak ditekan), raw = 1.0 → 1.0 (penuh ditekan).
   */
  private normalizeTriggerAxis(raw: number): number {
    return Math.max(0, Math.min(1, (raw + 1) / 2))
  }

  /**
   * Mengembalikan nilai axis dari gamepad aktif, di-clamp ke [-1, 1].
   * Mengembalikan 0 jika tidak ada gamepad aktif atau axis tidak tersedia.
   */
  public getGamepadAxisValue(axisIndex: number): number {
    if (this.activeGamepadIndex === null) return 0
    const gamepads = navigator.getGamepads()
    const gp = gamepads[this.activeGamepadIndex]
    if (!gp) return 0
    const raw = gp.axes[axisIndex]
    if (raw === undefined) return 0
    return Math.max(-1, Math.min(1, raw))
  }

  // ============================================
  // Task 2.4 — Helper isKeyJustPressed()
  // ============================================

  /**
   * Mengembalikan true jika salah satu key ada di justPressedKeys (rising edge).
   */
  private isKeyJustPressed(keys: string[]): boolean {
    return keys.some((key) => this.justPressedKeys.has(key))
  }

  // ============================================
  // Task 2.4 — pollGamepad()
  // ============================================

  /**
   * Poll state gamepad aktif dan gabungkan dengan input keyboard.
   * Dipanggil sekali per frame di awal updateState().
   */
  private pollGamepad(): void {
    const gamepads = navigator.getGamepads()
    if (this.activeGamepadIndex === null || !gamepads[this.activeGamepadIndex]) return

    const gp = gamepads[this.activeGamepadIndex]!

    // Baca axis trigger: R2 = axes[5] (throttle), L2 = axes[2] (brake)
    // Default -1 = tidak ditekan (nilai raw saat trigger tidak ditekan)
    const throttleRaw = gp.axes[5] ?? -1
    const brakeRaw = gp.axes[2] ?? -1

    // Gabungkan gamepad axis dengan keyboard forward/brake (ambil yang terbesar)
    this.state.throttleAxis = Math.max(
      this.normalizeTriggerAxis(throttleRaw),
      this.state.forward ? 1.0 : 0.0,
    )
    this.state.brakeAxis = Math.max(
      this.normalizeTriggerAxis(brakeRaw),
      this.isAnyKeyPressed(this.keyBindings.brake) ? 1.0 : 0.0,
    )

    // Baca button dengan edge detection (rising edge: false → true)
    const btn0 = gp.buttons[0]?.pressed ?? false  // Button 1 → Handbrake
    const btn1 = gp.buttons[1]?.pressed ?? false  // Button 2 → Engine toggle
    const btn3 = gp.buttons[3]?.pressed ?? false  // Button 4 → Gear up
    const btn4 = gp.buttons[4]?.pressed ?? false  // Button 5 → Gear down

    this.state.handbrakeToggle =
      (btn0 && !this.gamepadButtonPrev[0]) || this.isKeyJustPressed(this.keyBindings.handbrake)
    this.state.engineToggle =
      (btn1 && !this.gamepadButtonPrev[1]) || this.isKeyJustPressed(this.keyBindings.engineToggle)
    this.state.gearUp =
      (btn3 && !this.gamepadButtonPrev[3]) || this.isKeyJustPressed(this.keyBindings.gearUp)
    this.state.gearDown =
      (btn4 && !this.gamepadButtonPrev[4]) || this.isKeyJustPressed(this.keyBindings.gearDown)

    // Simpan state button untuk frame berikutnya
    this.gamepadButtonPrev[0] = btn0
    this.gamepadButtonPrev[1] = btn1
    this.gamepadButtonPrev[3] = btn3
    this.gamepadButtonPrev[4] = btn4
  }

  // ============================================
  // Task 2.4 — resetJustPressed()
  // ============================================

  /**
   * Bersihkan justPressedKeys di akhir frame agar rising edge tidak persisten.
   */
  private resetJustPressed(): void {
    this.justPressedKeys.clear()
  }

  // ============================================
  // updateState() — diperbarui untuk Task 2.4
  // ============================================
  private updateState(): void {
    // Task 2.4: poll gamepad di awal frame sebelum update boolean lainnya
    this.pollGamepad()

    // Update boolean fields dari keyboard
    this.state.forward = this.isAnyKeyPressed(this.keyBindings.forward)
    this.state.backward = this.isAnyKeyPressed(this.keyBindings.backward)
    this.state.left = this.isAnyKeyPressed(this.keyBindings.left)
    this.state.right = this.isAnyKeyPressed(this.keyBindings.right)
    this.state.jump = this.isAnyKeyPressed(this.keyBindings.jump)
    this.state.sprint = this.isAnyKeyPressed(this.keyBindings.sprint)
    this.state.interact = this.isAnyKeyPressed(this.keyBindings.interact)

    // Jika tidak ada gamepad aktif, throttle/brake tetap dari keyboard saja
    if (this.activeGamepadIndex === null) {
      this.state.throttleAxis = this.state.forward ? 1.0 : 0.0
      this.state.brakeAxis = this.isAnyKeyPressed(this.keyBindings.brake) ? 1.0 : 0.0
      // Edge detection keyboard untuk toggle actions
      this.state.gearUp = this.isKeyJustPressed(this.keyBindings.gearUp)
      this.state.gearDown = this.isKeyJustPressed(this.keyBindings.gearDown)
      this.state.handbrakeToggle = this.isKeyJustPressed(this.keyBindings.handbrake)
      this.state.engineToggle = this.isKeyJustPressed(this.keyBindings.engineToggle)
    }

    this.notifyStateChange()

    // Task 2.4: bersihkan justPressedKeys di akhir frame
    this.resetJustPressed()
  }

  private isAnyKeyPressed(keys: string[]): boolean {
    return keys.some((key) => this.pressedKeys.has(key))
  }

  private notifyStateChange(): void {
    this.onStateChangeCallbacks.forEach((callback) => {
      callback({ ...this.state })
    })
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state }
  }

  /**
   * Check if a specific key is pressed
   */
  isKeyPressed(code: string): boolean {
    return this.pressedKeys.has(code)
  }

  /**
   * Check if pointer is locked
   */
  getIsPointerLocked(): boolean {
    return this.isPointerLocked
  }

  /**
   * Request pointer lock
   */
  requestPointerLock(): void {
    this.canvas.requestPointerLock()
  }

  /**
   * Exit pointer lock
   */
  exitPointerLock(): void {
    document.exitPointerLock()
  }

  /**
   * Subscribe to input state changes
   */
  onStateChange(callback: (state: InputState) => void): () => void {
    this.onStateChangeCallbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.onStateChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.onStateChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Update key bindings
   */
  setKeyBindings(bindings: Partial<KeyBindings>): void {
    this.keyBindings = { ...this.keyBindings, ...bindings }
    this.updateState()
  }

  /**
   * Get current key bindings
   */
  getKeyBindings(): KeyBindings {
    return { ...this.keyBindings }
  }

  /**
   * Reset mouse delta (call at end of frame)
   */
  resetMouseDelta(): void {
    this.state.mouseDeltaX = 0
    this.state.mouseDeltaY = 0
  }

  /**
   * Dispose input manager
   */
  dispose(): void {
    this.onStateChangeCallbacks = []
    this.pressedKeys.clear()
    this.justPressedKeys.clear()
    this.prevPressedKeys.clear()
    console.log('[InputManager] Disposed')
  }
}
