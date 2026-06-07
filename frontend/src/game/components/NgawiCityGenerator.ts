/**
 * Ngawi City Generator
 * ====================
 * Procedural, seeded generator for the dynamic "Ngawi City" map.
 *
 * Produces a pure description (NgawiCityPlan) of a grid city — no Babylon
 * objects — so it is cheap, testable, and can feed BOTH the geometry builder
 * (SimpleMap.buildNgawiCity) and the waypoint route builder (generateNgawiRoute)
 * from the same seed-derived grid.
 *
 * Layout: a full rectangular street grid (every row + every column is a road),
 * guaranteeing the whole map is connected and drivable. Building blocks sit in
 * the cell interiors with a margin from the roads, so the car can drive every
 * street but cannot pass through buildings.
 */

import { makeRng, randInt, randFloat } from '../utils/prng'

// ============================================
// TYPES
// ============================================

export interface NgawiNode {
  id: number
  r: number
  c: number
  x: number
  z: number
}

/** A continuous road strip (one per grid row or column). */
export interface RoadSegment {
  name: string
  x: number
  z: number
  width: number // cross-street width (== roadWidth)
  length: number // along-street length
  horizontal: boolean
}

export interface BuildingBox {
  name: string
  x: number
  z: number
  width: number
  depth: number
  height: number
}

export interface NgawiBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface NgawiSpawn {
  x: number
  z: number
  rotationY: number
  nodeId: number
}

export interface NgawiGrid {
  cols: number
  rows: number
  cellSize: number
  roadWidth: number
  adj: Map<number, Set<number>>
  nodes: NgawiNode[]
}

export interface NgawiCityPlan {
  grid: NgawiGrid
  roadSegments: RoadSegment[]
  buildings: BuildingBox[]
  bounds: NgawiBounds
  spawn: NgawiSpawn
}

export interface NgawiParams {
  cols: number
  rows: number
  cellSize: number
  roadWidth: number
  buildingDensity: number
  targetCheckpoints: number
  /**
   * Fraction (0..1) of non-spanning-tree edges added back as loops. Lower =
   * sparser/maze-like with more dead-ends; higher = closer to a full grid.
   * Drives how much the street LAYOUT varies between seeds.
   */
  extraEdgeRatio: number
}

// ============================================
// PARAMS
// ============================================

/**
 * Default generation params. Tuned for car-scale roads (roadWidth matches Solo
 * City's 16) and a ~10-15 min route. Invariant: cellSize - roadWidth >= 24 so
 * buildings always leave a clear gap to the street.
 */
export const DEFAULT_NGAWI_PARAMS: NgawiParams = {
  cols: 9,
  rows: 9,
  cellSize: 48,
  roadWidth: 16,
  buildingDensity: 0.7,
  targetCheckpoints: 22,
  extraEdgeRatio: 0.6,
}

/**
 * Per-level difficulty params. For now ALL levels return identical params
 * (same difficulty) — only the seed differs, so each level is a different map
 * but plays the same. To add a difficulty curve later, scale cols/rows,
 * buildingDensity, or targetCheckpoints by `level` here.
 */
export function getNgawiLevelParams(_level: number): NgawiParams {
  return { ...DEFAULT_NGAWI_PARAMS }
}

/** Grid node id from (row, col). Mirrors MapGenerator's convention. */
export function nodeId(r: number, c: number, cols: number): number {
  return r * (cols + 1) + c
}

// ============================================
// GENERATOR
// ============================================

