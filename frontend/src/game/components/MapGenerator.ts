import { Scene, MeshBuilder, Vector3, PBRMaterial, Color3, Mesh, StandardMaterial } from '@babylonjs/core'

export type GridOptions = {
  cols?: number
  rows?: number
  cellSize?: number
  primarySpacing?: number
  secondaryProb?: number
  roadWidth?: number
  buildingProb?: number
  maxBuildingHeight?: number
  numRoutes?: number
}

type NodeId = number

function idFor(r: number, c: number, cols: number) {
  return r * (cols + 1) + c
}


export function generateGrid(opts: GridOptions = {}) {
  const cols = opts.cols ?? 20
  const rows = opts.rows ?? 14
  const primarySpacing = opts.primarySpacing ?? 4
  const secondaryProb = opts.secondaryProb ?? 0.12

  const nodeCount = (cols + 1) * (rows + 1)

  const adj: Map<NodeId, Set<NodeId>> = new Map()
  for (let id = 0; id < nodeCount; id++) adj.set(id, new Set())

  const addEdge = (a: NodeId, b: NodeId) => {
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }

  for (let r = 0; r <= rows; r++) {
    if (r % primarySpacing === 0) {
      for (let c = 0; c < cols; c++) addEdge(idFor(r, c, cols), idFor(r, c + 1, cols))
    }
  }
  for (let c = 0; c <= cols; c++) {
    if (c % primarySpacing === 0) {
      for (let r = 0; r < rows; r++) addEdge(idFor(r, c, cols), idFor(r + 1, c, cols))
    }
  }

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) if (Math.random() < secondaryProb) addEdge(idFor(r, c, cols), idFor(r, c + 1, cols))
  }
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r < rows; r++) if (Math.random() < secondaryProb) addEdge(idFor(r, c, cols), idFor(r + 1, c, cols))
  }

  const nodesWithRoads = Array.from(adj.entries()).filter(([, s]) => s.size > 0).map(([k]) => k)

  return { cols, rows, nodeCount, adj, nodesWithRoads }
}

export function shortestPath(adj: Map<NodeId, Set<NodeId>>, start: NodeId, goal: NodeId) {
  const queue: NodeId[] = [start]
  const prev = new Map<NodeId, NodeId | null>()
  prev.set(start, null)

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === goal) break
    for (const nb of adj.get(cur) ?? []) {
      if (!prev.has(nb)) {
        prev.set(nb, cur)
        queue.push(nb)
      }
    }
  }

  if (!prev.has(goal)) return null
  const path: NodeId[] = []
  let cur: NodeId | null = goal
  while (cur !== null) {
    path.push(cur)
    cur = prev.get(cur) ?? null
  }
  path.reverse()
  return path
}

