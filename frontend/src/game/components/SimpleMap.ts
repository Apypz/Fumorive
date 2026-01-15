import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Texture,
  AbstractMesh,
  BoundingBox,
} from '@babylonjs/core'
import { LightingSetup } from './LightingSetup'

interface Collider {
  min: Vector3
  max: Vector3
  mesh?: AbstractMesh
}

export class SimpleMap {
  private scene: Scene
  private lightingSetup: LightingSetup | null
  private meshes: AbstractMesh[] = []
  private colliders: Collider[] = []
  
  // Map boundaries
  private mapBounds = {
    minX: -150,
    maxX: 150,
    minZ: -150,
    maxZ: 150,
  }

  constructor(scene: Scene, lightingSetup?: LightingSetup) {
    this.scene = scene
    this.lightingSetup = lightingSetup ?? null
  }

  /**
   * Get all colliders for collision detection
   */
  getColliders(): Collider[] {
    return this.colliders
  }

  /**
   * Get map boundaries
   */
  getMapBounds() {
    return this.mapBounds
  }

  /**
   * Check collision with a point and radius (for car)
   */
  checkCollision(position: Vector3, radius: number = 1.5): { collided: boolean; normal: Vector3; penetration: number } {
    let result = { collided: false, normal: Vector3.Zero(), penetration: 0 }
    
    // Check map boundaries first
    const boundaryCheck = this.checkBoundaryCollision(position, radius)
    if (boundaryCheck.collided) {
      return boundaryCheck
    }
    
    // Check colliders
    for (const collider of this.colliders) {
      const closest = new Vector3(
        Math.max(collider.min.x, Math.min(position.x, collider.max.x)),
        Math.max(collider.min.y, Math.min(position.y, collider.max.y)),
        Math.max(collider.min.z, Math.min(position.z, collider.max.z))
      )
      
      const distance = Vector3.Distance(position, closest)
      
      if (distance < radius) {
        const normal = position.subtract(closest).normalize()
        if (normal.length() === 0) {
          // Inside the box, push out based on smallest axis
          const dx = Math.min(position.x - collider.min.x, collider.max.x - position.x)
          const dz = Math.min(position.z - collider.min.z, collider.max.z - position.z)
          if (dx < dz) {
            normal.x = position.x < (collider.min.x + collider.max.x) / 2 ? -1 : 1
          } else {
            normal.z = position.z < (collider.min.z + collider.max.z) / 2 ? -1 : 1
          }
        }
        
        result = {
          collided: true,
          normal: normal,
          penetration: radius - distance
        }
        break
      }
    }
    
    return result
  }

  private checkBoundaryCollision(position: Vector3, radius: number): { collided: boolean; normal: Vector3; penetration: number } {
    const bounds = this.mapBounds
    
    if (position.x - radius < bounds.minX) {
      return { collided: true, normal: new Vector3(1, 0, 0), penetration: bounds.minX - (position.x - radius) }
    }
    if (position.x + radius > bounds.maxX) {
      return { collided: true, normal: new Vector3(-1, 0, 0), penetration: (position.x + radius) - bounds.maxX }
    }
    if (position.z - radius < bounds.minZ) {
      return { collided: true, normal: new Vector3(0, 0, 1), penetration: bounds.minZ - (position.z - radius) }
    }
    if (position.z + radius > bounds.maxZ) {
      return { collided: true, normal: new Vector3(0, 0, -1), penetration: (position.z + radius) - bounds.maxZ }
    }
    
    return { collided: false, normal: Vector3.Zero(), penetration: 0 }
  }

  /**
   * Create a city-themed map
   */
  createCityMap(): void {
    this.createCityGround()
    this.createCityRoads()
    this.createRoadBarriers()
    this.createBuildings()
    this.createStreetProps()
    this.createMapBoundaryWalls()
    
    console.log('[SimpleMap] City map created with', this.colliders.length, 'colliders')
  }

  /**
   * Create a simple race track map (legacy)
   */
  createRaceTrack(): void {
    this.createCityMap() // Use city map by default now
  }

