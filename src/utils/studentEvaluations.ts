import type { Level } from '../services/exerciseService'
import type { PendingTranslation } from '../types/evaluation'

/** Mappa levelId → valutazione più recente (con fallback su frase latina). */
export function buildEvaluationByLevelId(
  evaluations: PendingTranslation[],
  levels: Level[],
): Record<string, PendingTranslation> {
  const fraseToLevelId = Object.fromEntries(
    levels.map((level) => [level.analysis.frase_originale, level.id]),
  )
  const map: Record<string, PendingTranslation> = {}

  for (const evaluation of evaluations) {
    const levelId =
      evaluation.levelId ?? fraseToLevelId[evaluation.fraseOriginale]
    if (!levelId) continue

    const existing = map[levelId]
    if (!existing) {
      map[levelId] = evaluation
      continue
    }

    const existingTime = existing.createdAt?.toMillis?.() ?? 0
    const nextTime = evaluation.createdAt?.toMillis?.() ?? 0
    if (nextTime >= existingTime) {
      map[levelId] = evaluation
    }
  }

  return map
}

export function getSubmittedLevelIds(
  evaluations: PendingTranslation[],
  levels: Level[],
): Set<string> {
  return new Set(Object.keys(buildEvaluationByLevelId(evaluations, levels)))
}

export function filterLevelsWithoutSubmission(
  levels: Level[],
  submittedLevelIds: Set<string>,
): Level[] {
  return levels.filter((level) => !submittedLevelIds.has(level.id))
}
