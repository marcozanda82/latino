import type { LatinAnalysis } from '../types'

export const XP_INITIAL = 1000

export const XP_PENALTY_DRAG = 50
export const XP_PENALTY_CHIP = 30
export const XP_PENALTY_RETRY = 10

export function applyPenalty(currentScore: number, penalty: number): number {
  return Math.max(0, currentScore - penalty)
}

export function getMotivationalMessage(score: number): string {
  if (score >= 900) return 'Eccellente!'
  if (score >= 700) return 'Buon lavoro!'
  return 'Puoi fare di meglio!'
}

export function calculateMaxSesterziReward(
  analysis: LatinAnalysis,
  customMaxReward?: number,
): number {
  if (
    typeof customMaxReward === 'number' &&
    Number.isFinite(customMaxReward) &&
    customMaxReward >= 0
  ) {
    return Math.round(customMaxReward)
  }

  return Math.round(
    analysis.parole_array.length * 10 * (analysis.coefficiente ?? 1.0),
  )
}

export function calculateFinalSesterziReward(
  analysis: LatinAnalysis,
  mechanicalScore: number,
  customMaxReward?: number,
  maxMechanicalScore = 60,
): number {
  const base = calculateMaxSesterziReward(analysis, customMaxReward)
  const ratio = Math.max(
    0,
    Math.min(1, mechanicalScore / maxMechanicalScore),
  )
  return Math.round(base * ratio)
}