export class MapGenerator {
  static createMap(scene: Scene, opts: GridOptions = {}) {
    const cols = opts.cols ?? 20
    const rows = opts.rows ?? 14
    const cellSize = opts.cellSize ?? 4
    const roadWidth = opts.roadWidth ?? 1.4
    const buildingProb = opts.buildingProb ?? 0.45
    const maxBuildingHeight = opts.maxBuildingHeight ?? 6
    const numRoutes = opts.numRoutes ?? 3

    const grid = generateGrid(opts)

    // Parent mesh for easy cleanup
    const parent = new Mesh('city_parent', scene)

    // Materials
    const roadMat = new PBRMaterial('roadMat', scene)
    roadMat.albedoColor = new Color3(0.12, 0.12, 0.12)
    roadMat.metallic = 0.1
    roadMat.roughness = 0.7

    const buildingMat = new PBRMaterial('buildingMat', scene)
    buildingMat.albedoColor = new Color3(0.85, 0.83, 0.8)
    buildingMat.metallic = 0
    buildingMat.roughness = 0.9

    // Center offset so grid is centered on origin
    const xOffset = -((cols * cellSize) / 2)
    const zOffset = -((rows * cellSize) / 2)

    // Draw roads
    for (let r = 0; r <= grid.rows; r++) {
      for (let c = 0; c <= grid.cols; c++) {
        const id = idFor(r, c, grid.cols)
        const neighbors = grid.adj.get(id)!
        for (const nb of neighbors) {
          if (nb <= id) continue
          // derive neighbor coords
          const nb_r = Math.floor(nb / (grid.cols + 1))
          const nb_c = nb % (grid.cols + 1)
          const a = new Vector3(c * cellSize + xOffset, 0.02, r * cellSize + zOffset)
          const b = new Vector3(nb_c * cellSize + xOffset, 0.02, nb_r * cellSize + zOffset)
          const delta = b.subtract(a)
          const length = delta.length()
          const center = a.add(delta.scale(0.5))

          const road = MeshBuilder.CreateBox(`road_${id}_${nb}`, { width: length, height: 0.04, depth: roadWidth }, scene)
          road.position = center
          road.rotation.y = Math.atan2(delta.z, delta.x)
          road.material = roadMat
          road.parent = parent
        }
      }
    }

    // Create buildings on some cells (if not adjacent to major roads)
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (Math.random() > buildingProb) continue
        // Simple heuristic: if any of the four surrounding nodes has no road, skip building placement
        const nw = idFor(r, c, grid.cols)
        const ne = idFor(r, c + 1, grid.cols)
        const sw = idFor(r + 1, c, grid.cols)
        const se = idFor(r + 1, c + 1, grid.cols)
        const adjacentRoads = [nw, ne, sw, se].some((id) => (grid.adj.get(id) ?? new Set()).size > 0)
        if (!adjacentRoads) continue

        const bx = c * cellSize + cellSize / 2 + xOffset
        const bz = r * cellSize + cellSize / 2 + zOffset
        const bw = cellSize * (0.6 + Math.random() * 0.3)
        const bd = cellSize * (0.6 + Math.random() * 0.3)
        const bh = 1 + Math.random() * maxBuildingHeight

        const building = MeshBuilder.CreateBox(`bld_${r}_${c}`, { width: bw, height: bh, depth: bd }, scene)
        building.position = new Vector3(bx, bh / 2, bz)
        building.material = buildingMat
        building.parent = parent
      }
    }

    // Boundary - simple decorative fence/wall
    const boundaryThickness = 0.2
    const mapWidth = cols * cellSize
    const mapHeight = rows * cellSize
    const wallMat = new StandardMaterial('wallMat', scene)
    wallMat.diffuseColor = new Color3(0.15, 0.15, 0.17)

    const walls: Mesh[] = []
    const leftWall = MeshBuilder.CreateBox('wall_left', { width: boundaryThickness, height: 1.2, depth: mapHeight + 0.6 }, scene)
    leftWall.position = new Vector3(xOffset - boundaryThickness / 2, 0.6, 0 + zOffset + mapHeight / 2)
    leftWall.material = wallMat
    leftWall.parent = parent
    walls.push(leftWall)

    const rightWall = MeshBuilder.CreateBox('wall_right', { width: boundaryThickness, height: 1.2, depth: mapHeight + 0.6 }, scene)
    rightWall.position = new Vector3(xOffset + mapWidth + boundaryThickness / 2, 0.6, 0 + zOffset + mapHeight / 2)
    rightWall.material = wallMat
    rightWall.parent = parent
    walls.push(rightWall)

    const topWall = MeshBuilder.CreateBox('wall_top', { width: mapWidth + 0.6, height: 1.2, depth: boundaryThickness }, scene)
    topWall.position = new Vector3(0 + xOffset + mapWidth / 2, 0.6, zOffset - boundaryThickness / 2)
    topWall.material = wallMat
    topWall.parent = parent
    walls.push(topWall)

    const bottomWall = MeshBuilder.CreateBox('wall_bottom', { width: mapWidth + 0.6, height: 1.2, depth: boundaryThickness }, scene)
    bottomWall.position = new Vector3(0 + xOffset + mapWidth / 2, 0.6, zOffset + mapHeight + boundaryThickness / 2)
    bottomWall.material = wallMat
    bottomWall.parent = parent
    walls.push(bottomWall)

    // Optionally compute some random routes and draw them
    const candidates = grid.nodesWithRoads
    const routes: NodeId[][] = []
    for (let i = 0; i < numRoutes; i++) {
      if (candidates.length < 2) break
      const aIdx = Math.floor(Math.random() * candidates.length)
      let bIdx = Math.floor(Math.random() * candidates.length)
      while (bIdx === aIdx) bIdx = Math.floor(Math.random() * candidates.length)
      const start = candidates[aIdx]
      const goal = candidates[bIdx]
      const path = shortestPath(grid.adj, start, goal)
      if (path && path.length > 1) routes.push(path)
    }

    routes.forEach((path, i) => {
      const points: Vector3[] = path.map((id) => {
        const c = id % (grid.cols + 1)
        const r = Math.floor(id / (grid.cols + 1))
        return new Vector3(c * cellSize + xOffset, 0.08 + i * 0.02, r * cellSize + zOffset)
      })
      MeshBuilder.CreateLines(`route_${i}`, { points, updatable: false, instance: null }, scene)
    })

    return { parent, grid }
  }
}
