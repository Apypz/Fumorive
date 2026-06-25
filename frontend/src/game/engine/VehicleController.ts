import { AbstractMesh, Vector3 } from '@babylonjs/core'
import { InputManager } from './InputManager'
import {
  type GearPosition,
  GEAR_SEQUENCE,
  GEAR_SPEED_CAPS,
  type GearChangedPayload,
  type HandbrakeChangedPayload,
  type EngineStateChangedPayload,
  type VehicleState,
} from '../types/game.types'

export type VehicleOptions = {
  maxSpeed?: number
  accel?: number
  brakeAccel?: number
  turnSpeed?: number
  reverseMaxSpeed?: number
  /** SpeedCap per gigi (unit/s). Jika tidak disediakan, gunakan GEAR_SPEED_CAPS default. */
  gearSpeedCaps?: Partial<Record<GearPosition, number>>
  /** Faktor deselerasi saat turun gigi melebihi SpeedCap (default: 5.0) */
  gearDownDecelFactor?: number
  /** Multiplier FrictionDecel saat handbrake aktif (default: 1.5) */
  handbrakeMultiplier?: number
}

export class VehicleController {
  private mesh: AbstractMesh
  private input: InputManager
  private speed = 0
  private heading = 0
  private targetSpeed = 0
  private opts: Required<VehicleOptions>

  // --- Task 4.1: State internal baru ---
  private currentGearIndex = 1    // default N (index 1 dalam GEAR_SEQUENCE)
  private engineRunning = false
  private handbrakeActive = false
  private currentBrakeDepth = 0   // Task 7.2: track brakeDepth untuk getVehicleState()

  // --- Task 4.1: Event emitter listeners ---
  private listeners: {
    gearChanged: Array<(p: GearChangedPayload) => void>
    handbrakeChanged: Array<(p: HandbrakeChangedPayload) => void>
    engineStateChanged: Array<(p: EngineStateChangedPayload) => void>
  } = {
    gearChanged: [],
    handbrakeChanged: [],
    engineStateChanged: [],
  }

  constructor(mesh: AbstractMesh, input: InputManager, opts?: VehicleOptions) {
    this.mesh = mesh
    this.input = input
    this.heading = mesh.rotation.y
    this.opts = {
      maxSpeed: opts?.maxSpeed ?? 160,
      reverseMaxSpeed: opts?.reverseMaxSpeed ?? 10,
      accel: opts?.accel ?? 6,
      brakeAccel: opts?.brakeAccel ?? 8,
      turnSpeed: opts?.turnSpeed ?? 2.6,
      gearSpeedCaps: opts?.gearSpeedCaps ?? GEAR_SPEED_CAPS,
      gearDownDecelFactor: opts?.gearDownDecelFactor ?? 5.0,
      handbrakeMultiplier: opts?.handbrakeMultiplier ?? 1.5,
    }
  }

  // ============================================
  // Task 4.1: Event emitter — on() dan emit()
  // ============================================

