/**
 * Ngawi Route Generator
 * =====================
 * Builds a dynamic checkpoint route for the procedural Ngawi City map.
 *
 * Walks the SAME grid graph produced by generateNgawiCity (seeded from the same
 * seed, so geometry and route always agree) using a randomized DFS with
 * backtracking. Because every checkpoint sits on a real grid intersection and
 * the grid is fully connected, every checkpoint is guaranteed reachable on the
 * roads — the route can always be completed.
 */

import { Vector3 } from '@babylonjs/core'
import type { Waypoint, WaypointRoute } from './WaypointSystem'
import type { NgawiCityPlan } from '../components/NgawiCityGenerator'
import { makeRng } from '../utils/prng'

interface RouteOptions {
  targetCheckpoints?: number
  radius?: number
}

export function generateNgawiRoute(
  plan: NgawiCityPlan,
  seed: number,
  opts: RouteOptions = {}
): WaypointRoute {
  const target = opts.targetCheckpoints ?? 22
  const radius = opts.radius ?? 14
  // Derive a separate-but-reproducible RNG so route draws don't depend on how
  // many draws the geometry consumed.
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0)
  const { adj, nodes } = plan.grid

  const start = plan.spawn.nodeId
  const visited = new Set<number>([start])
  const path: number[] = [start]
  const stack: number[] = [start]

  // Randomized DFS: keep visiting unvisited neighbours; backtrack at dead ends.
  // Walk target+1 nodes so that, after dropping the spawn node below, exactly
  // `target` checkpoints remain.
  while (visited.size < target + 1 && stack.length > 0) {
    const cur = stack[stack.length - 1]
    const candidates = Array.from(adj.get(cur) ?? []).filter((n) => !visited.has(n))
    if (candidates.length === 0) {
      stack.pop()
      continue
    }
    const next = candidates[Math.floor(rng() * candidates.length)]
    visited.add(next)
    path.push(next)
    stack.push(next)
  }

  // Drop the spawn node — the car already sits there, so the first checkpoint
  // should be a short drive away (mirrors Solo City's behaviour).
  const checkpointNodes = path.slice(1)
  const waypoints: Waypoint[] = checkpointNodes.map((id, i) => {
    const n = nodes[id]
    return {
      id: i + 1,
      position: new Vector3(n.x, 0, n.z),
      radius,
      roadName: `grid_r${n.r}_c${n.c}`,
      label: i === 0 ? 'Start' : i === checkpointNodes.length - 1 ? 'Finish' : `Checkpoint ${i + 1}`,
    }
  })

  return {
    id: `ngawi-${seed >>> 0}`,
    name: 'Ngawi City',
    description: 'Rute dinamis acak melintasi kota Ngawi.',
    mapType: 'ngawi-city',
    waypoints,
  }
}