  private createCityGround(): void {
    // Sidewalk/pavement ground
    const ground = MeshBuilder.CreateGround('ground', {
      width: 300,
      height: 300,
      subdivisions: 32,
    }, this.scene)

    const groundMaterial = new PBRMaterial('groundMaterial', this.scene)
    groundMaterial.albedoColor = new Color3(0.4, 0.4, 0.38) // Gray pavement
    groundMaterial.metallic = 0
    groundMaterial.roughness = 0.9
    ground.material = groundMaterial
    ground.receiveShadows = true
    ground.position.y = -0.02

    this.meshes.push(ground)
  }

  private createCityRoads(): void {
    const roadMaterial = new PBRMaterial('roadMaterial', this.scene)
    roadMaterial.albedoColor = new Color3(0.12, 0.12, 0.14)
    roadMaterial.metallic = 0.05
    roadMaterial.roughness = 0.85

    const roadWidth = 14
    
    // Main roads forming a grid
    const roads = [
      // Horizontal roads
      { x: 0, z: 0, width: 280, height: roadWidth, rotation: 0 },
      { x: 0, z: 60, width: 280, height: roadWidth, rotation: 0 },
      { x: 0, z: -60, width: 280, height: roadWidth, rotation: 0 },
      // Vertical roads  
      { x: 0, z: 0, width: 140, height: roadWidth, rotation: Math.PI / 2 },
      { x: 70, z: 0, width: 140, height: roadWidth, rotation: Math.PI / 2 },
      { x: -70, z: 0, width: 140, height: roadWidth, rotation: Math.PI / 2 },
      { x: 130, z: 0, width: 140, height: roadWidth, rotation: Math.PI / 2 },
      { x: -130, z: 0, width: 140, height: roadWidth, rotation: Math.PI / 2 },
    ]

    roads.forEach((road, i) => {
      const mesh = MeshBuilder.CreateGround(`road_${i}`, {
        width: road.width,
        height: road.height,
      }, this.scene)
      mesh.position = new Vector3(road.x, 0, road.z)
      mesh.rotation.y = road.rotation
      mesh.material = roadMaterial
      mesh.receiveShadows = true
      this.meshes.push(mesh)
    })

    // Add road markings
    this.createRoadMarkings()
  }

  private createRoadMarkings(): void {
    const lineMaterial = new StandardMaterial('lineMaterial', this.scene)
    lineMaterial.diffuseColor = new Color3(1, 1, 0.9)
    lineMaterial.emissiveColor = new Color3(0.3, 0.3, 0.25)

    // Center dashed lines for main horizontal roads
    const dashLength = 3
    const gapLength = 3
    
    for (let z of [0, 60, -60]) {
      for (let x = -130; x < 130; x += dashLength + gapLength) {
        const dash = MeshBuilder.CreateBox(`dash_${z}_${x}`, {
          width: dashLength,
          height: 0.02,
          depth: 0.2,
        }, this.scene)
        dash.position = new Vector3(x, 0.01, z)
        dash.material = lineMaterial
        this.meshes.push(dash)
      }
    }

    // Crosswalk stripes at intersections
    const crosswalkMaterial = new StandardMaterial('crosswalkMaterial', this.scene)
    crosswalkMaterial.diffuseColor = new Color3(1, 1, 1)
    
    const intersections = [
      { x: 0, z: 0 }, { x: 70, z: 0 }, { x: -70, z: 0 },
      { x: 0, z: 60 }, { x: 70, z: 60 }, { x: -70, z: 60 },
      { x: 0, z: -60 }, { x: 70, z: -60 }, { x: -70, z: -60 },
    ]

    intersections.forEach((inter, i) => {
      // Create crosswalk stripes
      for (let stripe = -3; stripe <= 3; stripe++) {
        const cw = MeshBuilder.CreateBox(`crosswalk_${i}_${stripe}`, {
          width: 0.5,
          height: 0.02,
          depth: 4,
        }, this.scene)
        cw.position = new Vector3(inter.x + stripe * 1.2, 0.01, inter.z + 10)
        cw.material = crosswalkMaterial
        this.meshes.push(cw)
      }
    })
  }

