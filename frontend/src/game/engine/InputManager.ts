import { Scene, KeyboardEventTypes, PointerEventTypes } from '@babylonjs/core'
import type { InputState } from '../types'

export interface KeyBindings {
  forward: string[]
  backward: string[]
  left: string[]
  right: string[]
  jump: string[]
  sprint: string[]
  interact: string[]
}

const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE', 'KeyF'],
}

export class InputManager {
  private scene: Scene
  private canvas: HTMLCanvasElement
  private keyBindings: KeyBindings
  private pressedKeys: Set<string> = new Set()
  private isPointerLocked = false

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
  }

  private onStateChangeCallbacks: ((state: InputState) => void)[] = []

  constructor(scene: Scene, canvas: HTMLCanvasElement, keyBindings?: Partial<KeyBindings>) {
    this.scene = scene
    this.canvas = canvas
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...keyBindings }

    this.setupKeyboardListeners()
    this.setupPointerListeners()
    this.setupPointerLock()

    console.log('[InputManager] Initialized')
  }

  private setupKeyboardListeners(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const code = kbInfo.event.code

      if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
        this.pressedKeys.add(code)
      } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
        this.pressedKeys.delete(code)
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

  private updateState(): void {
    // Check each action against its key bindings
    this.state.forward = this.isAnyKeyPressed(this.keyBindings.forward)
    this.state.backward = this.isAnyKeyPressed(this.keyBindings.backward)
    this.state.left = this.isAnyKeyPressed(this.keyBindings.left)
    this.state.right = this.isAnyKeyPressed(this.keyBindings.right)
    this.state.jump = this.isAnyKeyPressed(this.keyBindings.jump)
    this.state.sprint = this.isAnyKeyPressed(this.keyBindings.sprint)
    this.state.interact = this.isAnyKeyPressed(this.keyBindings.interact)

    this.notifyStateChange()
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
    console.log('[InputManager] Disposed')
  }
}