  /** Daftarkan callback untuk event tertentu. Kembalikan fungsi unsubscribe. */
  on(event: 'gearChanged', callback: (p: GearChangedPayload) => void): () => void
  on(event: 'handbrakeChanged', callback: (p: HandbrakeChangedPayload) => void): () => void
  on(event: 'engineStateChanged', callback: (p: EngineStateChangedPayload) => void): () => void
  on(
    event: 'gearChanged' | 'handbrakeChanged' | 'engineStateChanged',
    callback: ((p: GearChangedPayload) => void) | ((p: HandbrakeChangedPayload) => void) | ((p: EngineStateChangedPayload) => void),
  ): () => void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = this.listeners[event] as Array<(p: any) => void>
    arr.push(callback)
    return () => {
      const idx = arr.indexOf(callback)
      if (idx !== -1) arr.splice(idx, 1)
    }
  }

  /** Pancarkan event ke semua listener yang terdaftar (internal). */
  private emit(event: 'gearChanged', payload: GearChangedPayload): void
  private emit(event: 'handbrakeChanged', payload: HandbrakeChangedPayload): void
  private emit(event: 'engineStateChanged', payload: EngineStateChangedPayload): void
  private emit(
    event: 'gearChanged' | 'handbrakeChanged' | 'engineStateChanged',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = this.listeners[event] as Array<(p: any) => void>
    for (const cb of arr) {
      cb(payload)
    }
  }

  // ============================================
  // Task 4.2: processEngineToggle()
  // ============================================

  /** Toggle engine on/off saat engineToggle = true (rising edge sudah diproses InputManager). */
  private processEngineToggle(engineToggle: boolean): void {
    if (engineToggle) {
      this.engineRunning = !this.engineRunning
      this.emit('engineStateChanged', { running: this.engineRunning })
    }
  }

  // ============================================
  // Task 4.3: processHandbrake()
  // ============================================

  /** Toggle handbrake on/off saat handbrakeToggle = true. */
  private processHandbrake(handbrakeToggle: boolean): void {
    if (handbrakeToggle) {
      this.handbrakeActive = !this.handbrakeActive
      this.emit('handbrakeChanged', { active: this.handbrakeActive })
    }
  }

  // ============================================
  // Task 4.4: processGearShift()
  // ============================================

  /** Proses naik/turun gigi. Guard: tidak beroperasi saat engine mati (R1.6). */
  private processGearShift(gearUp: boolean, gearDown: boolean): void {
    if (!this.engineRunning) return

    if (gearUp && this.currentGearIndex < GEAR_SEQUENCE.length - 1) {
      this.currentGearIndex++
      this.emit('gearChanged', { gear: GEAR_SEQUENCE[this.currentGearIndex] })
    }

    if (gearDown && this.currentGearIndex > 0) {
      this.currentGearIndex--
      this.emit('gearChanged', { gear: GEAR_SEQUENCE[this.currentGearIndex] })
    }
  }

  // ============================================
  // Task 5.1: applyFrictionBrake()
  // ============================================

  /** Terapkan pengereman berbasis gesekan. Kecepatan tidak akan turun di bawah 0 (R2.4, R2.8). */
  private applyFrictionBrake(brakeDepth: number, deltaTime: number): void {
    // Clamp brakeDepth ke [0, 1] (R2.7)
    brakeDepth = Math.max(0, Math.min(1, brakeDepth))

    const frictionDecel = this.handbrakeActive
      ? this.opts.brakeAccel * this.opts.handbrakeMultiplier   // handbrake override (R2.6)
      : this.opts.brakeAccel * brakeDepth

    if (frictionDecel > 0) {
      if (this.speed > 0) {
        // Maju → kurangi kecepatan, jangan sampai negatif (R2.4)
        this.speed = Math.max(0, this.speed - frictionDecel * deltaTime)
      } else if (this.speed < 0) {
        // Mundur → tambah ke arah 0, jangan sampai positif (R2.8)
        this.speed = Math.min(0, this.speed + frictionDecel * deltaTime)
      }
    }
  }

  // ============================================
  // Task 5.2: enforceSpeedCap()
  // ============================================

  /** Terapkan batas kecepatan per gigi secara bertahap (R4.3). */
  private enforceSpeedCap(deltaTime: number): void {
    const currentGear = GEAR_SEQUENCE[this.currentGearIndex]
    let speedCap = this.opts.gearSpeedCaps[currentGear]

    if (speedCap === undefined) {
      // Fallback ke gigi 1 jika tidak terdefinisi (R4.6)
      console.warn(
        `[VehicleController] SpeedCap untuk gigi "${currentGear}" tidak ditemukan, menggunakan fallback 29 unit/s`,
      )
      speedCap = GEAR_SPEED_CAPS['1']
    }

    if (this.speed > speedCap) {
      const reduction = (this.speed - speedCap) * this.opts.gearDownDecelFactor * deltaTime
      this.speed = Math.max(speedCap, this.speed - reduction)  // (R4.3)
    }
  }

  // ============================================
  // Task 7.1: update() — Integrasi semua logika
  // ============================================

  update(deltaTime: number) {
    const st = this.input.getState()

    // 1–3. Toggle engine, handbrake, dan gigi
    this.processEngineToggle(st.engineToggle)
    this.processHandbrake(st.handbrakeToggle)
    this.processGearShift(st.gearUp, st.gearDown)

    // 4–5. Dapatkan gigi aktif dan SpeedCap
    const currentGear = GEAR_SEQUENCE[this.currentGearIndex]
    let speedCap = this.opts.gearSpeedCaps[currentGear]
    if (speedCap === undefined) {
      speedCap = GEAR_SPEED_CAPS['1']
    }

    // 6. Tentukan targetSpeed
    if (!this.engineRunning) {
      // Engine mati: tidak ada akselerasi (R5.4)
      this.targetSpeed = 0
    } else if (currentGear === 'N') {
      // Netral: engine braking, tidak ada akselerasi baru (R4.5)
      this.targetSpeed = 0
    } else if (currentGear === 'R' && st.throttleAxis > 0) {
      // Mundur
      this.targetSpeed = -Math.min(st.throttleAxis * this.opts.reverseMaxSpeed, GEAR_SPEED_CAPS['R'])
    } else if (st.throttleAxis > 0) {
      // Maju
      this.targetSpeed = Math.min(st.throttleAxis * speedCap, speedCap)
    } else {
      this.targetSpeed = 0
    }

    // 7. Pendekatan targetSpeed (akselerasi/deselerasi)
    if (this.speed < this.targetSpeed) {
      this.speed += this.opts.accel * deltaTime
      if (this.speed > this.targetSpeed) this.speed = this.targetSpeed
    } else if (this.speed > this.targetSpeed) {
      const decel = this.targetSpeed === 0 ? this.opts.brakeAccel * 0.9 : this.opts.brakeAccel
      this.speed -= decel * deltaTime
      if (this.speed < this.targetSpeed) this.speed = this.targetSpeed
    }

    // 8–9. Friction brake
    const brakeDepth = Math.max(0, Math.min(1, st.brakeAxis))
    this.currentBrakeDepth = brakeDepth   // simpan untuk getVehicleState()
    this.applyFrictionBrake(brakeDepth, deltaTime)

    // 10. Terapkan SpeedCap
    this.enforceSpeedCap(deltaTime)

    // 11. Steering — tetap berjalan meski engine mati (R5.7)
    const steerInput = (st.right ? 1 : 0) - (st.left ? 1 : 0) // kanan positif
    const speedFactor = Math.min(1, Math.abs(this.speed) / Math.max(0.5, speedCap * 0.3))
    if (Math.abs(steerInput) > 0.01) {
      // Saat mundur, steering terbalik
      const direction = this.speed >= 0 ? 1 : -1
      this.heading += steerInput * this.opts.turnSpeed * deltaTime * (0.4 + 0.6 * speedFactor) * direction
    }

    // 12. Update mesh rotation dan position
    this.mesh.rotation.y = this.heading
    const forward = (this.mesh as any).getDirection(new Vector3(0, 0, 1)).normalize()
    const displacement = forward.scale(this.speed * deltaTime)
    this.mesh.position.addInPlace(displacement)
  }

  // ============================================
  // Task 7.2: getVehicleState()
  // ============================================

  /** Kembalikan snapshot state kendaraan saat ini (untuk UI / debugging). */
  getVehicleState(): VehicleState {
    return {
      currentGear: GEAR_SEQUENCE[this.currentGearIndex],
      engineRunning: this.engineRunning,
      handbrakeActive: this.handbrakeActive,
      speed: this.speed,
      brakeDepth: this.currentBrakeDepth,
    }
  }

  // ============================================
  // Helper / utility methods
  // ============================================

  /** Teleport kendaraan ke posisi tertentu. */
  setPosition(pos: Vector3) {
    this.mesh.position.copyFrom(pos)
  }

  /** Set heading (rotasi Y) secara langsung. */
  setHeading(rad: number) {
    this.heading = rad
    this.mesh.rotation.y = rad
  }

  /** Dapatkan kecepatan saat ini. */
  getSpeed() {
    return this.speed
  }
}