  private createRoadBarriers(): void {
    // Concrete barriers / guardrails along roads
    const barrierMaterial = new PBRMaterial('barrierMaterial', this.scene)
    barrierMaterial.albedoColor = new Color3(0.7, 0.7, 0.65)
    barrierMaterial.metallic = 0.1
    barrierMaterial.roughness = 0.8

    const yellowMaterial = new PBRMaterial('yellowBarrierMaterial', this.scene)
    yellowMaterial.albedoColor = new Color3(0.9, 0.8, 0.1)
    yellowMaterial.metallic = 0.2
    yellowMaterial.roughness = 0.6

    const barrierHeight = 0.6
    const barrierDepth = 0.4
    
    // Road edge barriers (both sides of main roads)
    const barrierConfigs = [
      // Main horizontal road z=0 barriers
      { x: 0, z: 8, length: 50, rotation: 0, side: 'top' },
      { x: 0, z: -8, length: 50, rotation: 0, side: 'bottom' },
      // Between intersections on z=0
      { x: 35, z: 8, length: 25, rotation: 0 },
      { x: -35, z: 8, length: 25, rotation: 0 },
      { x: 35, z: -8, length: 25, rotation: 0 },
      { x: -35, z: -8, length: 25, rotation: 0 },
      { x: 100, z: 8, length: 45, rotation: 0 },
      { x: -100, z: 8, length: 45, rotation: 0 },
      { x: 100, z: -8, length: 45, rotation: 0 },
      { x: -100, z: -8, length: 45, rotation: 0 },
      
      // Road z=60 barriers
      { x: 35, z: 68, length: 25, rotation: 0 },
      { x: -35, z: 68, length: 25, rotation: 0 },
      { x: 35, z: 52, length: 25, rotation: 0 },
      { x: -35, z: 52, length: 25, rotation: 0 },
      { x: 100, z: 68, length: 45, rotation: 0 },
      { x: -100, z: 68, length: 45, rotation: 0 },
      { x: 100, z: 52, length: 45, rotation: 0 },
      { x: -100, z: 52, length: 45, rotation: 0 },
      
      // Road z=-60 barriers
      { x: 35, z: -52, length: 25, rotation: 0 },
      { x: -35, z: -52, length: 25, rotation: 0 },
      { x: 35, z: -68, length: 25, rotation: 0 },
      { x: -35, z: -68, length: 25, rotation: 0 },
      { x: 100, z: -52, length: 45, rotation: 0 },
      { x: -100, z: -52, length: 45, rotation: 0 },
      { x: 100, z: -68, length: 45, rotation: 0 },
      { x: -100, z: -68, length: 45, rotation: 0 },
      
      // Vertical road barriers (x=70)
      { x: 78, z: 30, length: 35, rotation: Math.PI / 2 },
      { x: 62, z: 30, length: 35, rotation: Math.PI / 2 },
      { x: 78, z: -30, length: 35, rotation: Math.PI / 2 },
      { x: 62, z: -30, length: 35, rotation: Math.PI / 2 },
      
      // Vertical road barriers (x=-70)
      { x: -62, z: 30, length: 35, rotation: Math.PI / 2 },
      { x: -78, z: 30, length: 35, rotation: Math.PI / 2 },
      { x: -62, z: -30, length: 35, rotation: Math.PI / 2 },
      { x: -78, z: -30, length: 35, rotation: Math.PI / 2 },
    ]

    barrierConfigs.forEach((config, i) => {
      const barrier = MeshBuilder.CreateBox(`barrier_${i}`, {
        width: config.length,
        height: barrierHeight,
        depth: barrierDepth,
      }, this.scene)
      
      barrier.position = new Vector3(config.x, barrierHeight / 2, config.z)
      barrier.rotation.y = config.rotation || 0
      barrier.material = i % 3 === 0 ? yellowMaterial : barrierMaterial
      barrier.receiveShadows = true
      this.lightingSetup?.addShadowCaster(barrier)
      this.meshes.push(barrier)

      // Add collider
      this.addBoxCollider(barrier)
    })
  }

