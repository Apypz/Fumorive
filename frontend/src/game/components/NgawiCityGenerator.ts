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

export type BuildingType = 'house' | 'shop' | 'apartment' | 'office'

export interface BuildingBox {
  name: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  type: BuildingType
  doorFace: number // 0=+X, 1=-X, 2=+Z, 3=-Z — which facade the entrance is on
}

/** A tree placed in an empty lot (off the road). */
export interface TreePoint {
  x: number
  z: number
  scale: number
}

/** A street lamp on a roadside; rotationY points its arm toward the road. */
export interface StreetLamp {
  x: number
  z: number
  rotationY: number
}

/** A roadside guard/jersey barrier running parallel to a road segment. */
export interface BarrierSegment {
  x: number
  z: number
  length: number
  horizontal: boolean
}

/** A park bench (off the road). */
export interface BenchPoint {
  x: number
  z: number
  rotationY: number
}

/** A low shrub/bush in a lot or park. */
export interface BushPoint {
  x: number
  z: number
  scale: number
}

export type StreetPropKind = 'cone' | 'bin' | 'hydrant'

/** A small street prop (traffic cone, trash bin, fire hydrant). */
export interface StreetProp {
  x: number
  z: number
  kind: StreetPropKind
}

/** An intersection node that has a 2-phase traffic light. */
export interface TrafficLightSpot {
  nodeId: number
  x: number
  z: number
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
  trees: TreePoint[]
  streetLamps: StreetLamp[]
  barriers: BarrierSegment[]
  benches: BenchPoint[]
  bushes: BushPoint[]
  streetProps: StreetProp[]
  trafficLights: TrafficLightSpot[]
  bounds: NgawiBounds
  spawn: NgawiSpawn
}

export interface NgawiParams {
  cols: number
  rows: number
  cellSize: number
  roadWidth: number
  buildingDensity: number
  treeDensity: number
  trafficLightCount: number
  targetCheckpoints: number
  /**
   * Fraction (0..1) of non-spanning-tree edges added back as loops. Lower =
   * sparser/maze-like with more dead-ends; higher = closer to a full grid.
   * Drives how much the street LAYOUT varies between seeds.
   */
  extraEdgeRatio: number
  /** Fraction of road segments that get a roadside street lamp. */
  lampDensity: number
  /** Fraction of road segments that get a roadside barrier. */
  barrierDensity: number
  /** Chance an open (non-building) lot becomes a small park (benches + bushes). */
  parkChance: number
  /** Fraction of intersections that get a small street prop. */
  propDensity: number
  /** Number of NPC cars to spawn. Higher = more traffic & potential jams. */
  npcCount: number
  /** Number of pedestrians per zebra crossing. Higher = busier crossings. */
  pedestriansPerCross: number
  /** Minimum NPC cruise speed (m/s). */
  npcCruiseMin: number
  /** Maximum NPC cruise speed (m/s). */
  npcCruiseMax: number
  /**
   * NPC aggressiveness: 0 = calm (obeys all rules), 1 = very aggressive
   * (runs red lights, overtakes quickly). Each car gets a randomised
   * personality scaled by this value.
   */
  npcAggressiveness: number
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
  buildingDensity: 0.70,
  treeDensity: 0.45,
  trafficLightCount: 6,
  targetCheckpoints: 16,
  extraEdgeRatio: 0.60,
  lampDensity: 0.50,
  barrierDensity: 0.18,
  parkChance: 0.35,
  propDensity: 0.22,
  // Level 2 defaults (medium difficulty)
  npcCount: 16,
  pedestriansPerCross: 2,
  npcCruiseMin: 6,
  npcCruiseMax: 14,
  npcAggressiveness: 0.20,
}

/**
 * Per-level difficulty params.
 *
 * Level 1 — Traffic Light  : Kota kecil (7×7), TIDAK ada NPC & pejalan kaki.
 *                             Fokus: patuhi lampu merah & rambu jalan.
 * Level 2 — NPC Traffic    : Kota sedang (9×9), NPC kendaraan aktif.
 *                             Fokus: berbagi jalan dengan kendaraan lain.
 * Level 3 — Full City      : Kota besar (11×11), NPC agresif + pejalan kaki.
 *                             Fokus: situasi penuh seperti kota nyata.
 */
