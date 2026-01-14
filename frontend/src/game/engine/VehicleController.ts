import { AbstractMesh, Vector3 } from '@babylonjs/core'
import { InputManager } from './InputManager'

export type VehicleOptions = {
  maxSpeed?: number
  accel?: number
  brakeAccel?: number
  turnSpeed?: number
  reverseMaxSpeed?: number
}

export class VehicleController {
  private mesh: AbstractMesh
  private input: InputManager
  private speed = 0
  private heading = 0
  private targetSpeed = 0
  private opts: Required<VehicleOptions>

  constructor(mesh: AbstractMesh, input: InputManager, opts?: VehicleOptions) {
    this.mesh = mesh
    this.input = input
    this.heading = mesh.rotation.y
    this.opts = {
      maxSpeed: opts?.maxSpeed ?? 6,
      reverseMaxSpeed: opts?.reverseMaxSpeed ?? 2,
      accel: opts?.accel ?? 6,
      brakeAccel: opts?.brakeAccel ?? 8,
      turnSpeed: opts?.turnSpeed ?? 2.6,
    }
  }

  update(deltaTime: number) {
    const st = this.input.getState()

    // Determine desired target speed from input
    if (st.forward && !st.backward) this.targetSpeed = this.opts.maxSpeed
    else if (st.backward && !st.forward) this.targetSpeed = -this.opts.reverseMaxSpeed
    else this.targetSpeed = 0

    // Smoothly approach target speed (different accel/brake rates)
    if (this.speed < this.targetSpeed) {
      // Accelerating forward
      this.speed += this.opts.accel * deltaTime
      if (this.speed > this.targetSpeed) this.speed = this.targetSpeed
    } else if (this.speed > this.targetSpeed) {
      // Braking/reversing
      const decel = this.targetSpeed === 0 ? this.opts.brakeAccel * 0.9 : this.opts.brakeAccel
      this.speed -= decel * deltaTime
      if (this.speed < this.targetSpeed) this.speed = this.targetSpeed
    }

    // Steering - allow a bit of turning even at low speeds but scale with speed
    const steerInput = (st.right ? 1 : 0) - (st.left ? 1 : 0) // right positive
    const speedFactor = Math.min(1, Math.abs(this.speed) / Math.max(0.5, this.opts.maxSpeed * 0.3))
    if (Math.abs(steerInput) > 0.01) {
      // when reversing, steering is inverted
      const direction = this.speed >= 0 ? 1 : -1
      this.heading += steerInput * this.opts.turnSpeed * deltaTime * (0.4 + 0.6 * speedFactor) * direction
    }

    // Update mesh rotation
    this.mesh.rotation.y = this.heading

    // Move along mesh's forward direction (use mesh local forward so model orientation is preserved)
    // Prefer the mesh local forward vector (so model orientation is respected)
    const forward = (this.mesh as any).getDirection(new Vector3(0, 0, 1)).normalize()

    const displacement = forward.scale(this.speed * deltaTime)
    this.mesh.position.addInPlace(displacement)
  }
  // Teleport / set position helpers
  setPosition(pos: Vector3) {
    this.mesh.position.copyFrom(pos)
  }

  setHeading(rad: number) {
    this.heading = rad
    this.mesh.rotation.y = rad
  }

  getSpeed() {
    return this.speed
  }
}
