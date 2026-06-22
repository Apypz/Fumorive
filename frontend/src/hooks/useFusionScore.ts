import { useMemo } from 'react'
import { useEEGStore } from '../stores/eegStore'

export interface FusionScore {
  /** Fused fatigue score 0–100 */
  score: number
  /** Cognitive state derived from fused score */
  level: 'alert' | 'drowsy' | 'fatigued'
  /** Weight of EEG contribution (0–1) */
  eegWeight: number
  /** Weight of camera contribution (0–1) */
  cameraWeight: number
  /** How confident we are in the score (0–1) */
  confidence: number
  /** Whether both modalities are active */
  isFused: boolean
  /** Raw EEG fatigue score (0–100, null if unavailable) */
  eegScore: number | null
  /** Raw camera fatigue score (0–100, null if unavailable) */
  cameraScore: number | null
}

/**
 * Multimodal Fusion Hook
 *
 * Combines EEG fatigue score (from eegStore) and camera-based
 * face fatigue score into a single unified fatigue index.
 *
 * Fusion strategy:
 *  - Both EEG + Camera active  → 60% EEG + 40% Camera (confidence 0.95)
 *  - EEG only                  → 100% EEG              (confidence 0.70)
 *  - Camera only               → 100% Camera           (confidence 0.65)
 *  - Neither                   → score 0, confidence 0
 *
 * @param cameraFatigueScore  0–100 score from CameraFatigueMonitor
 */
export function useFusionScore(cameraFatigueScore: number): FusionScore {
  const currentMetrics = useEEGStore((state) => state.currentMetrics)
  const isConnected = useEEGStore((state) => state.isConnected)

  return useMemo(() => {
    // EEG score: stored as 0–10 in eegFatigueScore, scale → 0–100
    const rawEEG = currentMetrics?.eegFatigueScore ?? null
    const eegScore100 = rawEEG !== null ? Math.min(100, rawEEG * 10) : null

    const hasEEG = isConnected && eegScore100 !== null
    const hasCam = cameraFatigueScore > 0

    if (!hasEEG && !hasCam) {
      return {
        score: 0,
        level: 'alert',
        eegWeight: 0,
        cameraWeight: 0,
        confidence: 0,
        isFused: false,
        eegScore: null,
        cameraScore: null,
      }
    }

    let score: number
    let eegWeight: number
    let cameraWeight: number
    let confidence: number
    let isFused: boolean

    if (hasEEG && hasCam) {
      // Both available — weighted average
      eegWeight = 0.6
      cameraWeight = 0.4
      score = eegScore100! * eegWeight + cameraFatigueScore * cameraWeight
      confidence = 0.95
      isFused = true
    } else if (hasEEG) {
      eegWeight = 1.0
      cameraWeight = 0.0
      score = eegScore100!
      confidence = 0.70
      isFused = false
    } else {
      // Camera only
      eegWeight = 0.0
      cameraWeight = 1.0
      score = cameraFatigueScore
      confidence = 0.65
      isFused = false
    }

    const clampedScore = Math.min(100, Math.max(0, score))
    const level: 'alert' | 'drowsy' | 'fatigued' =
      clampedScore >= 65 ? 'fatigued' : clampedScore >= 35 ? 'drowsy' : 'alert'

    return {
      score: clampedScore,
      level,
      eegWeight,
      cameraWeight,
      confidence,
      isFused,
      eegScore: eegScore100,
      cameraScore: hasCam ? cameraFatigueScore : null,
    }
  }, [currentMetrics, isConnected, cameraFatigueScore])
}
