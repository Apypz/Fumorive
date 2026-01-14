import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Texture,
  AbstractMesh,
} from '@babylonjs/core'
import { LightingSetup } from './LightingSetup'

export class SimpleMap {
  private scene: Scene
  private lightingSetup: LightingSetup | null
  private meshes: AbstractMesh[] = []

  constructor(scene: Scene, lightingSetup?: LightingSetup) {
    this.scene = scene
    this.lightingSetup = lightingSetup ?? null
  }

  /**
   * Create a simple race track map
   */
  createRaceTrack(): void {
    // Main ground/grass
    this.createGround()

    // Road/track
    this.createRoad()

    // Barriers
    this.createBarriers()

    // Decorations
    this.createDecorations()

    console.log('[SimpleMap] Race track created')
  }

  private createGround(): void {
    // Large grass ground
    const ground = MeshBuilder.CreateGround('ground', {
      width: 500,
      height: 500,
      subdivisions: 64,
    }, this.scene)

    const groundMaterial = new PBRMaterial('groundMaterial', this.scene)
    groundMaterial.albedoColor = new Color3(0.2, 0.5, 0.2) // Green grass
    groundMaterial.metallic = 0
    groundMaterial.roughness = 0.95
    ground.material = groundMaterial
    ground.receiveShadows = true
    ground.position.y = -0.01 // Slightly below road

    this.meshes.push(ground)
  }

  private createRoad(): void {
    // Main straight road
    const roadWidth = 12
    const roadLength = 200

    // Create a simple oval track
    // Straight sections
    const road1 = MeshBuilder.CreateGround('road1', {
      width: roadLength,
      height: roadWidth,
    }, this.scene)
    road1.position = new Vector3(0, 0, 30)
    road1.rotation.y = Math.PI / 2

    const road2 = MeshBuilder.CreateGround('road2', {
      width: roadLength,
      height: roadWidth,
    }, this.scene)
    road2.position = new Vector3(0, 0, -30)
    road2.rotation.y = Math.PI / 2

    // Curved sections (using discs approximation)
    const curve1 = MeshBuilder.CreateDisc('curve1', {
      radius: 30,
      arc: 0.5,
      tessellation: 32,
    }, this.scene)
    curve1.rotation.x = Math.PI / 2
    curve1.position = new Vector3(100, 0, 0)

    const curve2 = MeshBuilder.CreateDisc('curve2', {
      radius: 30,
      arc: 0.5,
      tessellation: 32,
    }, this.scene)
    curve2.rotation.x = Math.PI / 2
    curve2.rotation.y = Math.PI
    curve2.position = new Vector3(-100, 0, 0)

    // Road material (asphalt)
    const roadMaterial = new PBRMaterial('roadMaterial', this.scene)
    roadMaterial.albedoColor = new Color3(0.15, 0.15, 0.18) // Dark gray asphalt
    roadMaterial.metallic = 0.1
    roadMaterial.roughness = 0.8

    road1.material = roadMaterial
    road2.material = roadMaterial
    curve1.material = roadMaterial
    curve2.material = roadMaterial

    road1.receiveShadows = true
    road2.receiveShadows = true
    curve1.receiveShadows = true
    curve2.receiveShadows = true

    this.meshes.push(road1, road2, curve1, curve2)

    // Add road lines
    this.createRoadLines()
  }

  private createRoadLines(): void {
    const lineMaterial = new StandardMaterial('lineMaterial', this.scene)
    lineMaterial.diffuseColor = new Color3(1, 1, 1)
    lineMaterial.emissiveColor = new Color3(0.5, 0.5, 0.5)

    // Center dashed line on straight sections
    for (let i = -90; i < 90; i += 8) {
      const line1 = MeshBuilder.CreateBox(`line1_${i}`, {
        width: 4,
        height: 0.02,
        depth: 0.3,
      }, this.scene)
      line1.position = new Vector3(i, 0.01, 30)
      line1.material = lineMaterial

      const line2 = MeshBuilder.CreateBox(`line2_${i}`, {
        width: 4,
        height: 0.02,
        depth: 0.3,
      }, this.scene)
      line2.position = new Vector3(i, 0.01, -30)
      line2.material = lineMaterial

      this.meshes.push(line1, line2)
    }
  }