  private createBuildings(): void {
    const buildingColors = [
      new Color3(0.6, 0.55, 0.5),   // Beige
      new Color3(0.5, 0.5, 0.55),   // Blue-gray
      new Color3(0.55, 0.45, 0.4),  // Brown
      new Color3(0.7, 0.7, 0.7),    // Light gray
      new Color3(0.4, 0.45, 0.5),   // Dark blue
    ]

    const windowMaterial = new PBRMaterial('windowMaterial', this.scene)
    windowMaterial.albedoColor = new Color3(0.3, 0.4, 0.5)
    windowMaterial.metallic = 0.8
    windowMaterial.roughness = 0.2

    // Building positions in city blocks
    const buildings = [
      // Block 1 (between x=0-70, z=0-60)
      { x: 35, z: 30, width: 20, depth: 15, height: 25 },
      { x: 20, z: 35, width: 12, depth: 12, height: 18 },
      { x: 50, z: 40, width: 15, depth: 10, height: 30 },
      
      // Block 2 (between x=-70-0, z=0-60)
      { x: -35, z: 30, width: 18, depth: 16, height: 22 },
      { x: -20, z: 40, width: 14, depth: 12, height: 28 },
      { x: -50, z: 35, width: 12, depth: 14, height: 20 },
      
      // Block 3 (between x=0-70, z=-60-0)
      { x: 35, z: -30, width: 22, depth: 18, height: 35 },
      { x: 20, z: -40, width: 10, depth: 10, height: 15 },
      { x: 55, z: -35, width: 14, depth: 12, height: 24 },
      
      // Block 4 (between x=-70-0, z=-60-0)
      { x: -35, z: -30, width: 16, depth: 14, height: 20 },
      { x: -20, z: -35, width: 12, depth: 16, height: 32 },
      { x: -55, z: -40, width: 18, depth: 12, height: 26 },
      
      // Outer blocks
      { x: 100, z: 30, width: 20, depth: 18, height: 28 },
      { x: -100, z: 30, width: 18, depth: 20, height: 24 },
      { x: 100, z: -30, width: 22, depth: 16, height: 30 },
      { x: -100, z: -30, width: 16, depth: 18, height: 22 },
    ]

    buildings.forEach((b, i) => {
      // Main building body
      const building = MeshBuilder.CreateBox(`building_${i}`, {
        width: b.width,
        height: b.height,
        depth: b.depth,
      }, this.scene)
      
      building.position = new Vector3(b.x, b.height / 2, b.z)
      
      const material = new PBRMaterial(`buildingMat_${i}`, this.scene)
      material.albedoColor = buildingColors[i % buildingColors.length]
      material.metallic = 0.1
      material.roughness = 0.7
      building.material = material
      
      building.receiveShadows = true
      this.lightingSetup?.addShadowCaster(building)
      this.meshes.push(building)

      // Add collider for building
      this.addBoxCollider(building)

      // Add windows
      this.addBuildingWindows(building, b)
    })
  }

