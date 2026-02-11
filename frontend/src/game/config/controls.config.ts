/**
 * Controls Configuration
 * ======================
 * Konfigurasi input keyboard dan mouse untuk kontrol kendaraan.
 */

import type { ControlsConfig, KeyBindings, MouseControlConfig } from '../types'

/**
 * Default Key Bindings
 * Mapping tombol keyboard ke aksi
 */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  // Movement
  forward: ['w', 'arrowup'],
  backward: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'],
  right: ['d', 'arrowright'],
  
  // Actions
  brake: [' ', 'space'],
  horn: ['shift', 'shiftleft', 'shiftright'],
  
  // Camera & Mode toggles
  toggleCamera: ['v'],
  toggleControlMode: ['c'],
  toggleEngine: ['k'],
  
  // Additional (optional)
  resetCar: ['r'],
  pause: ['escape', 'p'],
}

/**
 * Mouse Control Configuration
 * Settings untuk kontrol steering dengan mouse
 */
export const DEFAULT_MOUSE_CONFIG: MouseControlConfig = {
  /** 
   * Mouse sensitivity for steering.
   * Lower value = more sensitive, higher value = less sensitive.
   * Recommended range: 100-300
   */
  sensitivity: 200,
  
  /**
   * How fast steering returns to center when mouse stops moving.
   * Higher = faster return to center.
   * Recommended range: 1.0-5.0
   */
  returnSpeed: 2.0,
  
  /**
   * Smoothing factor for steering input.
   * Higher = faster response, lower = smoother but slower.
   * Recommended range: 8.0-20.0
   */
  steeringSmoothness: 12.0,
  
  /**
   * Dead zone - ignore very small steering values.
   * Helps prevent jitter at center position.
   */
  deadZone: 0.02,
  
  /**
   * Whether to invert mouse X axis for steering
   */
  invertX: false,
}

/**
 * Complete Controls Configuration
 */
export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  keyBindings: DEFAULT_KEY_BINDINGS,
  mouse: DEFAULT_MOUSE_CONFIG,
  
  /** Default control mode when game starts */
  defaultControlMode: 'keyboard',
  
  /** Default camera mode when game starts */
  defaultCameraMode: 'third-person',
}

/**
 * Alternative key bindings - Arrow keys focus
 */
export const ARROW_KEY_BINDINGS: KeyBindings = {
  ...DEFAULT_KEY_BINDINGS,
  forward: ['arrowup', 'w'],
  backward: ['arrowdown', 's'],
  left: ['arrowleft', 'a'],
  right: ['arrowright', 'd'],
}

/**
 * Racing game style bindings
 */
export const RACING_KEY_BINDINGS: KeyBindings = {
  ...DEFAULT_KEY_BINDINGS,
  brake: ['s', 'arrowdown'],  // S as brake instead of reverse
  backward: ['x'],             // X for reverse
}

/**
 * High sensitivity mouse config for precise control
 */
export const HIGH_SENSITIVITY_MOUSE_CONFIG: MouseControlConfig = {
  ...DEFAULT_MOUSE_CONFIG,
  sensitivity: 80,
  steeringSmoothness: 15.0,
  returnSpeed: 3.0,
}

/**
 * Low sensitivity mouse config for beginners
 */
export const LOW_SENSITIVITY_MOUSE_CONFIG: MouseControlConfig = {
  ...DEFAULT_MOUSE_CONFIG,
  sensitivity: 250,
  steeringSmoothness: 8.0,
  returnSpeed: 1.5,
}

/**
 * Controls presets
 */
export const CONTROLS_PRESETS = {
  default: DEFAULT_CONTROLS_CONFIG,
  arrowKeys: {
    ...DEFAULT_CONTROLS_CONFIG,
    keyBindings: ARROW_KEY_BINDINGS,
  },
  racing: {
    ...DEFAULT_CONTROLS_CONFIG,
    keyBindings: RACING_KEY_BINDINGS,
  },
  highSensitivity: {
    ...DEFAULT_CONTROLS_CONFIG,
    mouse: HIGH_SENSITIVITY_MOUSE_CONFIG,
  },
  lowSensitivity: {
    ...DEFAULT_CONTROLS_CONFIG,
    mouse: LOW_SENSITIVITY_MOUSE_CONFIG,
  },
} as const

export type ControlsPreset = keyof typeof CONTROLS_PRESETS