export function generateNgawiCity(seed: number, params: Partial<NgawiParams> = {}): NgawiCityPlan {
  const p = { ...DEFAULT_NGAWI_PARAMS, ...params }
  const { cols, rows, cellSize, roadWidth, buildingDensity, extraEdgeRatio } = p
  const rng = makeRng(seed)

  // Center the grid on the origin.
  const xOffset = -((cols * cellSize) / 2)
  const zOffset = -((rows * cellSize) / 2)

  // --- Nodes (intersections) ---
  const nodeCount = (cols + 1) * (rows + 1)
  const nodes: NgawiNode[] = new Array(nodeCount)
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const id = nodeId(r, c, cols)
      nodes[id] = { id, r, c, x: c * cellSize + xOffset, z: r * cellSize + zOffset }
    }
  }

  // --- Irregular but always-connected road network ---
  // Take every possible grid edge, shuffle (seeded), build a random spanning tree
  // (guarantees the whole map is reachable), then add back a fraction of the
  // remaining edges as loops. Result: varied streets, T-junctions and the odd
  // dead-end — a different LAYOUT every seed, yet always fully drivable.
  type Edge = [number, number]
  const allEdges: Edge[] = []
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) allEdges.push([nodeId(r, c, cols), nodeId(r, c + 1, cols)])
  }
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r < rows; r++) allEdges.push([nodeId(r, c, cols), nodeId(r + 1, c, cols)])
  }
  // Fisher-Yates shuffle (seeded)
  for (let i = allEdges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = allEdges[i]
    allEdges[i] = allEdges[j]
    allEdges[j] = tmp
  }
  // Kruskal spanning tree via union-find.
  const parent = Array.from({ length: nodeCount }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const treeEdges: Edge[] = []
  const extraEdges: Edge[] = []
  for (const [a, b] of allEdges) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) {
      parent[ra] = rb
      treeEdges.push([a, b])
    } else {
      extraEdges.push([a, b])
    }
  }
  const addBack = Math.floor(extraEdges.length * extraEdgeRatio)
  const chosenEdges: Edge[] = treeEdges.concat(extraEdges.slice(0, addBack))

  const adj = new Map<number, Set<number>>()
  for (let id = 0; id < nodeCount; id++) adj.set(id, new Set())
  for (const [a, b] of chosenEdges) {
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }

  // --- Road segments: one short strip per chosen edge ---
  const roadSegments: RoadSegment[] = chosenEdges.map(([a, b], i) => {
    const na = nodes[a]
    const nb = nodes[b]
    const horizontal = na.r === nb.r
    return {
      name: `ngawi_road_${i}`,
      x: (na.x + nb.x) / 2,
      z: (na.z + nb.z) / 2,
      width: roadWidth,
      length: cellSize,
      horizontal,
    }
  })

  // --- Buildings: one per interior cell (seeded), centered with road margin ---
  const buildings: BuildingBox[] = []
  const usable = cellSize - roadWidth // drivable invariant: keep >= 24
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() > buildingDensity) continue
      const footprint = usable * randFloat(rng, 0.55, 0.8)
      buildings.push({
        name: `ngawi_bld_${r}_${c}`,
        x: (c + 0.5) * cellSize + xOffset,
        z: (r + 0.5) * cellSize + zOffset,
        width: footprint,
        depth: footprint,
        height: randInt(rng, 8, 21),
      })
    }
  }

  // --- Bounds: grid extent + margin so the car can use the outermost roads ---
  const margin = roadWidth
  const bounds: NgawiBounds = {
    minX: xOffset - margin,
    maxX: xOffset + cols * cellSize + margin,
    minZ: zOffset - margin,
    maxZ: zOffset + rows * cellSize + margin,
  }

  // --- Spawn near the grid centre, on a real intersection, facing a road ---
  let sId = nodeId(Math.floor(rows / 2), Math.floor(cols / 2), cols)
  if ((adj.get(sId)?.size ?? 0) < 2) {
    // Centre node is a dead-end/leaf — pick the nearest proper intersection.
    const cxN = nodes[sId].x
    const czN = nodes[sId].z
    let bestDist = Infinity
    for (const n of nodes) {
      if ((adj.get(n.id)?.size ?? 0) >= 2) {
        const d = (n.x - cxN) ** 2 + (n.z - czN) ** 2
        if (d < bestDist) {
          bestDist = d
          sId = n.id
        }
      }
    }
  }
  const spawnNeighbors = Array.from(adj.get(sId) ?? [])
  let spawnRotation = Math.PI / 2
  if (spawnNeighbors.length > 0) {
    const nb = nodes[spawnNeighbors[0]]
    // forward = (sin h, 0, cos h) → h = atan2(dx, dz) faces toward the neighbour.
    spawnRotation = Math.atan2(nb.x - nodes[sId].x, nb.z - nodes[sId].z)
  }
  const spawn: NgawiSpawn = {
    x: nodes[sId].x,
    z: nodes[sId].z,
    rotationY: spawnRotation,
    nodeId: sId,
  }

  return { grid: { cols, rows, cellSize, roadWidth, adj, nodes }, roadSegments, buildings, bounds, spawn }
}
