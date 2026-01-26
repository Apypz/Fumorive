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
  
  // Map boundaries
  private mapBounds = {
    minX: -200,
    maxX: 200,
    minZ: -300,
    maxZ: 200,
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
   * Create Bahlil City map - urban environment with buildings, roads, and obstacles
   */
  createBahlilCity(): void {
    this.createGround()
    this.createRoads()
    this.createRoadBarriers()
    this.createBuildings()
    this.createLake()
    this.createTrees()
    this.createBushes()
    this.createMapBoundaryWalls()
    
    console.log('[SimpleMap] Bahlil City map created with', this.colliders.length, 'colliders')
  }

  /**
   * Create Iclik Park map - open park environment with minimal obstacles
   * Perfect for testing and free driving
   */
  createIclikPark(): void {
    this.createParkGround()
    this.createParkPaths()
    this.createParkTrees()
    this.createParkBenches()
    this.createParkFountain()
    this.createParkLamps()
    this.createMapBoundaryWalls()
    
    console.log('[SimpleMap] Iclik Park map created with', this.colliders.length, 'colliders')
  }

  // Legacy method - creates Bahlil City
  createRaceTrack(): void {
    this.createBahlilCity()
  }

  createCityMap(): void {
    this.createBahlilCity()
  }

  // ============================================
  // ICLIK PARK SPECIFIC CREATION METHODS
  // ============================================

  private createParkGround(): void {
    // Lush green grass for park
    const ground = MeshBuilder.CreateGround('parkGround', {
      width: 400,
      height: 500,
      subdivisions: 32,
    }, this.scene)

    const groundMaterial = new PBRMaterial('parkGroundMaterial', this.scene)
    groundMaterial.albedoColor = new Color3(0.35, 0.55, 0.25) // Bright green grass
    groundMaterial.metallic = 0
    groundMaterial.roughness = 0.95
    ground.material = groundMaterial
    ground.receiveShadows = true
    ground.position.y = -0.02
    ground.position.z = -50

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
  // BAHLIL CITY SPECIFIC METHODS (Original)
  // ============================================

  private createGround(): void {
    // Green grass ground
    const ground = MeshBuilder.CreateGround('ground', {
      width: 400,
      height: 500,
      subdivisions: 32,
    }, this.scene)

    const groundMaterial = new PBRMaterial('groundMaterial', this.scene)
    groundMaterial.albedoColor = new Color3(0.55, 0.65, 0.45) // Sage green
    groundMaterial.metallic = 0
    groundMaterial.roughness = 0.95
    ground.material = groundMaterial
    ground.receiveShadows = true
    ground.position.y = -0.02
    ground.position.z = -50

    this.meshes.push(ground)
  }

  private createRoads(): void {
    const roadMaterial = new PBRMaterial('roadMaterial', this.scene)
    roadMaterial.albedoColor = new Color3(0.45, 0.48, 0.42) // Gray-green road
    roadMaterial.metallic = 0.05
    roadMaterial.roughness = 0.85

    const roadWidth = 16

    // ============================================
    // ROAD LAYOUT BASED ON REFERENCE IMAGE
    // ============================================

    // === HORIZONTAL ROADS ===
    
    // Top horizontal road (between Gedung A and B area)
    this.createRoadSegment('road_top', -40, 150, 180, roadWidth, roadMaterial)
    
    // Middle horizontal road (between Gedung C/D area)
    this.createRoadSegment('road_mid', 5, 50, 180, roadWidth, roadMaterial)
    
    // Lower horizontal road (between Gedung F and G area)
    this.createRoadSegment('road_lower', -10, -50, 120, roadWidth, roadMaterial)
    
    // Horizontal road connecting to Gedung H
    this.createRoadSegment('road_to_H', 135, -102, 70, roadWidth, roadMaterial)
    
    // Horizontal road south of Gedung H
    this.createRoadSegment('road_south_H', 110, -178, 130, roadWidth, roadMaterial)

    // === VERTICAL ROADS ===
    
    // Main center vertical road (runs through the map)
    this.createRoadSegment('road_center_v', 50, -10, roadWidth, 340, roadMaterial)
    
    // Left vertical road
    this.createRoadSegment('road_left_v', -80, 50, roadWidth, 200, roadMaterial)
    
    // Right vertical road - to junction with Gedung H road
    this.createRoadSegment('road_right_v', 90, -27, roadWidth, 170, roadMaterial)
    
    // Vertical road to Gedung H (east side) - connects top and bottom horizontal roads
    this.createRoadSegment('road_gedungH_east', 170, -140, roadWidth, 92, roadMaterial)

    // === CURVED ROAD SECTIONS ===
    
    // Top-left curve (near Gedung A)
    this.createCurveRoad('curve_tl', -80, 150, 0, Math.PI / 2, roadWidth)
    
    // Top-right curve
    this.createCurveRoad('curve_tr', 50, 150, Math.PI / 2, Math.PI, roadWidth)

    // Junction patches at intersections
    this.createJunction(-80, 150, roadWidth)
    this.createJunction(50, 150, roadWidth)
    this.createJunction(-80, 50, roadWidth)
    this.createJunction(50, 50, roadWidth)
    this.createJunction(-80, -50, roadWidth)
    this.createJunction(50, -50, roadWidth)
    this.createJunction(90, -102, roadWidth)
    this.createJunction(170, -102, roadWidth)
    this.createJunction(170, -178, roadWidth)
    this.createJunction(50, -178, roadWidth)  // road_center_v & road_south_H

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

    // Dashed center lines for horizontal roads
    const horizontalRoads = [
      { x: -40, z: 150, length: 180 },
      { x: 5, z: 50, length: 180 },
      { x: -10, z: -50, length: 120 },
      { x: 135, z: -102, length: 70 },
      { x: 110, z: -178, length: 130 },
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

    // Dashed center lines for vertical roads
    const verticalRoads = [
      { x: 50, z: -20, length: 340 },
      { x: -80, z: 50, length: 200 },
      { x: 90, z: -27, length: 170 },
      { x: 170, z: -140, length: 92 },
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
    const offset = roadWidth / 2 + barrierWidth / 2 // Place barriers at road edge
    const junctionGap = roadWidth + 2 // Gap size at intersections

    // All junction positions (where barriers should have gaps)
    const junctions = [
      { x: -80, z: 150 },
      { x: 50, z: 150 },
      { x: -80, z: 50 },
      { x: 50, z: 50 },
      { x: 90, z: 50 },    // road_mid & road_right_v intersection
      { x: -80, z: -50 },
      { x: 50, z: -50 },
      { x: 90, z: -102 },
      { x: 170, z: -102 },
      { x: 170, z: -178 },
      { x: 50, z: -178 },
    ]

    // Horizontal roads with their barrier positions
    const horizontalRoads = [
      { x: -40, z: 150, length: 180 },   // road_top
      { x: 5, z: 50, length: 180 },      // road_mid
      { x: -10, z: -50, length: 120 },   // road_lower
      { x: 135, z: -102, length: 70 },   // road_to_H
      { x: 110, z: -178, length: 130 },  // road_south_H
    ]

    // Create barriers for horizontal roads with gaps at junctions
    horizontalRoads.forEach((road, roadIdx) => {
      const startX = road.x - road.length / 2
      const endX = road.x + road.length / 2
      
      // Find junctions that intersect this road (same z)
      const roadJunctions = junctions
        .filter(j => Math.abs(j.z - road.z) < 1 && j.x >= startX && j.x <= endX)
        .map(j => j.x)
        .sort((a, b) => a - b)

      // Create barrier segments with gaps at junctions
      this.createBarriersWithGaps(
        `barrier_h_n_${roadIdx}`,
        startX, endX,
        road.z + offset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'horizontal'
      )
      this.createBarriersWithGaps(
        `barrier_h_s_${roadIdx}`,
        startX, endX,
        road.z - offset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'horizontal'
      )
    })

    // Vertical roads
    const verticalRoads = [
      { x: 50, z: -10, length: 340 },    // road_center_v
      { x: -80, z: 50, length: 200 },    // road_left_v
      { x: 90, z: -27, length: 170 },    // road_right_v
      { x: 170, z: -140, length: 92 },   // road_gedungH_east
    ]

    // Create barriers for vertical roads with gaps at junctions
    verticalRoads.forEach((road, roadIdx) => {
      const startZ = road.z - road.length / 2
      const endZ = road.z + road.length / 2
      
      // Find junctions that intersect this road (same x)
      const roadJunctions = junctions
        .filter(j => Math.abs(j.x - road.x) < 1 && j.z >= startZ && j.z <= endZ)
        .map(j => j.z)
        .sort((a, b) => a - b)

      // Create barrier segments with gaps at junctions
      this.createBarriersWithGaps(
        `barrier_v_e_${roadIdx}`,
        startZ, endZ,
        road.x + offset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'vertical'
      )
      this.createBarriersWithGaps(
        `barrier_v_w_${roadIdx}`,
        startZ, endZ,
        road.x - offset,
        roadJunctions,
        junctionGap,
        barrierHeight, barrierWidth,
        barrierMaterial,
        'vertical'
      )
    })

    // Add special barriers for T-junctions (forced turn)
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
    // Block going straight (east) and turning left (north)
    
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

    // Barrier blocking left turn (north side of junction)
    const blockNorth2 = MeshBuilder.CreateBox('tjunc_50_150_block_north', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockNorth2.position = new Vector3(50, height / 2, 150 + offset)
    blockNorth2.material = material
    blockNorth2.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockNorth2)
    this.meshes.push(blockNorth2)
    this.addBoxCollider(blockNorth2)

    // T-junction at road_left_v & road_mid (-80, 50)
    // Block going straight (west side only)
    
    // Barrier blocking west side of junction
    const blockWest3 = MeshBuilder.CreateBox('tjunc_-80_50_block_west', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockWest3.position = new Vector3(-80 - offset, height / 2, 50)
    blockWest3.material = material
    blockWest3.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockWest3)
    this.meshes.push(blockWest3)
    this.addBoxCollider(blockWest3)

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

    // T-junction at road_center_v & road_lower (50, -50)
    // Block east side
    
    // Barrier blocking east side of junction
    const blockEast5 = MeshBuilder.CreateBox('tjunc_50_-50_block_east', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockEast5.position = new Vector3(50 + offset, height / 2, -50)
    blockEast5.material = material
    blockEast5.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockEast5)
    this.meshes.push(blockEast5)
    this.addBoxCollider(blockEast5)

    // T-junction at road_center_v & road_south_H (50, -178)
    // Block west and south sides
    
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

    // Barrier blocking south side of junction
    const blockSouth6 = MeshBuilder.CreateBox('tjunc_50_-178_block_south', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockSouth6.position = new Vector3(50, height / 2, -178 - offset)
    blockSouth6.material = material
    blockSouth6.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockSouth6)
    this.meshes.push(blockSouth6)
    this.addBoxCollider(blockSouth6)

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

    // T-junction at road_gedungH_east & road_to_H (170, -102)
    // Block east and north sides
    
    // Barrier blocking east side of junction
    const blockEast8 = MeshBuilder.CreateBox('tjunc_170_-102_block_east', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockEast8.position = new Vector3(170 + offset, height / 2, -102)
    blockEast8.material = material
    blockEast8.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockEast8)
    this.meshes.push(blockEast8)
    this.addBoxCollider(blockEast8)

    // Barrier blocking north side of junction
    const blockNorth8 = MeshBuilder.CreateBox('tjunc_170_-102_block_north', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockNorth8.position = new Vector3(170, height / 2, -102 + offset)
    blockNorth8.material = material
    blockNorth8.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockNorth8)
    this.meshes.push(blockNorth8)
    this.addBoxCollider(blockNorth8)

    // T-junction at road_to_H & road_right_v (90, -102)
    // Block south and west sides
    
    // Barrier blocking west side of junction
    const blockWest9 = MeshBuilder.CreateBox('tjunc_90_-102_block_west', {
      width: width,
      height: height,
      depth: roadWidth,
    }, this.scene)
    blockWest9.position = new Vector3(90 - offset, height / 2, -102)
    blockWest9.material = material
    blockWest9.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockWest9)
    this.meshes.push(blockWest9)
    this.addBoxCollider(blockWest9)

    // Barrier blocking south side of junction
    const blockSouth9 = MeshBuilder.CreateBox('tjunc_90_-102_block_south', {
      width: roadWidth,
      height: height,
      depth: width,
    }, this.scene)
    blockSouth9.position = new Vector3(90, height / 2, -102 - offset)
    blockSouth9.material = material
    blockSouth9.receiveShadows = true
    this.lightingSetup?.addShadowCaster(blockSouth9)
    this.meshes.push(blockSouth9)
    this.addBoxCollider(blockSouth9)
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

    // Create boundary walls and add colliders
    const walls = [
      { x: 0, z: 200, width: 400, rotation: 0 },      // North
      { x: 0, z: -300, width: 400, rotation: 0 },     // South
      { x: 200, z: -50, width: 500, rotation: Math.PI / 2 },   // East
      { x: -200, z: -50, width: 500, rotation: Math.PI / 2 },  // West
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