  private addBuildingWindows(building: AbstractMesh, config: { width: number; height: number; depth: number }): void {
    const windowMaterial = new PBRMaterial('windowMat_' + building.name, this.scene)
    windowMaterial.albedoColor = new Color3(0.2, 0.3, 0.4)
    windowMaterial.metallic = 0.9
    windowMaterial.roughness = 0.1
    windowMaterial.emissiveColor = new Color3(0.1, 0.15, 0.2) // Slight glow

    const windowRows = Math.floor(config.height / 4)
    const windowCols = Math.floor(config.width / 3)

    for (let row = 1; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        // Front face windows
        const windowMesh = MeshBuilder.CreateBox(`window_${building.name}_${row}_${col}`, {
          width: 1.5,
          height: 2,
          depth: 0.1,
        }, this.scene)
        
        windowMesh.position = new Vector3(
          building.position.x - config.width / 2 + 2 + col * 3,
          row * 4,
          building.position.z + config.depth / 2 + 0.05
        )
        windowMesh.material = windowMaterial
        this.meshes.push(windowMesh)
      }
    }
  }

  private createStreetProps(): void {
    // Street lights
    const lightPostMaterial = new PBRMaterial('lightPostMaterial', this.scene)
    lightPostMaterial.albedoColor = new Color3(0.2, 0.2, 0.2)
    lightPostMaterial.metallic = 0.8
    lightPostMaterial.roughness = 0.3

    const lightBulbMaterial = new PBRMaterial('lightBulbMaterial', this.scene)
    lightBulbMaterial.albedoColor = new Color3(1, 0.95, 0.8)
    lightBulbMaterial.emissiveColor = new Color3(0.5, 0.45, 0.3)

    // Lamp post positions along roads
    const lampPositions = [
      // Along z=0 road
      { x: 20, z: 10 }, { x: 50, z: 10 }, { x: -20, z: 10 }, { x: -50, z: 10 },
      { x: 20, z: -10 }, { x: 50, z: -10 }, { x: -20, z: -10 }, { x: -50, z: -10 },
      // Along z=60 road
      { x: 20, z: 70 }, { x: 50, z: 70 }, { x: -20, z: 70 }, { x: -50, z: 70 },
      // Along z=-60 road  
      { x: 20, z: -70 }, { x: 50, z: -70 }, { x: -20, z: -70 }, { x: -50, z: -70 },
    ]

    lampPositions.forEach((pos, i) => {
      // Post
      const post = MeshBuilder.CreateCylinder(`lampPost_${i}`, {
        diameter: 0.2,
        height: 6,
      }, this.scene)
      post.position = new Vector3(pos.x, 3, pos.z)
      post.material = lightPostMaterial
      this.lightingSetup?.addShadowCaster(post)
      this.meshes.push(post)

      // Arm
      const arm = MeshBuilder.CreateBox(`lampArm_${i}`, {
        width: 2,
        height: 0.15,
        depth: 0.15,
      }, this.scene)
      arm.position = new Vector3(pos.x + 1, 5.8, pos.z)
      arm.material = lightPostMaterial
      this.meshes.push(arm)

      // Light bulb
      const bulb = MeshBuilder.CreateSphere(`lampBulb_${i}`, {
        diameter: 0.5,
      }, this.scene)
      bulb.position = new Vector3(pos.x + 2, 5.5, pos.z)
      bulb.material = lightBulbMaterial
      this.meshes.push(bulb)

      // Add collider for lamp post (thin)
      this.colliders.push({
        min: new Vector3(pos.x - 0.3, 0, pos.z - 0.3),
        max: new Vector3(pos.x + 0.3, 6, pos.z + 0.3),
      })
    })

    // Traffic cones at some intersections
    this.createTrafficCones()
    
    // Benches
    this.createBenches()
  }

  private createTrafficCones(): void {
    const coneMaterial = new PBRMaterial('coneMaterial', this.scene)
    coneMaterial.albedoColor = new Color3(1, 0.4, 0)
    coneMaterial.metallic = 0.1
    coneMaterial.roughness = 0.7

    const conePositions = [
      { x: 10, z: 15 }, { x: 12, z: 15 }, { x: 14, z: 15 },
      { x: -10, z: -15 }, { x: -12, z: -15 },
    ]

    conePositions.forEach((pos, i) => {
      const cone = MeshBuilder.CreateCylinder(`cone_${i}`, {
        diameterTop: 0.1,
        diameterBottom: 0.5,
        height: 0.7,
      }, this.scene)
      cone.position = new Vector3(pos.x, 0.35, pos.z)
      cone.material = coneMaterial
      this.lightingSetup?.addShadowCaster(cone)
      this.meshes.push(cone)

      // Small collider for cone
      this.colliders.push({
        min: new Vector3(pos.x - 0.25, 0, pos.z - 0.25),
        max: new Vector3(pos.x + 0.25, 0.7, pos.z + 0.25),
      })
    })
  }

  private createBenches(): void {
    const woodMaterial = new PBRMaterial('woodMaterial', this.scene)
    woodMaterial.albedoColor = new Color3(0.5, 0.35, 0.2)
    woodMaterial.metallic = 0
    woodMaterial.roughness = 0.8

    const metalMaterial = new PBRMaterial('benchMetalMaterial', this.scene)
    metalMaterial.albedoColor = new Color3(0.3, 0.3, 0.3)
    metalMaterial.metallic = 0.7
    metalMaterial.roughness = 0.4

    const benchPositions = [
      { x: 15, z: 20, rotation: 0 },
      { x: -15, z: 20, rotation: 0 },
      { x: 15, z: -45, rotation: Math.PI },
    ]

    benchPositions.forEach((pos, i) => {
      // Seat
      const seat = MeshBuilder.CreateBox(`benchSeat_${i}`, {
        width: 2,
        height: 0.1,
        depth: 0.6,
      }, this.scene)
      seat.position = new Vector3(pos.x, 0.5, pos.z)
      seat.rotation.y = pos.rotation
      seat.material = woodMaterial
      this.meshes.push(seat)

      // Back
      const back = MeshBuilder.CreateBox(`benchBack_${i}`, {
        width: 2,
        height: 0.6,
        depth: 0.1,
      }, this.scene)
      back.position = new Vector3(pos.x, 0.8, pos.z - 0.25)
      back.rotation.y = pos.rotation
      back.material = woodMaterial
      this.meshes.push(back)

      // Legs
      for (let leg = -1; leg <= 1; leg += 2) {
        const legMesh = MeshBuilder.CreateBox(`benchLeg_${i}_${leg}`, {
          width: 0.1,
          height: 0.5,
          depth: 0.5,
        }, this.scene)
        legMesh.position = new Vector3(pos.x + leg * 0.8, 0.25, pos.z)
        legMesh.rotation.y = pos.rotation
        legMesh.material = metalMaterial
        this.meshes.push(legMesh)
      }

      // Collider for bench
      this.colliders.push({
        min: new Vector3(pos.x - 1.2, 0, pos.z - 0.5),
        max: new Vector3(pos.x + 1.2, 1, pos.z + 0.5),
      })
    })
  }

  private createMapBoundaryWalls(): void {
    const wallMaterial = new PBRMaterial('boundaryWallMaterial', this.scene)
    wallMaterial.albedoColor = new Color3(0.5, 0.5, 0.5)
    wallMaterial.metallic = 0.2
    wallMaterial.roughness = 0.8

    const wallHeight = 3
    const wallThickness = 2
    const mapSize = 150

    // Create boundary walls
    const walls = [
      { x: 0, z: mapSize, width: mapSize * 2, rotation: 0 },      // North
      { x: 0, z: -mapSize, width: mapSize * 2, rotation: 0 },     // South
      { x: mapSize, z: 0, width: mapSize * 2, rotation: Math.PI / 2 },   // East
      { x: -mapSize, z: 0, width: mapSize * 2, rotation: Math.PI / 2 },  // West
    ]

    walls.forEach((wall, i) => {
      const mesh = MeshBuilder.CreateBox(`boundaryWall_${i}`, {
        width: wall.width,
        height: wallHeight,
        depth: wallThickness,
      }, this.scene)
      mesh.position = new Vector3(wall.x, wallHeight / 2, wall.z)
      mesh.rotation.y = wall.rotation
      mesh.material = wallMaterial
      mesh.receiveShadows = true
      this.lightingSetup?.addShadowCaster(mesh)
      this.meshes.push(mesh)
    })
  }

  private addBoxCollider(mesh: AbstractMesh): void {
    mesh.computeWorldMatrix(true)
    const boundingInfo = mesh.getBoundingInfo()
    const min = boundingInfo.boundingBox.minimumWorld
    const max = boundingInfo.boundingBox.maximumWorld
    
    this.colliders.push({
      min: min.clone(),
      max: max.clone(),
      mesh: mesh,
    })
  }

  // Legacy methods for compatibility
  private createGround(): void {
    this.createCityGround()
  }

  private createRoad(): void {
    this.createCityRoads()
  }

  private createBarriers(): void {
    this.createRoadBarriers()
  }

  private createDecorations(): void {
    this.createBuildings()
    this.createStreetProps()
  }

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose())
    this.meshes = []
    this.colliders = []
    console.log('[SimpleMap] Disposed')
  }
}
