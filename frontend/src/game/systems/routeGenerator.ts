/**
 * Ngawi Route Generator
 * =====================
 * Builds a dynamic checkpoint route for the procedural Ngawi City map.
 *
 * Uses a forward-biased randomized DFS so the route rarely doubles back.
 * Checkpoints are placed at the MIDPOINT of each road segment (edge between
 * two consecutive nodes) rather than at intersections. This means:
 *   - The player arrives at a checkpoint while still on a straight road section
 *   - The next checkpoint is visible ahead, showing clearly which way to turn
 *   - Distances between consecutive checkpoints are roughly equal (one cell)
 *   - Checkpoints are never placed behind the player at the end of a U-turn
 */

import { Vector3 } from '@babylonjs/core'
import type { Waypoint, WaypointRoute } from './WaypointSystem'
import type { NgawiCityPlan } from '../components/NgawiCityGenerator'
import { makeRng } from '../utils/prng'

interface RouteOptions {
  targetCheckpoints?: number
  radius?: number
}

/**
 * Weighted-random pick from an array. Each element has a corresponding weight.
 * If all weights are 0 (e.g. all candidates face backward), falls back to a
 * uniform random pick so we never get stuck.
 */
function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total === 0) return items[Math.floor(rng() * items.length)] // uniform fallback
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

export function generateNgawiRoute(
  plan: NgawiCityPlan,
  seed: number,
  opts: RouteOptions = {}
): WaypointRoute {
  const target = opts.targetCheckpoints ?? 22
  // Smaller radius — checkpoints sit on straight segments, not wide intersections
  const radius = opts.radius ?? 10

  // Derive a separate-but-reproducible RNG so route draws don't depend on how
  // many draws the geometry consumed.
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0)
  const { adj, nodes } = plan.grid

  const startId = plan.spawn.nodeId

  // We need `target` midpoint checkpoints → `target + 1` segments →
  // `target + 2` path nodes (including spawn). Walk until path has that many.
  const neededNodes = target + 2

  // DFS state: each stack frame tracks both the current node and where we came from.
  interface Frame { node: number; prev: number }
  const stack: Frame[] = [{ node: startId, prev: -1 }]
  const path: number[] = [startId]
  const visited = new Set<number>([startId])

  while (path.length < neededNodes && stack.length > 0) {
    const { node: cur, prev } = stack[stack.length - 1]
    const candidates = Array.from(adj.get(cur) ?? []).filter((n) => !visited.has(n))

    if (candidates.length === 0) {
      // Dead end — backtrack. Unmark cur so it can be reached again from
      // a different branch (standard backtracking DFS requirement).
      visited.delete(cur)
      stack.pop()
      path.pop()
      continue
    }

    // Forward bias: weight candidates by how much they continue the current
    // travel direction. Turning (90°) is preferred over going backwards (180°).
    const curNode = nodes[cur]
    const prevNode = prev >= 0 ? nodes[prev] : null

    const weights = candidates.map((n) => {
      if (!prevNode) return 2.0 // no previous direction yet → equal weight
      const nx = nodes[n]
      // Direction vector prev → cur
      const dx = curNode.x - prevNode.x
      const dz = curNode.z - prevNode.z
      // Direction vector cur → candidate
      const ndx = nx.x - curNode.x
      const ndz = nx.z - curNode.z
      // Dot product (positive = forward, zero = lateral, negative = backward)
      const dot = dx * ndx + dz * ndz
      if (dot > 0) return 5.0   // continuing forward — strongly preferred
      if (dot < 0) return 0.0   // going backward — blocked (weightedPick falls back to uniform if ALL are backward)
      return 2.0                 // turning left/right — neutral
    })

    const chosen = weightedPick(candidates, weights, rng)
    visited.add(chosen)
    path.push(chosen)
    stack.push({ node: chosen, prev: cur })
  }

  // path[0] is the spawn node (car starts here).
  // Guard: DFS must have collected at least 2 nodes (spawn + 1 destination)
  // to build even a single midpoint checkpoint. Fail loudly rather than return
  // a zero-waypoint route that silently breaks the WaypointSystem session.
  if (path.length < 2) {
    throw new Error(
      `[routeGenerator] DFS failed: only ${path.length} node(s) collected (need ≥ 2). ` +
      `seed=${seed}, targetCheckpoints=${target}`
    )
  }

  // We build checkpoints from the MIDPOINTS of consecutive node pairs starting
  // from path[0]→path[1], path[1]→path[2], …
  // This places each checkpoint squarely on a road segment, not at an intersection.
  const waypoints: Waypoint[] = []
  const segCount = Math.min(path.length - 1, target)

  for (let i = 0; i < segCount; i++) {
    const na = nodes[path[i]]
    const nb = nodes[path[i + 1]]
    // Midpoint, offset 30 % toward nb so the checkpoint feels slightly ahead
    // of center — the player sees it while approaching and the intersection is
    // still visible in front.
    const t = 0.5
    const mx = na.x + (nb.x - na.x) * t
    const mz = na.z + (nb.z - na.z) * t

    const label =
      i === 0
        ? 'Start'
        : i === segCount - 1
          ? 'Finish'
          : `Checkpoint ${i + 1}`

    waypoints.push({
      id: i + 1,
      position: new Vector3(mx, 0, mz),
      radius,
      roadName: `seg_r${na.r}_c${na.c}_to_r${nb.r}_c${nb.c}`,
      label,
    })
  }

  return {
    id: `ngawi-${seed >>> 0}`,
    name: 'Ngawi City',
    description: 'Rute dinamis acak melintasi kota Ngawi.',
    mapType: 'ngawi-city',
    waypoints,
  }
}
