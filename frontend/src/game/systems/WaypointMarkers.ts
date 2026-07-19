/**
 * WaypointMarkers
 * ===============
 * Creates 3D visual markers in the Babylon.js scene for each waypoint.
 * 
 * - Active waypoint: large green glowing pillar
 * - Upcoming waypoints: small blue transparent pillars
 * - Reached waypoints: faded out / invisible
 */

import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Vector3,
  AbstractMesh,
  GlowLayer,
  Animation,
} from '@babylonjs/core'
import type { Waypoint, WaypointState } from './WaypointSystem'

interface MarkerMesh {
  pillar: AbstractMesh
  ring: AbstractMesh
  waypointId: number
}

export class WaypointMarkers {
  private scene: Scene
  private markers: MarkerMesh[] = []
  private activeMaterial!: PBRMaterial
  private nextMaterial!: PBRMaterial      // preview: next checkpoint after active
  private upcomingMaterial!: PBRMaterial
  private reachedMaterial!: PBRMaterial
  private glowLayer: GlowLayer | null = null

  constructor(scene: Scene) {
    this.scene = scene
    this.createMaterials()
  }

  private createMaterials(): void {
    // Active waypoint: bright green glow
    this.activeMaterial = new PBRMaterial('wp_active_mat', this.scene)
    this.activeMaterial.albedoColor = new Color3(0.1, 0.9, 0.3)
    this.activeMaterial.emissiveColor = new Color3(0.1, 0.8, 0.2)
    this.activeMaterial.emissiveIntensity = 2
    this.activeMaterial.alpha = 0.8
    this.activeMaterial.metallic = 0.1
    this.activeMaterial.roughness = 0.5

    // Next checkpoint preview: amber/orange, dimmer than active
    this.nextMaterial = new PBRMaterial('wp_next_mat', this.scene)
    this.nextMaterial.albedoColor = new Color3(1.0, 0.6, 0.1)
    this.nextMaterial.emissiveColor = new Color3(0.8, 0.4, 0.0)
    this.nextMaterial.emissiveIntensity = 0.8
    this.nextMaterial.alpha = 0.55
    this.nextMaterial.metallic = 0.1
    this.nextMaterial.roughness = 0.6

    // Upcoming: blue semi-transparent (hidden by default)
    this.upcomingMaterial = new PBRMaterial('wp_upcoming_mat', this.scene)
    this.upcomingMaterial.albedoColor = new Color3(0.2, 0.5, 1.0)
    this.upcomingMaterial.emissiveColor = new Color3(0.1, 0.3, 0.8)
    this.upcomingMaterial.emissiveIntensity = 0.5
    this.upcomingMaterial.alpha = 0.35
    this.upcomingMaterial.metallic = 0.0
    this.upcomingMaterial.roughness = 0.8

    // Reached: very faded
    this.reachedMaterial = new PBRMaterial('wp_reached_mat', this.scene)
    this.reachedMaterial.albedoColor = new Color3(0.3, 0.3, 0.3)
    this.reachedMaterial.emissiveColor = new Color3(0, 0, 0)
    this.reachedMaterial.alpha = 0.1
    this.reachedMaterial.metallic = 0.0
    this.reachedMaterial.roughness = 1.0

    // Setup glow layer for active checkpoint
    this.glowLayer = new GlowLayer('wp_glow', this.scene, {
      mainTextureSamples: 4,
      blurKernelSize: 32,
    })
    this.glowLayer.intensity = 0.6
  }

