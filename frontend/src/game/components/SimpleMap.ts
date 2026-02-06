import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  AbstractMesh,
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
  
  // Map boundaries - diperluas untuk objektif game
  private mapBounds = {
    minX: -400,
    maxX: 400,
    minZ: -600,
    maxZ: 400,
  }

  constructor(scene: Scene, lightingSetup?: LightingSetup) {
    this.scene = scene
    this.lightingSetup = lightingSetup ?? null
  }

  getColliders(): Collider[] {
    return this.colliders
  }

  getMapBounds() {
    return this.mapBounds
  }

  checkCollision(position: Vector3, radius: number = 1.5): { collided: boolean; normal: Vector3; penetration: number } {
    let result = { collided: false, normal: Vector3.Zero(), penetration: 0 }
    
    // Check map boundaries
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
   * Create Solo City map - urban environment with buildings, roads, and obstacles
   */
  createSoloCity(): void {
    this.createGround()
    this.createRoads()
    this.createRoadBarriers()
    this.createBuildings()
    this.createLake()
    this.createTrees()
    this.createBushes()
    this.createMapBoundaryWalls()
    
    console.log('[SimpleMap] Solo City map created with', this.colliders.length, 'colliders')
  }

  /**
   * Create Sriwedari Park map - open park environment with minimal obstacles
   * Perfect for testing and free driving
   */
  createSriwedariPark(): void {
    this.createParkGround()
    this.createParkPaths()
    this.createParkTrees()
    this.createParkBenches()
    this.createParkFountain()
    this.createParkLamps()
    this.createMapBoundaryWalls()
    
    console.log('[SimpleMap] Sriwedari Park map created with', this.colliders.length, 'colliders')
  }

  // Legacy method - creates Solo City
  createRaceTrack(): void {
    this.createSoloCity()
  }

  createCityMap(): void {
    this.createSoloCity()
  }

  // ============================================
  // SRIWEDARI PARK SPECIFIC CREATION METHODS
  // ============================================

  private createParkGround(): void {
    // Lush green grass for park
    const ground = MeshBuilder.CreateGround('parkGround', {
      width: 800,
      height: 1000,
      subdivisions: 32,
    }, this.scene)

    const groundMaterial = new PBRMaterial('parkGroundMaterial', this.scene)
    groundMaterial.albedoColor = new Color3(0.35, 0.55, 0.25) // Bright green grass
    groundMaterial.metallic = 0
    groundMaterial.roughness = 0.95
    ground.material = groundMaterial
    ground.receiveShadows = true
    ground.position.y = -0.02
    ground.position.z = -100

    this.meshes.push(ground)
  }

  private createParkPaths(): void {
    // Stone/gravel path material
    const pathMaterial = new PBRMaterial('pathMaterial', this.scene)
    pathMaterial.albedoColor = new Color3(0.65, 0.6, 0.55) // Light stone color
    pathMaterial.metallic = 0
    pathMaterial.roughness = 0.9

    const pathWidth = 12

    // Main circular path around the park
    const mainPaths = [
      // Horizontal main path
      { x: 0, z: 0, width: 300, depth: pathWidth, rotation: 0 },
      // Vertical main path
      { x: 0, z: -50, width: 200, depth: pathWidth, rotation: Math.PI / 2 },
      // Diagonal paths for variety
      { x: -80, z: 50, width: 100, depth: pathWidth * 0.8, rotation: Math.PI / 6 },
      { x: 80, z: 50, width: 100, depth: pathWidth * 0.8, rotation: -Math.PI / 6 },
      // Wide open area in center (plaza)
      { x: 0, z: 0, width: 60, depth: 60, rotation: 0 },
    ]

    mainPaths.forEach((path, i) => {
      const pathMesh = MeshBuilder.CreateGround(`parkPath_${i}`, {
        width: path.width,
        height: path.depth,
      }, this.scene)
      pathMesh.position = new Vector3(path.x, 0.01, path.z)
      pathMesh.rotation.y = path.rotation
      pathMesh.material = pathMaterial
      pathMesh.receiveShadows = true
      this.meshes.push(pathMesh)
    })
  }

  private createParkTrees(): void {
    // Scattered trees around the edges - not blocking paths
    const treePositions = [
      // Left side trees
      { x: -150, z: 100 }, { x: -160, z: 50 }, { x: -140, z: -20 },
      { x: -155, z: -80 }, { x: -145, z: -150 },
      // Right side trees
      { x: 150, z: 100 }, { x: 160, z: 50 }, { x: 140, z: -20 },
      { x: 155, z: -80 }, { x: 145, z: -150 },
      // Back trees
      { x: -80, z: 150 }, { x: 0, z: 160 }, { x: 80, z: 150 },
      // Front scattered trees
      { x: -100, z: -200 }, { x: 100, z: -200 },
      // Some middle area trees (away from paths)
      { x: -100, z: -50 }, { x: 100, z: -50 },
      { x: -60, z: 100 }, { x: 60, z: 100 },
    ]

    treePositions.forEach((pos, i) => {
      this.createParkTree(pos.x, pos.z, i)
    })
  }

  private createParkTree(x: number, z: number, index: number): void {
    // Tree trunk
    const trunkHeight = 3 + Math.random() * 2
    const trunk = MeshBuilder.CreateCylinder(`parkTreeTrunk_${index}`, {
      diameter: 0.8,
      height: trunkHeight,
      tessellation: 12,
    }, this.scene)
    trunk.position = new Vector3(x, trunkHeight / 2, z)

    const trunkMaterial = new PBRMaterial(`parkTrunkMat_${index}`, this.scene)
    trunkMaterial.albedoColor = new Color3(0.4, 0.28, 0.18)
    trunkMaterial.metallic = 0
    trunkMaterial.roughness = 0.95
    trunk.material = trunkMaterial
    trunk.receiveShadows = true
    this.lightingSetup?.addShadowCaster(trunk)
    this.meshes.push(trunk)

    // Tree foliage (bigger, rounder for park aesthetic)
    const foliageSize = 4 + Math.random() * 2
    const foliage = MeshBuilder.CreateSphere(`parkTreeFoliage_${index}`, {
      diameter: foliageSize,
      segments: 8,
    }, this.scene)
    foliage.position = new Vector3(x, trunkHeight + foliageSize / 3, z)

    const foliageMaterial = new PBRMaterial(`parkFoliageMat_${index}`, this.scene)
    foliageMaterial.albedoColor = new Color3(0.2 + Math.random() * 0.15, 0.5 + Math.random() * 0.2, 0.15)
    foliageMaterial.metallic = 0
    foliageMaterial.roughness = 0.9
    foliage.material = foliageMaterial
    foliage.receiveShadows = true
    this.lightingSetup?.addShadowCaster(foliage)
    this.meshes.push(foliage)

    // Add collider for trunk only (small, won't block much)
    this.addBoxCollider(trunk)
  }

  private createParkBenches(): void {
    // Park benches scattered around paths
    const benchPositions = [
      { x: -30, z: 15, rotation: 0 },
      { x: 30, z: 15, rotation: 0 },
      { x: -30, z: -15, rotation: Math.PI },
      { x: 30, z: -15, rotation: Math.PI },
      { x: 15, z: -80, rotation: Math.PI / 2 },
      { x: -15, z: -80, rotation: -Math.PI / 2 },
    ]

    const benchMaterial = new PBRMaterial('benchMaterial', this.scene)
    benchMaterial.albedoColor = new Color3(0.45, 0.35, 0.25) // Wood color
    benchMaterial.metallic = 0.1
    benchMaterial.roughness = 0.8

    const metalMaterial = new PBRMaterial('benchMetalMaterial', this.scene)
    metalMaterial.albedoColor = new Color3(0.2, 0.2, 0.2)
    metalMaterial.metallic = 0.8
    metalMaterial.roughness = 0.3

    benchPositions.forEach((pos, i) => {
      // Bench seat
      const seat = MeshBuilder.CreateBox(`benchSeat_${i}`, {
        width: 2.5,
        height: 0.15,
        depth: 0.6,
      }, this.scene)
      seat.position = new Vector3(pos.x, 0.5, pos.z)
      seat.rotation.y = pos.rotation
      seat.material = benchMaterial
      seat.receiveShadows = true
      this.lightingSetup?.addShadowCaster(seat)
      this.meshes.push(seat)

      // Bench back
      const back = MeshBuilder.CreateBox(`benchBack_${i}`, {
        width: 2.5,
        height: 0.6,
        depth: 0.1,
      }, this.scene)
      back.position = new Vector3(
        pos.x - Math.sin(pos.rotation) * 0.25,
        0.8,
        pos.z - Math.cos(pos.rotation) * 0.25
      )
      back.rotation.y = pos.rotation
      back.material = benchMaterial
      back.receiveShadows = true
      this.lightingSetup?.addShadowCaster(back)
      this.meshes.push(back)

      // Bench legs (metal)
      const legPositions = [-1, 1]
      legPositions.forEach((offset, j) => {
        const leg = MeshBuilder.CreateBox(`benchLeg_${i}_${j}`, {
          width: 0.1,
          height: 0.5,
          depth: 0.5,
        }, this.scene)
        const legX = pos.x + Math.cos(pos.rotation) * offset
        const legZ = pos.z - Math.sin(pos.rotation) * offset
        leg.position = new Vector3(legX, 0.25, legZ)
        leg.rotation.y = pos.rotation
        leg.material = metalMaterial
        leg.receiveShadows = true
        this.meshes.push(leg)
      })

      // Add small collider for bench
      this.colliders.push({
        min: new Vector3(pos.x - 1.5, 0, pos.z - 0.5),
        max: new Vector3(pos.x + 1.5, 1, pos.z + 0.5),
      })
    })
  }

  private createParkFountain(): void {
    // Central fountain in the plaza
    const fountainMaterial = new PBRMaterial('fountainMaterial', this.scene)
    fountainMaterial.albedoColor = new Color3(0.7, 0.7, 0.75) // Light stone
    fountainMaterial.metallic = 0.2
    fountainMaterial.roughness = 0.6

    const waterMaterial = new PBRMaterial('waterMaterial', this.scene)
    waterMaterial.albedoColor = new Color3(0.3, 0.5, 0.7)
    waterMaterial.metallic = 0.1
    waterMaterial.roughness = 0.2
    waterMaterial.alpha = 0.8

    // Fountain base (outer ring)
    const base = MeshBuilder.CreateCylinder('fountainBase', {
      diameter: 10,
      height: 0.8,
      tessellation: 32,
    }, this.scene)
    base.position = new Vector3(0, 0.4, 0)
    base.material = fountainMaterial
    base.receiveShadows = true
    this.lightingSetup?.addShadowCaster(base)
    this.meshes.push(base)

    // Water pool
    const pool = MeshBuilder.CreateCylinder('fountainPool', {
      diameter: 8,
      height: 0.6,
      tessellation: 32,
    }, this.scene)
    pool.position = new Vector3(0, 0.5, 0)
    pool.material = waterMaterial
    this.meshes.push(pool)

    // Center pillar
    const pillar = MeshBuilder.CreateCylinder('fountainPillar', {
      diameter: 1.5,
      height: 3,
      tessellation: 16,
    }, this.scene)
    pillar.position = new Vector3(0, 1.5, 0)
    pillar.material = fountainMaterial
    pillar.receiveShadows = true
    this.lightingSetup?.addShadowCaster(pillar)
    this.meshes.push(pillar)

    // Top bowl
    const bowl = MeshBuilder.CreateTorus('fountainBowl', {
      diameter: 3,
      thickness: 0.5,
      tessellation: 32,
    }, this.scene)
    bowl.position = new Vector3(0, 3, 0)
    bowl.material = fountainMaterial
    bowl.receiveShadows = true
    this.lightingSetup?.addShadowCaster(bowl)
    this.meshes.push(bowl)

    // Add collider for fountain
    this.colliders.push({
      min: new Vector3(-5, 0, -5),
      max: new Vector3(5, 3.5, 5),
    })
  }

  private createParkLamps(): void {
    // Street lamps along paths
    const lampPositions = [
      { x: -50, z: 0 }, { x: 50, z: 0 },
      { x: 0, z: 50 }, { x: 0, z: -100 },
      { x: -100, z: 80 }, { x: 100, z: 80 },
      { x: -100, z: -120 }, { x: 100, z: -120 },
    ]

    const poleMaterial = new PBRMaterial('lampPoleMaterial', this.scene)
    poleMaterial.albedoColor = new Color3(0.15, 0.15, 0.15)
    poleMaterial.metallic = 0.9
    poleMaterial.roughness = 0.3

    const lampMaterial = new PBRMaterial('lampLightMaterial', this.scene)
    lampMaterial.albedoColor = new Color3(1, 0.95, 0.8)
    lampMaterial.emissiveColor = new Color3(1, 0.9, 0.7)
    lampMaterial.emissiveIntensity = 0.3

    lampPositions.forEach((pos, i) => {
      // Lamp pole
      const pole = MeshBuilder.CreateCylinder(`lampPole_${i}`, {
        diameter: 0.2,
        height: 4,
        tessellation: 8,
      }, this.scene)
      pole.position = new Vector3(pos.x, 2, pos.z)
      pole.material = poleMaterial
      pole.receiveShadows = true
      this.lightingSetup?.addShadowCaster(pole)
      this.meshes.push(pole)

      // Lamp head
      const head = MeshBuilder.CreateSphere(`lampHead_${i}`, {
        diameter: 0.6,
        segments: 8,
      }, this.scene)
      head.position = new Vector3(pos.x, 4.2, pos.z)
      head.material = lampMaterial
      this.meshes.push(head)

      // Small collider for lamp pole
      this.colliders.push({
        min: new Vector3(pos.x - 0.3, 0, pos.z - 0.3),
        max: new Vector3(pos.x + 0.3, 4.5, pos.z + 0.3),
      })
    })
  }

  // ============================================
  // SOLO CITY SPECIFIC METHODS (Original)
  // ============================================

  private createGround(): void {
    // Green grass ground
    const ground = MeshBuilder.CreateGround('ground', {
      width: 800,
      height: 1000,
      subdivisions: 32,
    }, this.scene)

    const groundMaterial = new PBRMaterial('groundMaterial', this.scene)
    groundMaterial.albedoColor = new Color3(0.55, 0.65, 0.45) // Sage green
    groundMaterial.metallic = 0
    groundMaterial.roughness = 0.95
    ground.material = groundMaterial
    ground.receiveShadows = true
    ground.position.y = -0.02
    ground.position.z = -100

    this.meshes.push(ground)
  }

  private createRoads(): void {
    const roadMaterial = new PBRMaterial('roadMaterial', this.scene)
    roadMaterial.albedoColor = new Color3(0.45, 0.48, 0.42) // Gray-green road
    roadMaterial.metallic = 0.05
    roadMaterial.roughness = 0.85

    const roadWidth = 16
    const ringRoadWidth = 20 // Wider for ring road

    // ============================================
    // RING ROAD + CENTRAL DISTRICT LAYOUT
    // ============================================

    // === CENTRAL DISTRICT (Downtown Solo City - Original Grid) ===
    
    // Top horizontal road (between Gedung A and B area)
    this.createRoadSegment('road_top', -40, 150, 180, roadWidth, roadMaterial)
    
    // Middle horizontal road (between Gedung C/D area)
    this.createRoadSegment('road_mid', 5, 50, 180, roadWidth, roadMaterial)
    
    // Lower horizontal road (between Gedung F and G area)
    this.createRoadSegment('road_lower', -10, -50, 120, roadWidth, roadMaterial)
    
    // Horizontal road connecting to Gedung H
    this.createRoadSegment('road_to_H', 135, -100, 70, roadWidth, roadMaterial)
    
    // Horizontal road south of Gedung H
    this.createRoadSegment('road_south_H', 110, -178, 130, roadWidth, roadMaterial)

    // Main center vertical road (runs through the map)
    this.createRoadSegment('road_center_v', 50, -10, roadWidth, 340, roadMaterial)
    
    // Left vertical road
    this.createRoadSegment('road_left_v', -80, 50, roadWidth, 200, roadMaterial)
    
    // Right vertical road - to junction with Gedung H road
    this.createRoadSegment('road_right_v', 90, -27, roadWidth, 170, roadMaterial)
    
    // Vertical road to Gedung H (east side)
    this.createRoadSegment('road_gedungH_east', 170, -139, roadWidth, 94, roadMaterial)

    // Top-left curve (near Gedung A)
    this.createCurveRoad('curve_tl', -80, 150, 0, Math.PI / 2, roadWidth)
    
    // Top-right curve
    this.createCurveRoad('curve_tr', 50, 150, Math.PI / 2, Math.PI, roadWidth)

    // === RING ROAD (Outer Circle) ===
    // Ring road segments forming a large circle/square around central district
    const ringRadius = 280
    
    // North ring segment (extended to reach ring_east at x=284)
    this.createRoadSegment('ring_north', 2, 300, 564, ringRoadWidth, roadMaterial)
    
    // South ring segment (extended to reach ring_east at x=284)
    this.createRoadSegment('ring_south', 2, -500, 564, ringRoadWidth, roadMaterial)
    
    // East ring segment
    this.createRoadSegment('ring_east', 284, -100, ringRoadWidth, 800, roadMaterial)
    
    // West ring segment
    this.createRoadSegment('ring_west', -280, -100, ringRoadWidth, 800, roadMaterial)

    // === RADIAL ROADS (Connecting Center to Ring) ===
    
    // North radial - extends road_center_v to ring
    this.createRoadSegment('radial_north', 50, 240, roadWidth, 180, roadMaterial)
    
    // South radial - extends road_center_v to ring (shifted north and extended to connect)
    this.createRoadSegment('radial_south', 50, -340, roadWidth, 320, roadMaterial)
    
    // East radial - extends from center to ring
    this.createRoadSegment('radial_east', 225, -100, 118, roadWidth, roadMaterial)
    
    // West radial - extends from center to ring
    this.createRoadSegment('radial_west', -180, 50, 200, roadWidth, roadMaterial)

    // === SUBURBAN ROADS (Outside Ring) ===
    
    // North suburban area
    this.createRoadSegment('suburb_north_1', -150, 300, 200, roadWidth, roadMaterial)
    this.createRoadSegment('suburb_north_2', 150, 300, 200, roadWidth, roadMaterial)
    
    // South suburban area
    this.createRoadSegment('suburb_south_1', -150, -500, 200, roadWidth, roadMaterial)
    this.createRoadSegment('suburb_south_2', 150, -500, 200, roadWidth, roadMaterial)
    
    // East suburban
    this.createRoadSegment('suburb_east_1', 284, 100, roadWidth, 180, roadMaterial)
    this.createRoadSegment('suburb_east_2', 284, -300, roadWidth, 180, roadMaterial)
    
    // West suburban
    this.createRoadSegment('suburb_west_1', -280, 100, roadWidth, 180, roadMaterial)
    this.createRoadSegment('suburb_west_2', -280, -300, roadWidth, 180, roadMaterial)

    // === JUNCTIONS ===
    
    // Central district junctions (original)
    this.createJunction(-80, 150, roadWidth)
    this.createJunction(50, 150, roadWidth)
    this.createJunction(-80, 50, roadWidth)
    this.createJunction(50, 50, roadWidth)
    this.createJunction(-80, -50, roadWidth)
    this.createJunction(50, -50, roadWidth)
    this.createJunction(90, -100, roadWidth)
    this.createJunction(170, -100, roadWidth)
    this.createJunction(170, -178, roadWidth)
    this.createJunction(50, -178, roadWidth)
    
    // Ring road intersections with radial roads
    this.createJunction(50, 300, ringRoadWidth)    // North ring + radial_north
    this.createJunction(50, -500, ringRoadWidth)   // South ring + radial_south
    this.createJunction(284, -100, ringRoadWidth)  // East ring + radial_east
    this.createJunction(-280, 50, ringRoadWidth)   // West ring + radial_west
    
    // Ring road corners
    this.createJunction(284, 300, ringRoadWidth)   // NE corner
    this.createJunction(-280, 300, ringRoadWidth)  // NW corner
    this.createJunction(284, -500, ringRoadWidth)  // SE corner
    this.createJunction(-280, -500, ringRoadWidth) // SW corner
    
    // Suburban intersections
    this.createJunction(-150, 300, roadWidth)  // North suburb west
    this.createJunction(150, 300, roadWidth)   // North suburb east
    this.createJunction(-150, -500, roadWidth) // South suburb west
    this.createJunction(150, -500, roadWidth)  // South suburb east
    this.createJunction(284, 100, roadWidth)   // East suburb north
    this.createJunction(284, -300, roadWidth)  // East suburb south
    this.createJunction(-280, 100, roadWidth)  // West suburb north
    this.createJunction(-280, -300, roadWidth) // West suburb south

    // Road markings
    this.createRoadMarkings()
  }

  private createRoadSegment(
    name: string, 
    x: number, 
    z: number, 
    width: number, 
    height: number, 
    material: PBRMaterial
  ): void {
    const road = MeshBuilder.CreateGround(name, {
      width: width,
      height: height,
    }, this.scene)
    road.position = new Vector3(x, 0.01, z)
    road.material = material
    road.receiveShadows = true
    this.meshes.push(road)
  }

  private createCurveRoad(
    name: string,
    x: number,
    z: number,
    startAngle: number,
    endAngle: number,
    roadWidth: number
  ): void {
    const material = new PBRMaterial(`${name}_mat`, this.scene)
    material.albedoColor = new Color3(0.45, 0.48, 0.42)
    material.metallic = 0.05
    material.roughness = 0.85

    const curve = MeshBuilder.CreateDisc(name, {
      radius: roadWidth / 2 + 1,
      arc: Math.abs(endAngle - startAngle) / (2 * Math.PI),
      tessellation: 24,
    }, this.scene)
    curve.rotation.x = Math.PI / 2
    curve.rotation.y = startAngle
    curve.position = new Vector3(x, 0.01, z)
    curve.material = material
    curve.receiveShadows = true
    this.meshes.push(curve)
  }

  private createJunction(x: number, z: number, size: number): void {
    const material = new PBRMaterial(`junction_${x}_${z}`, this.scene)
    material.albedoColor = new Color3(0.45, 0.48, 0.42)
    material.metallic = 0.05
    material.roughness = 0.85

    const junction = MeshBuilder.CreateGround(`junction_${x}_${z}`, {
      width: size + 4,
      height: size + 4,
    }, this.scene)
    junction.position = new Vector3(x, 0.015, z)
    junction.material = material
    junction.receiveShadows = true
    this.meshes.push(junction)
  }

  private createRoadMarkings(): void {
    const lineMaterial = new StandardMaterial('lineMaterial', this.scene)
    lineMaterial.diffuseColor = new Color3(1, 1, 0.9)
    lineMaterial.emissiveColor = new Color3(0.3, 0.3, 0.25)

    // Dashed center lines for horizontal roads (central district + ring + suburban)
    const horizontalRoads = [
      // Central district
      { x: -40, z: 150, length: 180 },
      { x: 5, z: 50, length: 180 },
      { x: -10, z: -50, length: 120 },
      { x: 135, z: -100, length: 70 },
      { x: 110, z: -178, length: 130 },
      // Ring road
      { x: 2, z: 300, length: 564 },
      { x: 2, z: -500, length: 564 },
      // Radial roads (horizontal parts)
      { x: 225, z: -100, length: 118 },
      { x: -180, z: 50, length: 200 },
      // Suburban
      { x: -150, z: 300, length: 200 },
      { x: 150, z: 300, length: 200 },
      { x: -150, z: -500, length: 200 },
      { x: 150, z: -500, length: 200 },
    ]

    horizontalRoads.forEach(road => {
      for (let i = road.x - road.length / 2 + 5; i < road.x + road.length / 2; i += 10) {
        const dash = MeshBuilder.CreateBox(`dash_h_${road.z}_${i}`, {
          width: 5,
          height: 0.02,
          depth: 0.3,
        }, this.scene)
        dash.position = new Vector3(i, 0.02, road.z)
        dash.material = lineMaterial
        this.meshes.push(dash)
      }
    })

    // Dashed center lines for vertical roads (central district + ring + radial + suburban)
    const verticalRoads = [
      // Central district
      { x: 50, z: -20, length: 340 },
      { x: -80, z: 50, length: 200 },
      { x: 90, z: -27, length: 170 },
      { x: 170, z: -139, length: 94 },
      // Ring road
      { x: 284, z: -100, length: 800 },
      { x: -280, z: -100, length: 800 },
      // Radial roads
      { x: 50, z: 240, length: 180 },
      { x: 50, z: -340, length: 320 },
      // Suburban
      { x: 284, z: 100, length: 180 },
      { x: 284, z: -300, length: 180 },
      { x: -280, z: 100, length: 180 },
      { x: -280, z: -300, length: 180 },
    ]

    verticalRoads.forEach(road => {
      for (let i = road.z - road.length / 2 + 5; i < road.z + road.length / 2; i += 10) {
        const dash = MeshBuilder.CreateBox(`dash_v_${road.x}_${i}`, {
          width: 0.3,
          height: 0.02,
          depth: 5,
        }, this.scene)
        dash.position = new Vector3(road.x, 0.02, i)
        dash.material = lineMaterial
        this.meshes.push(dash)
      }
    })
  }

  private createRoadBarriers(): void {
    const barrierMaterial = new PBRMaterial('barrierMaterial', this.scene)
    barrierMaterial.albedoColor = new Color3(0.85, 0.85, 0.8) // Light gray/white
    barrierMaterial.metallic = 0.3
    barrierMaterial.roughness = 0.6

    const barrierHeight = 1.0
    const barrierWidth = 0.4
    const roadWidth = 16
    const ringRoadWidth = 20
    const offset = roadWidth / 2 + barrierWidth / 2 // Place barriers at road edge
    const ringOffset = ringRoadWidth / 2 + barrierWidth / 2
    const junctionGap = roadWidth + 2 // Gap size at intersections

    // Central district junctions (normal road width offset)
    const centralJunctions = [
      { x: -80, z: 150 },
      { x: 50, z: 150 },
      { x: -80, z: 50 },
      { x: 50, z: 50 },
      { x: 90, z: 50 },
      { x: -80, z: -50 },
      { x: 50, z: -50 },
      { x: 90, z: -100 },
      { x: 170, z: -100 },
      { x: 170, z: -178 },
      { x: 50, z: -178 },
    ]

    // Ring road junctions (ring road width offset)
    const ringJunctions = [
      // Ring road intersections with radial
      { x: 50, z: 300 },     // ring_north + radial_north
      { x: 50, z: -500 },    // ring_south + radial_south
      { x: 284, z: -100 },   // ring_east + radial_east
      { x: -280, z: 50 },    // ring_west + radial_west
      // Ring corners
      { x: 284, z: 300 },    // NE corner
      { x: -280, z: 300 },   // NW corner
      { x: 284, z: -500 },   // SE corner
      { x: -280, z: -500 },  // SW corner
      // Suburban on ring
      { x: -150, z: 300 },
      { x: 150, z: 300 },
      { x: -150, z: -500 },
      { x: 150, z: -500 },
      { x: 284, z: 100 },
      { x: 284, z: -300 },
      { x: -280, z: 100 },
      { x: -280, z: -300 },
    ]

    // Combined junctions for barrier gap calculation
    const junctions = [...centralJunctions, ...ringJunctions]

    // Horizontal roads with their barrier positions
    const horizontalRoads = [
      // Central district
      { x: -40, z: 150, length: 180, offset: offset },
      { x: 5, z: 50, length: 180, offset: offset },
      { x: -10, z: -50, length: 120, offset: offset },
      { x: 135, z: -100, length: 70, offset: offset },
      { x: 110, z: -178, length: 130, offset: offset },
      // Ring road (covers full north and south edges)
      { x: 2, z: 300, length: 564, offset: ringOffset },
      { x: 2, z: -500, length: 564, offset: ringOffset },
      // Radial horizontal
      { x: 225, z: -100, length: 118, offset: offset },
      { x: -180, z: 50, length: 200, offset: offset },
      // Note: suburban roads at z:300 and z:-500 share barriers with ring road
    ]

    // Create barriers for horizontal roads with gaps at junctions
    horizontalRoads.forEach((road, roadIdx) => {
      const startX = road.x - road.length / 2
      const endX = road.x + road.length / 2
      const currentOffset = road.offset
      
      // Find junctions that intersect this road (same z)
      const roadJunctions = junctions
        .filter(j => Math.abs(j.z - road.z) < 1 && j.x >= startX && j.x <= endX)
        .map(j => j.x)
        .sort((a, b) => a - b)

      // Create barrier segments with gaps at junctions
      this.createBarriersWithGaps(
        `barrier_h_n_${roadIdx}`,
        startX, endX,
        road.z + currentOffset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'horizontal'
      )
      this.createBarriersWithGaps(
        `barrier_h_s_${roadIdx}`,
        startX, endX,
        road.z - currentOffset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'horizontal'
      )
    })

    // Vertical roads
    const verticalRoads = [
      // Central district
      { x: 50, z: -10, length: 340, offset: offset },
      { x: -80, z: 50, length: 200, offset: offset },
      { x: 90, z: -27, length: 170, offset: offset },
      { x: 170, z: -139, length: 94, offset: offset },
      // Ring road (covers full east/west edges, no need for separate suburban barriers)
      { x: 284, z: -100, length: 800, offset: ringOffset },
      { x: -280, z: -100, length: 800, offset: ringOffset },
      // Radial vertical
      { x: 50, z: 240, length: 180, offset: offset },
      { x: 50, z: -340, length: 308, offset: offset },
      // Note: suburban roads at x:280 and x:-280 share barriers with ring road
    ]

    // Create barriers for vertical roads with gaps at junctions
    verticalRoads.forEach((road, roadIdx) => {
      const startZ = road.z - road.length / 2
      const endZ = road.z + road.length / 2
      const currentOffset = road.offset
      
      // Find junctions that intersect this road (same x)
      const roadJunctions = junctions
        .filter(j => Math.abs(j.x - road.x) < 1 && j.z >= startZ && j.z <= endZ)
        .map(j => j.z)
        .sort((a, b) => a - b)

      // Create barrier segments with gaps at junctions
      this.createBarriersWithGaps(
        `barrier_v_e_${roadIdx}`,
        startZ, endZ,
        road.x + currentOffset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'vertical'
      )
      this.createBarriersWithGaps(
        `barrier_v_w_${roadIdx}`,
        startZ, endZ,
        road.x - currentOffset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'vertical'
      )
    })

    // Add special barriers for T-junctions (forced turn) - only for central district
    this.createTJunctionBarriers(offset, barrierHeight, barrierWidth, barrierMaterial)

    // Add corner pieces at junctions to close diagonal gaps
    this.createJunctionCorners(junctions, offset, barrierHeight, barrierWidth, barrierMaterial)
  }

  private createJunctionCorners(
    junctions: { x: number; z: number }[],
    offset: number,
    height: number,
    width: number,
    material: PBRMaterial
  ): void {
    const cornerSize = width + 0.5 // Size of corner piece

    junctions.forEach((junction, i) => {
      // Create 4 corner pieces for each junction (NE, NW, SE, SW)
      const corners = [
        { x: junction.x + offset, z: junction.z + offset, name: 'NE' },  // North-East
        { x: junction.x - offset, z: junction.z + offset, name: 'NW' },  // North-West
        { x: junction.x + offset, z: junction.z - offset, name: 'SE' },  // South-East
        { x: junction.x - offset, z: junction.z - offset, name: 'SW' },  // South-West
      ]

      corners.forEach(corner => {
        const cornerPiece = MeshBuilder.CreateBox(`corner_${i}_${corner.name}`, {
          width: cornerSize,
          height: height,
          depth: cornerSize,
        }, this.scene)
        cornerPiece.position = new Vector3(corner.x, height / 2, corner.z)
        cornerPiece.material = material
        cornerPiece.receiveShadows = true
        this.lightingSetup?.addShadowCaster(cornerPiece)
        this.meshes.push(cornerPiece)
        this.addBoxCollider(cornerPiece)
      })
    })
  }

  private createTJunctionBarriers(
    offset: number,
    height: number,
    width: number,
    material: PBRMaterial
  ): void {
    const roadWidth = 16

    // T-junction at road_top & road_left_v (-80, 150)
    // Block west and north sides
    
    // Barrier blocking west side of junction
    const blockWest0 = MeshBuilder.CreateBox('tjunc_-80_150_block_west', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockWest0.position = new Vector3(-80 - offset, height / 2, 150)
    blockWest0.material = material
    blockWest0.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockWest0)
    this.meshes.push(blockWest0)
    this.addBoxCollider(blockWest0)

    // Barrier blocking north side of junction
    const blockNorth0 = MeshBuilder.CreateBox('tjunc_-80_150_block_north', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockNorth0.position = new Vector3(-80, height / 2, 150 + offset)
    blockNorth0.material = material
    blockNorth0.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockNorth0)
    this.meshes.push(blockNorth0)
    this.addBoxCollider(blockNorth0)

    // T-junction at road_mid & road_right_v (90, 50)
    // Block going straight (east) and turning left (north)
    // This forces cars coming from west to turn right (south)
    
    // Barrier blocking straight path (east side of junction)
    const blockEast1 = MeshBuilder.CreateBox('tjunc_90_50_block_east', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockEast1.position = new Vector3(90 + offset, height / 2, 50)
    blockEast1.material = material
    blockEast1.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockEast1)
    this.meshes.push(blockEast1)
    this.addBoxCollider(blockEast1)

    // Barrier blocking left turn (north side of junction)
    const blockNorth1 = MeshBuilder.CreateBox('tjunc_90_50_block_north', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockNorth1.position = new Vector3(90, height / 2, 50 + offset)
    blockNorth1.material = material
    blockNorth1.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockNorth1)
    this.meshes.push(blockNorth1)
    this.addBoxCollider(blockNorth1)

    // T-junction at road_center_v & road_top (50, 150)
    // Block going straight (east) - north is now open for radial_north access
    
    // Barrier blocking straight path (east side of junction)
    const blockEast2 = MeshBuilder.CreateBox('tjunc_50_150_block_east', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockEast2.position = new Vector3(50 + offset, height / 2, 150)
    blockEast2.material = material
    blockEast2.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockEast2)
    this.meshes.push(blockEast2)
    this.addBoxCollider(blockEast2)

    // North side is now OPEN for radial_north access

    // Junction (-80, 50) is now a full 4-way intersection
    // Allows access to: road_left_v (N/S), road_mid (E), radial_west (W)
    // Mobil bisa belok ke barat menuju radial_west

    // T-junction at road_left_v & road_lower (-80, -50)
    // Block west and south sides
    
    // Barrier blocking west side of junction
    const blockWest4 = MeshBuilder.CreateBox('tjunc_-80_-50_block_west', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockWest4.position = new Vector3(-80 - offset, height / 2, -50)
    blockWest4.material = material
    blockWest4.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockWest4)
    this.meshes.push(blockWest4)
    this.addBoxCollider(blockWest4)

    // Barrier blocking south side of junction
    const blockSouth4 = MeshBuilder.CreateBox('tjunc_-80_-50_block_south', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockSouth4.position = new Vector3(-80, height / 2, -50 - offset)
    blockSouth4.material = material
    blockSouth4.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockSouth4)
    this.meshes.push(blockSouth4)
    this.addBoxCollider(blockSouth4)

    // Junction (50, -50) is now a full 4-way intersection (no T-junction barriers)
    // Mobil bisa lewat dari semua arah: utara, selatan, timur, dan barat

    // T-junction at road_center_v & road_south_H (50, -178)
    // Block west side - south is now open for radial_south access
    
    // Barrier blocking west side of junction
    const blockWest6 = MeshBuilder.CreateBox('tjunc_50_-178_block_west', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockWest6.position = new Vector3(50 - offset, height / 2, -178)
    blockWest6.material = material
    blockWest6.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockWest6)
    this.meshes.push(blockWest6)
    this.addBoxCollider(blockWest6)

    // South side is now OPEN for radial_south access

    // T-junction at road_south_H & road_gedungH_east (170, -178)
    // Block east and south sides
    
    // Barrier blocking east side of junction
    const blockEast7 = MeshBuilder.CreateBox('tjunc_170_-178_block_east', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockEast7.position = new Vector3(170 + offset, height / 2, -178)
    blockEast7.material = material
    blockEast7.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockEast7)
    this.meshes.push(blockEast7)
    this.addBoxCollider(blockEast7)

    // Barrier blocking south side of junction
    const blockSouth7 = MeshBuilder.CreateBox('tjunc_170_-178_block_south', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockSouth7.position = new Vector3(170, height / 2, -178 - offset)
    blockSouth7.material = material
    blockSouth7.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockSouth7)
    this.meshes.push(blockSouth7)
    this.addBoxCollider(blockSouth7)

    // T-junction at road_gedungH_east & road_to_H (170, -100)
    // Now allows passage to east (radial_east) - only block north side
    
    // Barrier blocking north side of junction
    const blockNorth8 = MeshBuilder.CreateBox('tjunc_170_-100_block_north', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockNorth8.position = new Vector3(170, height / 2, -100 + offset)
    blockNorth8.material = material
    blockNorth8.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockNorth8)
    this.meshes.push(blockNorth8)
    this.addBoxCollider(blockNorth8)

    // T-junction at road_to_H & road_right_v (90, -100)
    // Block south and west sides
    
    // Barrier blocking west side of junction
    const blockWest9 = MeshBuilder.CreateBox('tjunc_90_-100_block_west', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockWest9.position = new Vector3(90 - offset, height / 2, -100)
    blockWest9.material = material
    blockWest9.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockWest9)
    this.meshes.push(blockWest9)
    this.addBoxCollider(blockWest9)

    // Barrier blocking south side of junction
    const blockSouth9 = MeshBuilder.CreateBox('tjunc_90_-100_block_south', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockSouth9.position = new Vector3(90, height / 2, -100 - offset)
    blockSouth9.material = material
    blockSouth9.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockSouth9)
    this.meshes.push(blockSouth9)
    this.addBoxCollider(blockSouth9)

    // Corner junction at ring_east & ring_south (284, -500)
    // Block east and south sides to keep vehicles on ring road
    const ringRoadWidth = 20
    const ringOffset = ringRoadWidth / 2 + width / 2

    // Barrier blocking east side of corner junction
    const blockEastCornerSE = MeshBuilder.CreateBox('corner_284_-500_block_east', {
      width: width,
      height: height,
      depth: ringRoadWidth,
    }, this.scene)
    blockEastCornerSE.position = new Vector3(284 + ringOffset, height / 2, -500)
    blockEastCornerSE.material = material
    blockEastCornerSE.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockEastCornerSE)
    this.meshes.push(blockEastCornerSE)
    this.addBoxCollider(blockEastCornerSE)

    // Barrier blocking south side of corner junction
    const blockSouthCornerSE = MeshBuilder.CreateBox('corner_284_-500_block_south', {
      width: ringRoadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockSouthCornerSE.position = new Vector3(284, height / 2, -500 - ringOffset)
    blockSouthCornerSE.material = material
    blockSouthCornerSE.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockSouthCornerSE)
    this.meshes.push(blockSouthCornerSE)
    this.addBoxCollider(blockSouthCornerSE)
  }

  private createBarriersWithGaps(
    baseName: string,
    start: number,
    end: number,
    fixedCoord: number,
    gapPositions: number[],
    gapSize: number,
    height: number,
    width: number,
    material: PBRMaterial,
    orientation: 'horizontal' | 'vertical'
  ): void {
    // Build segments between gaps
    const segments: { start: number; end: number }[] = []
    let currentStart = start

    gapPositions.forEach(gapCenter => {
      const gapStart = gapCenter - gapSize / 2
      const gapEnd = gapCenter + gapSize / 2

      if (gapStart > currentStart) {
        segments.push({ start: currentStart, end: gapStart })
      }
      currentStart = gapEnd
    })

    // Add final segment after last gap
    if (currentStart < end) {
      segments.push({ start: currentStart, end: end })
    }

    // Create barrier meshes for each segment
    segments.forEach((seg, i) => {
      const length = seg.end - seg.start
      if (length <= 0) return

      const center = (seg.start + seg.end) / 2

      const barrier = MeshBuilder.CreateBox(`${baseName}_${i}`, {
        width: orientation === 'horizontal' ? length : width,
        height: height,
        depth: orientation === 'horizontal' ? width : length,
      }, this.scene)

      if (orientation === 'horizontal') {
        barrier.position = new Vector3(center, height / 2, fixedCoord)
      } else {
        barrier.position = new Vector3(fixedCoord, height / 2, center)
      }

      barrier.material = material
      barrier.receiveShadows = true
      this.lightingSetup?.addShadowCaster(barrier)
      this.meshes.push(barrier)
      this.addBoxCollider(barrier)
    })
  }

  private createBuildings(): void {
    // Building colors
    const buildingMaterial = new PBRMaterial('buildingMaterial', this.scene)
    buildingMaterial.albedoColor = new Color3(0.95, 0.93, 0.88) // Cream/off-white
    buildingMaterial.metallic = 0.1
    buildingMaterial.roughness = 0.8

    const outlineMaterial = new PBRMaterial('outlineMaterial', this.scene)
    outlineMaterial.albedoColor = new Color3(0.4, 0.4, 0.38)
    outlineMaterial.metallic = 0.1
    outlineMaterial.roughness = 0.8

    // Buildings based on reference image layout
    const buildings = [
      // Gedung A - top left
      { name: 'Gedung A', x: -120, z: 150, width: 60, depth: 35, height: 12 },
      // Gedung B - top right
      { name: 'Gedung B', x: 130, z: 150, width: 50, depth: 40, height: 14 },
      // Gedung C - center left (smaller, inside loop)
      { name: 'Gedung C', x: -20, z: 100, width: 40, depth: 30, height: 10 },
      // Gedung D - center right
      { name: 'Gedung D', x: 150, z: 10, width: 45, depth: 50, height: 11 },
      // Gedung F - bottom left
      { name: 'Gedung F', x: -120, z: -10, width: 55, depth: 45, height: 15 },
      // Gedung G - bottom right middle
      { name: 'Gedung G', x: 150, z: -70, width: 45, depth: 40, height: 12 },
      // Gedung H - far bottom right
      { name: 'Gedung H', x: 130, z: -145, width: 55, depth: 45, height: 13 },
    ]

    buildings.forEach((b) => {
      // Main building body
      const building = MeshBuilder.CreateBox(`building_${b.name}`, {
        width: b.width,
        height: b.height,
        depth: b.depth,
      }, this.scene)
      
      building.position = new Vector3(b.x, b.height / 2, b.z)
      building.material = buildingMaterial
      building.receiveShadows = true
      this.lightingSetup?.addShadowCaster(building)
      this.meshes.push(building)

      // Add collider for building
      this.addBoxCollider(building)

      // Building outline/border
      const outline = MeshBuilder.CreateBox(`outline_${b.name}`, {
        width: b.width + 1,
        height: 0.3,
        depth: b.depth + 1,
      }, this.scene)
      outline.position = new Vector3(b.x, 0.15, b.z)
      outline.material = outlineMaterial
      this.meshes.push(outline)

      // Building label
      this.createBuildingLabel(b.name, b.x, b.z, b.height)
    })
  }

  private createBuildingLabel(name: string, x: number, z: number, height: number): void {
    // Simple colored marker for building identification
    const markerMaterial = new StandardMaterial(`marker_${name}`, this.scene)
    markerMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2)
    markerMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1)

    const marker = MeshBuilder.CreateBox(`label_${name}`, {
      width: 8,
      height: 0.5,
      depth: 4,
    }, this.scene)
    marker.position = new Vector3(x, height + 1, z)
    marker.material = markerMaterial
    this.meshes.push(marker)
  }

  private createLake(): void {
    // Lake in bottom-left corner (based on reference)
    const lakeMaterial = new PBRMaterial('lakeMaterial', this.scene)
    lakeMaterial.albedoColor = new Color3(0.5, 0.75, 0.8) // Light blue
    lakeMaterial.metallic = 0.3
    lakeMaterial.roughness = 0.2

    const lake = MeshBuilder.CreateDisc('lake', {
      radius: 35,
      tessellation: 32,
    }, this.scene)
    lake.rotation.x = Math.PI / 2
    lake.position = new Vector3(-140, 0.02, -200)
    lake.material = lakeMaterial
    lake.receiveShadows = true
    this.meshes.push(lake)

    // Lake edge/shore
    const shoreMaterial = new PBRMaterial('shoreMaterial', this.scene)
    shoreMaterial.albedoColor = new Color3(0.6, 0.7, 0.5)
    shoreMaterial.metallic = 0
    shoreMaterial.roughness = 0.9

    const shore = MeshBuilder.CreateDisc('shore', {
      radius: 40,
      tessellation: 32,
    }, this.scene)
    shore.rotation.x = Math.PI / 2
    shore.position = new Vector3(-140, 0.01, -200)
    shore.material = shoreMaterial
    this.meshes.push(shore)

    // Add lake as obstacle (can't drive through)
    this.colliders.push({
      min: new Vector3(-175, 0, -235),
      max: new Vector3(-105, 2, -165),
    })
  }

  private createTrees(): void {
    const trunkMaterial = new PBRMaterial('trunkMaterial', this.scene)
    trunkMaterial.albedoColor = new Color3(0.4, 0.28, 0.15)
    trunkMaterial.metallic = 0
    trunkMaterial.roughness = 0.9

    const leavesMaterial = new PBRMaterial('leavesMaterial', this.scene)
    leavesMaterial.albedoColor = new Color3(0.25, 0.5, 0.3)
    leavesMaterial.metallic = 0
    leavesMaterial.roughness = 0.8

    const leavesDarkMaterial = new PBRMaterial('leavesDarkMaterial', this.scene)
    leavesDarkMaterial.albedoColor = new Color3(0.2, 0.4, 0.25)
    leavesDarkMaterial.metallic = 0
    leavesDarkMaterial.roughness = 0.8

    // Tree positions based on reference image
    const treePositions = [
      // Near Gedung A
      { x: -160, z: 120, scale: 1.2 },
      { x: -165, z: 105, scale: 0.9 },
      // Near Gedung B  
      { x: 170, z: 120, scale: 1.0 },
      { x: 175, z: 135, scale: 1.1 },
      { x: 180, z: 105, scale: 0.8 },
      // Near Gedung D
      { x: 175, z: 20, scale: 1.0 },
      { x: 180, z: 0, scale: 1.2 },
      // Near Gedung G
      { x: 190, z: -130, scale: 1.1 },
      { x: 195, z: -150, scale: 0.9 },
      // Near lake
      { x: -170, z: -160, scale: 1.0 },
      { x: -115, z: -160, scale: 0.8 },
      { x: -100, z: -180, scale: 1.1 },
      // Center area
      { x: 10, z: 110, scale: 0.9 },
      { x: -30, z: 130, scale: 1.0 },
    ]

    treePositions.forEach((pos, i) => {
      // Trunk
      const trunk = MeshBuilder.CreateCylinder(`trunk_${i}`, {
        diameter: 0.6 * pos.scale,
        height: 3 * pos.scale,
      }, this.scene)
      trunk.position = new Vector3(pos.x, 1.5 * pos.scale, pos.z)
      trunk.material = trunkMaterial
      this.lightingSetup?.addShadowCaster(trunk)
      this.meshes.push(trunk)

      // Leaves (layered spheres for fuller look)
      const leavesBottom = MeshBuilder.CreateSphere(`leaves_b_${i}`, {
        diameter: 4 * pos.scale,
        segments: 8,
      }, this.scene)
      leavesBottom.position = new Vector3(pos.x, 4 * pos.scale, pos.z)
      leavesBottom.material = leavesDarkMaterial
      this.lightingSetup?.addShadowCaster(leavesBottom)
      this.meshes.push(leavesBottom)

      const leavesTop = MeshBuilder.CreateSphere(`leaves_t_${i}`, {
        diameter: 3 * pos.scale,
        segments: 8,
      }, this.scene)
      leavesTop.position = new Vector3(pos.x, 5.5 * pos.scale, pos.z)
      leavesTop.material = leavesMaterial
      this.lightingSetup?.addShadowCaster(leavesTop)
      this.meshes.push(leavesTop)

      // Tree collider
      this.colliders.push({
        min: new Vector3(pos.x - 0.5, 0, pos.z - 0.5),
        max: new Vector3(pos.x + 0.5, 6 * pos.scale, pos.z + 0.5),
      })
    })
  }

  private createBushes(): void {
    const bushMaterial = new PBRMaterial('bushMaterial', this.scene)
    bushMaterial.albedoColor = new Color3(0.3, 0.5, 0.25)
    bushMaterial.metallic = 0
    bushMaterial.roughness = 0.85

    const bushDarkMaterial = new PBRMaterial('bushDarkMaterial', this.scene)
    bushDarkMaterial.albedoColor = new Color3(0.25, 0.42, 0.22)
    bushDarkMaterial.metallic = 0
    bushDarkMaterial.roughness = 0.85

    // Bush clusters based on reference
    const bushClusters = [
      // Near lake
      { x: -175, z: -175, count: 3 },
      { x: -180, z: -190, count: 2 },
      { x: -120, z: -240, count: 2 },
      // Near Gedung F
      { x: -160, z: -100, count: 2 },
      // Decorative around map
      { x: -170, z: 80, count: 2 },
      { x: 180, z: 80, count: 2 },
    ]

    bushClusters.forEach((cluster, ci) => {
      for (let i = 0; i < cluster.count; i++) {
        const offsetX = (Math.random() - 0.5) * 10
        const offsetZ = (Math.random() - 0.5) * 10
        const scale = 0.8 + Math.random() * 0.4

        const bush = MeshBuilder.CreateSphere(`bush_${ci}_${i}`, {
          diameter: 2.5 * scale,
          segments: 6,
        }, this.scene)
        bush.position = new Vector3(
          cluster.x + offsetX, 
          1 * scale, 
          cluster.z + offsetZ
        )
        bush.scaling.y = 0.7
        bush.material = i % 2 === 0 ? bushMaterial : bushDarkMaterial
        this.lightingSetup?.addShadowCaster(bush)
        this.meshes.push(bush)
      }
    })
  }

  private createMapBoundaryWalls(): void {
    const wallMaterial = new PBRMaterial('boundaryWallMaterial', this.scene)
    wallMaterial.albedoColor = new Color3(0.5, 0.5, 0.5)
    wallMaterial.metallic = 0.2
    wallMaterial.roughness = 0.8

    const wallHeight = 3
    const wallThickness = 2

    // Create boundary walls and add colliders (diperluas untuk map yang lebih besar)
    const walls = [
      { x: 0, z: 400, width: 800, rotation: 0 },       // North
      { x: 0, z: -600, width: 800, rotation: 0 },      // South
      { x: 400, z: -100, width: 1000, rotation: Math.PI / 2 },   // East
      { x: -400, z: -100, width: 1000, rotation: Math.PI / 2 },  // West
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
      mesh.checkCollisions = true
      this.lightingSetup?.addShadowCaster(mesh)
      this.meshes.push(mesh)

      // Add collider for boundary wall
      this.addBoxCollider(mesh)
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

  dispose(): void {
    this.meshes.forEach(mesh => mesh.dispose())
    this.meshes = []
    this.colliders = []
    console.log('[SimpleMap] Disposed')
  }
}