export function getNgawiLevelParams(level: number): NgawiParams {
  switch (level) {
    case 1:
      return {
        ...DEFAULT_NGAWI_PARAMS,
        // Kota kecil, jalan lebar — tikungan nyaman, mudah dikendalikan
        cols: 7,
        rows: 7,
        cellSize: 54,
        buildingDensity: 0.55,
        treeDensity: 0.55,
        trafficLightCount: 6,   // banyak lampu merah agar jadi fokus utama
        targetCheckpoints: 10,
        extraEdgeRatio: 0.42,
        lampDensity: 0.35,
        barrierDensity: 0.06,
        parkChance: 0.50,
        propDensity: 0.10,
        // Level 1: NO NPC, NO pedestrians — only traffic lights matter
        npcCount: 0,
        pedestriansPerCross: 0,
        npcCruiseMin: 0,
        npcCruiseMax: 0,
        npcAggressiveness: 0,
      }
    case 3:
      return {
        ...DEFAULT_NGAWI_PARAMS,
        // Kota besar, blok rapat — tikungan tajam & rute kompleks
        cols: 11,
        rows: 11,
        cellSize: 44,
        buildingDensity: 0.82,
        treeDensity: 0.38,
        trafficLightCount: 10,
        targetCheckpoints: 22,
        extraEdgeRatio: 0.72,
        lampDensity: 0.62,
        barrierDensity: 0.28,
        parkChance: 0.20,
        propDensity: 0.32,
        // Level 3: NPC padat + agresif, pejalan kaki banyak
        npcCount: 28,
        pedestriansPerCross: 4,
        npcCruiseMin: 8,
        npcCruiseMax: 18,
        npcAggressiveness: 0.65,
      }
    case 2:
    default:
      return { ...DEFAULT_NGAWI_PARAMS }
  }
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
  const {
    cols, rows, cellSize, roadWidth, buildingDensity, treeDensity, trafficLightCount, extraEdgeRatio,
    lampDensity, barrierDensity, parkChance, propDensity,
  } = p
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
  // Vary the loop density per seed so the street layout differs more between
  // plays — sparser maps feel maze-like, denser ones more grid-like.
  const er = Math.max(0.2, Math.min(0.8, extraEdgeRatio + randFloat(rng, -0.2, 0.18)))
  const addBack = Math.floor(extraEdges.length * er)
  const chosenEdges: Edge[] = treeEdges.concat(extraEdges.slice(0, addBack))

  const adj = new Map<number, Set<number>>()
  for (let id = 0; id < nodeCount; id++) adj.set(id, new Set())
  for (const [a, b] of chosenEdges) {
    adj.get(a)!.add(b)
    adj.get(b)!.add(a)
  }

  // --- Eliminate dead-ends (jalan buntu) ---
  // A spanning tree always produces leaf nodes (degree 1). Keep adding edges
  // from the full grid pool until every node has at least 2 connections so the
  // player is never forced to reverse at a dead-end. We loop until stable
  // because fixing one leaf can expose another.
  {
    const edgeKey = (a: number, b: number) =>
      a < b ? a * nodeCount + b : b * nodeCount + a
    const usedKeys = new Set<number>(chosenEdges.map(([a, b]) => edgeKey(a, b)))
    let changed = true
    while (changed) {
      changed = false
      for (const node of nodes) {
        if ((adj.get(node.id)?.size ?? 0) >= 2) continue
        // Find any unused grid edge that touches this dead-end node
        for (const [a, b] of allEdges) {
          if (a !== node.id && b !== node.id) continue
          const key = edgeKey(a, b)
          if (usedKeys.has(key)) continue
          // Add this edge — fixes this leaf and may fix the neighbour too
          chosenEdges.push([a, b])
          usedKeys.add(key)
          adj.get(a)!.add(b)
          adj.get(b)!.add(a)
          changed = true
          break
        }
      }
    }
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

  // --- Per interior cell (seeded): a building, else maybe a cluster of trees ---
  // Footprint kept <= 0.72 * usable so even the widest variant (podium) stays
  // clear of the road. Empty lots get trees so the city isn't bare grass.
  const buildings: BuildingBox[] = []
  const trees: TreePoint[] = []
  const benches: BenchPoint[] = []
  const bushes: BushPoint[] = []
  const usable = cellSize - roadWidth // drivable invariant: keep >= 24
  const jitter = usable * 0.32
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cellSize + xOffset
      const cz = (r + 0.5) * cellSize + zOffset
      if (rng() < buildingDensity) {
        // Mixed building stock — mostly houses & shops, fewer apartments/towers.
        const roll = rng()
        let type: BuildingType
        let height: number
        let fScale: number
        if (roll < 0.42) {
          type = 'house'; height = randFloat(rng, 4, 6.5); fScale = randFloat(rng, 0.45, 0.6)
        } else if (roll < 0.72) {
          type = 'shop'; height = randFloat(rng, 7, 11); fScale = randFloat(rng, 0.55, 0.7)
        } else if (roll < 0.9) {
          type = 'apartment'; height = randFloat(rng, 12, 22); fScale = randFloat(rng, 0.55, 0.72)
        } else {
          type = 'office'; height = randFloat(rng, 18, 34); fScale = randFloat(rng, 0.52, 0.68)
        }
        const footprint = usable * fScale
        buildings.push({
          name: `ngawi_bld_${r}_${c}`,
          x: cx,
          z: cz,
          width: footprint,
          depth: footprint,
          height,
          type,
          doorFace: randInt(rng, 0, 4),
        })
      } else {
        // Open lot: a small park, a tree cluster, light greenery, or bare.
        const roll = rng()
        if (roll < parkChance) {
          // Park: benches surrounded by bushes and a couple of trees.
          const benchCount = randInt(rng, 1, 3)
          for (let k = 0; k < benchCount; k++) {
            benches.push({
              x: cx + randFloat(rng, -usable * 0.26, usable * 0.26),
              z: cz + randFloat(rng, -usable * 0.26, usable * 0.26),
              rotationY: randFloat(rng, 0, Math.PI * 2),
            })
          }
          const bushCount = randInt(rng, 3, 7)
          for (let k = 0; k < bushCount; k++) {
            bushes.push({ x: cx + randFloat(rng, -jitter, jitter), z: cz + randFloat(rng, -jitter, jitter), scale: randFloat(rng, 0.7, 1.3) })
          }
          const treeCount = randInt(rng, 1, 3)
          for (let k = 0; k < treeCount; k++) {
            trees.push({ x: cx + randFloat(rng, -jitter, jitter), z: cz + randFloat(rng, -jitter, jitter), scale: randFloat(rng, 0.8, 1.5) })
          }
        } else if (roll < parkChance + treeDensity) {
          const count = randInt(rng, 1, 4)
          for (let t = 0; t < count; t++) {
            trees.push({ x: cx + randFloat(rng, -jitter, jitter), z: cz + randFloat(rng, -jitter, jitter), scale: randFloat(rng, 0.8, 1.5) })
          }
          if (rng() < 0.5) bushes.push({ x: cx + randFloat(rng, -jitter, jitter), z: cz + randFloat(rng, -jitter, jitter), scale: randFloat(rng, 0.7, 1.2) })
        } else if (roll < parkChance + treeDensity + 0.22) {
          const bushCount = randInt(rng, 1, 3)
          for (let k = 0; k < bushCount; k++) {
            bushes.push({ x: cx + randFloat(rng, -jitter, jitter), z: cz + randFloat(rng, -jitter, jitter), scale: randFloat(rng, 0.7, 1.2) })
          }
        }
        // else: bare lot
      }
    }
  }

  // --- Roadside street lamps (one side, varied sides) and barriers ---
  const streetLamps: StreetLamp[] = []
  const barriers: BarrierSegment[] = []
  // Set back from the road edge by more than the car's collision radius (1.8) so
  // these roadside colliders are only struck when the player is clearly off-road.
  const lampOffset = roadWidth / 2 + 2.5
  const barrierOffset = roadWidth / 2 + 2.5
  roadSegments.forEach((seg) => {
    if (rng() < lampDensity) {
      const side = rng() < 0.5 ? 1 : -1
      if (seg.horizontal) {
        // road along X → lamp on +/-Z side, arm faces back toward the road.
        streetLamps.push({ x: seg.x, z: seg.z + side * lampOffset, rotationY: side > 0 ? Math.PI : 0 })
      } else {
        streetLamps.push({ x: seg.x + side * lampOffset, z: seg.z, rotationY: side > 0 ? -Math.PI / 2 : Math.PI / 2 })
      }
    }
    if (rng() < barrierDensity) {
      const side = rng() < 0.5 ? 1 : -1
      // Keep the barrier within the block frontage: each end must clear the
      // perpendicular road strip (roadWidth/2) plus the car's collision radius
      // (~1.8), or it would block legal driving on a crossing road.
      const len = Math.max(6, cellSize - roadWidth - 6)
      if (seg.horizontal) {
        barriers.push({ x: seg.x, z: seg.z + side * barrierOffset, length: len, horizontal: true })
      } else {
        barriers.push({ x: seg.x + side * barrierOffset, z: seg.z, length: len, horizontal: false })
      }
    }
  })

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

  // --- Traffic lights at some real intersections (3+ ways), not the spawn node ---
  const intersections = nodes.filter((n) => (adj.get(n.id)?.size ?? 0) >= 3 && n.id !== sId)
  for (let i = intersections.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = intersections[i]
    intersections[i] = intersections[j]
    intersections[j] = tmp
  }
  const trafficLights: TrafficLightSpot[] = intersections
    .slice(0, trafficLightCount)
    .map((n) => ({ nodeId: n.id, x: n.x, z: n.z }))

  // --- Small street props at some intersections (cones, bins, hydrants) ---
  const streetProps: StreetProp[] = []
  const propKinds: StreetPropKind[] = ['cone', 'bin', 'hydrant']
  const cornerOff = roadWidth / 2 + 1.4
  for (const node of nodes) {
    if ((adj.get(node.id)?.size ?? 0) < 2) continue
    if (rng() >= propDensity) continue
    const sx = rng() < 0.5 ? 1 : -1
    const sz = rng() < 0.5 ? 1 : -1
    const kind = propKinds[randInt(rng, 0, propKinds.length)]
    streetProps.push({ x: node.x + sx * cornerOff, z: node.z + sz * cornerOff, kind })
  }

  return {
    grid: { cols, rows, cellSize, roadWidth, adj, nodes },
    roadSegments,
    buildings,
    trees,
    streetLamps,
    barriers,
    benches,
    bushes,
    streetProps,
    trafficLights,
    bounds,
    spawn,
  }
}

/**
 * True if the world point (x, z) lies on a Ngawi road — inside any road strip or
 * intersection patch. Used to flag the player for driving off-road (on grass).
 */
export function isPointOnNgawiRoad(plan: NgawiCityPlan, x: number, z: number): boolean {
  // Use the extended length (+ roadWidth) to match the visual road mesh which
  // is stretched by roadWidth so strips fully overlap the intersection patches.
  const rw = plan.grid.roadWidth
  for (const seg of plan.roadSegments) {
    const extLen = seg.length + rw
    const hx = (seg.horizontal ? extLen : seg.width) / 2
    const hz = (seg.horizontal ? seg.width : extLen) / 2
    if (Math.abs(x - seg.x) <= hx && Math.abs(z - seg.z) <= hz) return true
  }
  const ph = plan.grid.roadWidth / 2
  for (const node of plan.grid.nodes) {
    if ((plan.grid.adj.get(node.id)?.size ?? 0) === 0) continue
    if (Math.abs(x - node.x) <= ph && Math.abs(z - node.z) <= ph) return true
  }
  return false
}