  private createBarriers(): void {
    const barrierMaterial = new PBRMaterial('barrierMaterial', this.scene)
    barrierMaterial.albedoColor = new Color3(0.9, 0.1, 0.1) // Red
    barrierMaterial.metallic = 0.3
    barrierMaterial.roughness = 0.5

    const whiteMaterial = new PBRMaterial('whiteMaterial', this.scene)
    whiteMaterial.albedoColor = new Color3(0.95, 0.95, 0.95)
    whiteMaterial.metallic = 0.3
    whiteMaterial.roughness = 0.5

    // Outer barriers along straight sections
    const barrierPositions = [
      // Top straight - outer
      { x: 0, z: 36, length: 200, rotation: 0 },
      // Bottom straight - outer
      { x: 0, z: -36, length: 200, rotation: 0 },
      // Top straight - inner
      { x: 0, z: 24, length: 140, rotation: 0 },
      // Bottom straight - inner
      { x: 0, z: -24, length: 140, rotation: 0 },
    ]

    barrierPositions.forEach((pos, index) => {
      // Create alternating red/white barrier blocks
      const numBlocks = Math.floor(pos.length / 4)
      for (let i = 0; i < numBlocks; i++) {
        const barrier = MeshBuilder.CreateBox(`barrier_${index}_${i}`, {
          width: 3.8,
          height: 0.8,
          depth: 0.5,
        }, this.scene)
        barrier.position = new Vector3(
          pos.x - pos.length / 2 + i * 4 + 2,
          0.4,
          pos.z
        )
        barrier.material = i % 2 === 0 ? barrierMaterial : whiteMaterial
        this.lightingSetup?.addShadowCaster(barrier)
        this.meshes.push(barrier)
      }
    })
  }

  private createDecorations(): void {
    // Trees around the track
    const treePositions = [
      new Vector3(50, 0, 60),
      new Vector3(-50, 0, 60),
      new Vector3(80, 0, 50),
      new Vector3(-80, 0, 50),
      new Vector3(50, 0, -60),
      new Vector3(-50, 0, -60),
      new Vector3(80, 0, -50),
      new Vector3(-80, 0, -50),
      new Vector3(140, 0, 0),
      new Vector3(-140, 0, 0),
      new Vector3(130, 0, 30),
      new Vector3(130, 0, -30),
      new Vector3(-130, 0, 30),
      new Vector3(-130, 0, -30),
    ]

    const trunkMaterial = new PBRMaterial('trunkMaterial', this.scene)
    trunkMaterial.albedoColor = new Color3(0.4, 0.25, 0.1)
    trunkMaterial.metallic = 0
    trunkMaterial.roughness = 0.9

    const leavesMaterial = new PBRMaterial('leavesMaterial', this.scene)
    leavesMaterial.albedoColor = new Color3(0.1, 0.4, 0.15)
    leavesMaterial.metallic = 0
    leavesMaterial.roughness = 0.8

    treePositions.forEach((pos, i) => {
      // Trunk
      const trunk = MeshBuilder.CreateCylinder(`trunk_${i}`, {
        diameter: 0.8,
        height: 4,
      }, this.scene)
      trunk.position = pos.add(new Vector3(0, 2, 0))
      trunk.material = trunkMaterial
      this.lightingSetup?.addShadowCaster(trunk)

      // Leaves (cone shape)
      const leaves = MeshBuilder.CreateCylinder(`leaves_${i}`, {
        diameterTop: 0,
        diameterBottom: 4,
        height: 5,
      }, this.scene)
      leaves.position = pos.add(new Vector3(0, 6, 0))
      leaves.material = leavesMaterial
      this.lightingSetup?.addShadowCaster(leaves)

      this.meshes.push(trunk, leaves)
    })

    // Start/Finish line
    const finishLine = MeshBuilder.CreateGround('finishLine', {
      width: 12,
      height: 3,
    }, this.scene)
    finishLine.position = new Vector3(0, 0.02, 30)
    
    const checkerMaterial = new StandardMaterial('checkerMaterial', this.scene)
    checkerMaterial.diffuseColor = new Color3(1, 1, 1)
    // Simple checker pattern would need a texture, use white for now
    finishLine.material = checkerMaterial

    this.meshes.push(finishLine)

    // Start arch
    this.createStartArch()
  }

  private createStartArch(): void {
    const archMaterial = new PBRMaterial('archMaterial', this.scene)
    archMaterial.albedoColor = new Color3(0.8, 0.1, 0.1)
    archMaterial.metallic = 0.5
    archMaterial.roughness = 0.4

    // Left pillar
    const leftPillar = MeshBuilder.CreateBox('leftPillar', {
      width: 1,
      height: 8,
      depth: 1,
    }, this.scene)
    leftPillar.position = new Vector3(-7, 4, 30)
    leftPillar.material = archMaterial
    this.lightingSetup?.addShadowCaster(leftPillar)

    // Right pillar
    const rightPillar = MeshBuilder.CreateBox('rightPillar', {
      width: 1,
      height: 8,
      depth: 1,
    }, this.scene)
    rightPillar.position = new Vector3(7, 4, 30)
    rightPillar.material = archMaterial
    this.lightingSetup?.addShadowCaster(rightPillar)

    // Top beam
    const topBeam = MeshBuilder.CreateBox('topBeam', {
      width: 15,
      height: 1.5,
      depth: 1,
    }, this.scene)
    topBeam.position = new Vector3(0, 8.5, 30)
    topBeam.material = archMaterial
    this.lightingSetup?.addShadowCaster(topBeam)

    this.meshes.push(leftPillar, rightPillar, topBeam)
  }

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose())
    this.meshes = []
    console.log('[SimpleMap] Disposed')
  }
}
