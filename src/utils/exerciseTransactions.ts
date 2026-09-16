import type { Level } from '../services/exerciseService'
import {
  calculateMaxSesterziReward,
} from './gamification'
import { calculateVersionTotalSegmentReward } from './scoring'
import {
  isTransactionReverted,
  type StudentTransaction,
} from '../types/transaction'
import type { PendingTranslation } from '../types/evaluation'
import { isSentenceLevel, isVersionLevel } from '../services/exerciseService'
import { calculateSchoolGrade } from './grades'

const VERSION_REWARD_PREFIX = 'Ricompensa tutor per versione: '
const SENTENCE_REWARD_PREFIX = 'Ricompensa per traduzione completata'

export function isExerciseTransaction(tx: StudentTransaction): boolean {
  if (tx.type !== 'earn' || isTransactionReverted(tx)) return false

  const description = tx.description.trim()
  if (description.startsWith('Rettifica:')) return false

  return (
    description.startsWith(SENTENCE_REWARD_PREFIX) ||
    description.startsWith(VERSION_REWARD_PREFIX) ||
    description === 'Traduzione completata'
  )
}

export function parseExerciseTitleFromTransaction(
  tx: StudentTransaction,
): string {
  const description = tx.description.trim()

  if (description.startsWith(VERSION_REWARD_PREFIX)) {
    return description.slice(VERSION_REWARD_PREFIX.length).trim()
  }

  return description
}

export function getMaxPointsForLevel(level: Level): number {
  if (isSentenceLevel(level)) {
    return calculateMaxSesterziReward(level.analysis, level.customMaxReward)
  }

  if (isVersionLevel(level)) {
    if (
      typeof level.customMaxReward === 'number' &&
      Number.isFinite(level.customMaxReward) &&
      level.customMaxReward > 0
    ) {
      return Math.round(level.customMaxReward)
    }

    return calculateVersionTotalSegmentReward(
      level.version.segmenti.map((segment) => ({
        compensoAssegnato: segment.compenso_assegnato ?? 0,
        mechanicalScore: 60,
      })),
    )
  }

  return 0
}

export interface ExerciseGradeEntry {
  transactionId: string
  title: string
  timestamp?: StudentTransaction['timestamp']
  pointsObtained: number
  maxPoints: number
  grade: number
  levelId?: string
}

function getTransactionTimestampMs(
  tx: StudentTransaction,
): number {
  return tx.timestamp?.toDate?.()?.getTime() ?? 0
}

function getEvaluationTimestampMs(
  evaluation: PendingTranslation,
): number {
  return evaluation.createdAt?.toMillis?.() ?? 0
}

function findMatchingEvaluation(
  tx: StudentTransaction,
  evaluations: PendingTranslation[],
): PendingTranslation | undefined {
  const txTime = getTransactionTimestampMs(tx)
  const txAmount = tx.amount

  const candidates = evaluations.filter((evaluation) => {
    if (typeof evaluation.reward !== 'number') return false
    if (evaluation.reward !== txAmount) return false

    const evalTime = getEvaluationTimestampMs(evaluation)
    if (txTime === 0 || evalTime === 0) return true
    return Math.abs(evalTime - txTime) <= 5 * 60 * 1000
  })

  if (candidates.length === 0) return undefined

  return candidates.sort((a, b) => {
    const aDiff = Math.abs(getEvaluationTimestampMs(a) - txTime)
    const bDiff = Math.abs(getEvaluationTimestampMs(b) - txTime)
    return aDiff - bDiff
  })[0]
}

function resolveLevelForTransaction(
  tx: StudentTransaction,
  levels: Level[],
  evaluation?: PendingTranslation,
): Level | undefined {
  if (evaluation?.levelId) {
    return levels.find((level) => level.id === evaluation.levelId)
  }

  const description = tx.description.trim()

  if (description.startsWith(VERSION_REWARD_PREFIX)) {
    const title = description.slice(VERSION_REWARD_PREFIX.length).trim()
    return levels.find(
      (level) =>
        isVersionLevel(level) &&
        (level.title === title || level.version.titolo === title),
    )
  }

  if (evaluation) {
    return levels.find((level) => {
      if (isSentenceLevel(level)) {
        return level.analysis.frase_originale === evaluation.fraseOriginale
      }
      if (isVersionLevel(level)) {
        return level.version.titolo === evaluation.fraseOriginale
      }
      return false
    })
  }

  return undefined
}

export function buildExerciseGradeEntries(
  transactions: StudentTransaction[],
  levels: Level[],
  evaluations: PendingTranslation[],
): ExerciseGradeEntry[] {
  return transactions
    .filter(isExerciseTransaction)
    .map((tx) => {
      const evaluation = findMatchingEvaluation(tx, evaluations)
      const level = resolveLevelForTransaction(tx, levels, evaluation)
      const maxPoints = level ? getMaxPointsForLevel(level) : tx.amount
      const pointsObtained = Math.max(0, tx.amount)
      const grade = calculateSchoolGrade(pointsObtained, maxPoints)

      const title =
        level?.title ??
        evaluation?.titolo ??
        evaluation?.fraseOriginale ??
        parseExerciseTitleFromTransaction(tx)

      return {
        transactionId: tx.id,
        title,
        timestamp: tx.timestamp,
        pointsObtained,
        maxPoints,
        grade,
        levelId: level?.id ?? evaluation?.levelId,
      }
    })
}