  /**
   * Create visual markers for all waypoints in a route
   */
  createMarkers(waypoints: Waypoint[]): void {
    this.disposeMarkers()

    waypoints.forEach((wp, index) => {
      const isFirst = index === 0
      const isSecond = index === 1  // next-checkpoint preview

      // Pillar (vertical cylinder beacon)
      const pillarHeight = isFirst ? 15 : isSecond ? 8 : 10
      const pillarDiameter = isFirst ? 2.0 : isSecond ? 1.0 : 1.2
      const pillar = MeshBuilder.CreateCylinder(
        `wp_pillar_${wp.id}`,
        {
          height: pillarHeight,
          diameter: pillarDiameter,
          tessellation: 16,
        },
        this.scene
      )
      pillar.position = new Vector3(
        wp.position.x,
        pillarHeight / 2, // Bottom at ground level
        wp.position.z
      )
      pillar.material = isFirst
        ? this.activeMaterial
        : isSecond
          ? this.nextMaterial
          : this.upcomingMaterial
      pillar.isPickable = false
      // Show active AND next-checkpoint markers; hide all others
      pillar.isVisible = isFirst || isSecond

      // Ground ring
      const ring = MeshBuilder.CreateTorus(
        `wp_ring_${wp.id}`,
        {
          diameter: wp.radius * 2,
          thickness: 0.5,
          tessellation: 32,
        },
        this.scene
      )
      ring.position = new Vector3(wp.position.x, 0.15, wp.position.z)
      ring.material = isFirst
        ? this.activeMaterial
        : isSecond
          ? this.nextMaterial
          : this.upcomingMaterial
      ring.isPickable = false
      ring.isVisible = isFirst || isSecond

      // Add glow to active marker only
      if (isFirst && this.glowLayer) {
        this.glowLayer.addIncludedOnlyMesh(pillar as any)
        this.glowLayer.addIncludedOnlyMesh(ring as any)
      }

      // Bobbing animation on the active pillar only
      if (isFirst) {
        this.addBobbingAnimation(pillar, pillarHeight / 2)
      }

      this.markers.push({ pillar, ring, waypointId: wp.id })
    })
  }

  /**
   * Update marker visuals based on waypoint states.
   * The first 'upcoming' waypoint after the active one is shown as an
   * amber preview marker so the player can see which way to go next.
   */
  updateStates(states: { waypointId: number; state: WaypointState }[]): void {
    // Determine which waypoint id should be shown as the "next" preview
    const activeIdx = states.findIndex(s => s.state === 'active')
    const nextPreviewId =
      activeIdx >= 0 && activeIdx + 1 < states.length
        ? states[activeIdx + 1].waypointId
        : -1

    states.forEach(({ waypointId, state }) => {
      const marker = this.markers.find(m => m.waypointId === waypointId)
      if (!marker) return

      const isNextPreview = waypointId === nextPreviewId

      switch (state) {
        case 'active':
          marker.pillar.material = this.activeMaterial
          marker.ring.material = this.activeMaterial
          marker.pillar.scaling.y = 1.0
          marker.pillar.isVisible = true
          marker.ring.isVisible = true
          if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(marker.pillar as any)
            this.glowLayer.addIncludedOnlyMesh(marker.ring as any)
          }
          this.addBobbingAnimation(marker.pillar, marker.pillar.position.y)
          break

        case 'upcoming':
          if (isNextPreview) {
            // Show the immediately next checkpoint as amber preview
            marker.pillar.material = this.nextMaterial
            marker.ring.material = this.nextMaterial
            marker.pillar.isVisible = true
            marker.ring.isVisible = true
          } else {
            // Hide all other upcoming checkpoints
            marker.pillar.isVisible = false
            marker.ring.isVisible = false
          }
          break

        case 'reached':
          marker.pillar.material = this.reachedMaterial
          marker.ring.material = this.reachedMaterial
          marker.pillar.isVisible = false
          marker.ring.isVisible = false
          if (this.glowLayer) {
            this.glowLayer.removeIncludedOnlyMesh(marker.pillar as any)
            this.glowLayer.removeIncludedOnlyMesh(marker.ring as any)
          }
          break

        case 'missed':
          marker.pillar.isVisible = false
          marker.ring.isVisible = false
          break
      }
    })
  }

  /**
   * Simple bobbing animation for active checkpoint
   */
  private addBobbingAnimation(mesh: AbstractMesh, baseY: number): void {
    mesh.animations = []
    const anim = new Animation(
      'wpBob',
      'position.y',
      30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    )
    anim.setKeys([
      { frame: 0, value: baseY },
      { frame: 30, value: baseY + 0.5 },
      { frame: 60, value: baseY },
    ])
    mesh.animations.push(anim)
    this.scene.beginAnimation(mesh, 0, 60, true)
  }

  /**
   * Dispose all marker meshes and materials
   */
  disposeMarkers(): void {
    this.markers.forEach(m => {
      m.pillar.dispose()
      m.ring.dispose()
    })
    this.markers = []
  }

  dispose(): void {
    this.disposeMarkers()
    this.activeMaterial?.dispose()
    this.nextMaterial?.dispose()
    this.upcomingMaterial?.dispose()
    this.reachedMaterial?.dispose()
    this.glowLayer?.dispose()
  }
}
