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
    ground.checkCollisions = true

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
    road1.checkCollisions = true
    road2.checkCollisions = true
    curve1.checkCollisions = true
    curve2.checkCollisions = true

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
        // Tambahkan barrier di sisi luar dan dalam tikungan (curve)
        const curveBarriers = [
          // Tikungan kanan (timur)
          { center: new Vector3(100, 0, 0), radius: 36, angleStart: Math.PI * 1.5, angleEnd: Math.PI * 2, count: 16 }, // luar
          { center: new Vector3(100, 0, 0), radius: 24, angleStart: Math.PI * 1.5, angleEnd: Math.PI * 2, count: 10 }, // dalam
          // Tikungan kiri (barat)
          { center: new Vector3(-100, 0, 0), radius: 36, angleStart: Math.PI, angleEnd: Math.PI * 1.5, count: 16 }, // luar
          { center: new Vector3(-100, 0, 0), radius: 24, angleStart: Math.PI, angleEnd: Math.PI * 1.5, count: 10 }, // dalam
        ];
        curveBarriers.forEach((cb, idx) => {
          for (let i = 0; i < cb.count; i++) {
            const t = i / (cb.count - 1);
            const angle = cb.angleStart + t * (cb.angleEnd - cb.angleStart);
            const x = cb.center.x + cb.radius * Math.cos(angle);
            const z = cb.center.z + cb.radius * Math.sin(angle);
            const barrier = MeshBuilder.CreateBox(`curve_barrier_${idx}_${i}`, {
              width: 3.8,
              height: 1.5,
              depth: 1.2,
            }, this.scene);
            barrier.position = new Vector3(x, 0.75, z);
            barrier.material = i % 2 === 0 ? barrierMaterial : whiteMaterial;
            this.lightingSetup?.addShadowCaster(barrier);
            barrier.checkCollisions = true;
            this.meshes.push(barrier);
          }
        });
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
          height: 1.5, // lebih tinggi agar tidak bisa dilompati
          depth: 1.2,  // lebih tebal agar collision lebih baik
        }, this.scene)
        barrier.position = new Vector3(
          pos.x - pos.length / 2 + i * 4 + 2,
          0.75,
          pos.z
        )
        barrier.material = i % 2 === 0 ? barrierMaterial : whiteMaterial
        this.lightingSetup?.addShadowCaster(barrier)
        barrier.checkCollisions = true // Aktifkan collision
        this.meshes.push(barrier)
      }
    })

    // Pembatas map (tembok kota)
    const wallMaterial = new PBRMaterial('wallMaterial', this.scene)
    wallMaterial.albedoColor = new Color3(0.5, 0.5, 0.5)
    wallMaterial.metallic = 0.2
    wallMaterial.roughness = 0.8

    // Batas kota (rectangle besar di pinggir map)
    const wallThickness = 3
    const wallHeight = 8
    const wallLength = 500
    const wallZ = 250
    const wallX = 250

    // 4 sisi tembok
    const wallNorth = MeshBuilder.CreateBox('wallNorth', { width: wallLength, height: wallHeight, depth: wallThickness }, this.scene)
    wallNorth.position = new Vector3(0, wallHeight / 2, wallZ)
    wallNorth.material = wallMaterial
    wallNorth.checkCollisions = true
    this.meshes.push(wallNorth)

    const wallSouth = MeshBuilder.CreateBox('wallSouth', { width: wallLength, height: wallHeight, depth: wallThickness }, this.scene)
    wallSouth.position = new Vector3(0, wallHeight / 2, -wallZ)
    wallSouth.material = wallMaterial
    wallSouth.checkCollisions = true
    this.meshes.push(wallSouth)

    const wallEast = MeshBuilder.CreateBox('wallEast', { width: wallThickness, height: wallHeight, depth: wallLength }, this.scene)
    wallEast.position = new Vector3(wallX, wallHeight / 2, 0)
    wallEast.material = wallMaterial
    wallEast.checkCollisions = true
    this.meshes.push(wallEast)

    const wallWest = MeshBuilder.CreateBox('wallWest', { width: wallThickness, height: wallHeight, depth: wallLength }, this.scene)
    wallWest.position = new Vector3(-wallX, wallHeight / 2, 0)
    wallWest.material = wallMaterial
    wallWest.checkCollisions = true
    this.meshes.push(wallWest)
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
