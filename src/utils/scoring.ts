/** Punteggio meccanico iniziale (perfetto) nel flusso a 5 step. */
export const PERFECT_MECHANICAL_SCORE = 60

/**
 * Calcola i Sesterzi guadagnati su un segmento versione,
 * proporzionali al punteggio meccanico (0–60, dove 60 = perfetto).
 */
export function calculateSegmentReward(
  compensoAssegnato: number,
  mechanicalScore: number,
  maxMechanicalScore = PERFECT_MECHANICAL_SCORE,
): number {
  if (
    !Number.isFinite(compensoAssegnato) ||
    compensoAssegnato <= 0 ||
    !Number.isFinite(mechanicalScore)
  ) {
    return 0
  }

  const ratio = Math.max(
    0,
    Math.min(1, mechanicalScore / maxMechanicalScore),
  )

  return Math.round(compensoAssegnato * ratio)
}

export function calculateVersionTotalSegmentReward(
  segments: Array<{
    compensoAssegnato?: number
    mechanicalScore: number
  }>,
): number {
  return segments.reduce(
    (total, segment) =>
      total +
      calculateSegmentReward(
        segment.compensoAssegnato ?? 0,
        segment.mechanicalScore,
      ),
    0,
  )
}
