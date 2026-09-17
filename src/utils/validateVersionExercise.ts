import type { VersionExercise, VersionSegment, Proposizione } from '../types/version'
import { isVersionExercise } from '../types/version'
import { fixComplementiTranslationEcho } from './translationEcho'
import {
  isProposizione,
  validateProposizioneCoherence,
} from './validateLatinAnalysis'

export const VERSION_JSON_LOAD_ERROR =
  'Errore: Il file JSON non ha il formato corretto per la versione'

export class VersionJsonLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VersionJsonLoadError'
  }
}

export interface ParseVersionExerciseOptions {
  /** Compenso totale del livello — usato per normalizzare i compensi segmento. */
  customMaxReward?: number
}

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : trimmed
}

function normalizeVersionPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const data = value as Record<string, unknown>

  // Accetta type: 'version' come alias di tipo: 'version'
  if (data.tipo === undefined && data.type === 'version') {
    return { ...data, tipo: 'version' }
  }

  return data
}

function validateSegmentProposizioni(
  proposizioni: unknown,
  segmentId: number,
): Proposizione[] {
  if (!Array.isArray(proposizioni) || proposizioni.length === 0) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (segmento ${segmentId}: serve almeno una proposizione).`,
    )
  }

  return proposizioni.map((proposizione, index) => {
    const proposizioneId = index + 1

    if (!isProposizione(proposizione)) {
      throw new VersionJsonLoadError(
        `${VERSION_JSON_LOAD_ERROR} (segmento ${segmentId}, proposizione ${proposizioneId}: schema non valido).`,
      )
    }

    const coherenceError = validateProposizioneCoherence(proposizione)
    if (coherenceError) {
      throw new VersionJsonLoadError(
        `${VERSION_JSON_LOAD_ERROR} (segmento ${segmentId}, proposizione ${proposizioneId}: ${coherenceError}).`,
      )
    }

    return {
      ...proposizione,
      step5_complementi: fixComplementiTranslationEcho(
        proposizione.step5_complementi,
        proposizione.tipo_proposizione,
      ),
    }
  })
}

function normalizeSegment(segment: VersionSegment): VersionSegment {
  const proposizioni = validateSegmentProposizioni(
    segment.proposizioni,
    segment.id,
  )

  return {
    id: segment.id,
    proposizioni,
    note: segment.note?.trim() ? segment.note.trim() : '',
    ...(typeof segment.difficolta_percentuale === 'number'
      ? { difficolta_percentuale: segment.difficolta_percentuale }
      : {}),
    ...(typeof segment.compenso_assegnato === 'number'
      ? { compenso_assegnato: Math.round(segment.compenso_assegnato) }
      : {}),
  }
}

function sumSegmentCompensi(segments: VersionSegment[]): number {
  return segments.reduce(
    (total, segment) => total + (segment.compenso_assegnato ?? 0),
    0,
  )
}

function sumDifficoltaPercentuali(segments: VersionSegment[]): number {
  return segments.reduce(
    (total, segment) => total + (segment.difficolta_percentuale ?? 0),
    0,
  )
}

/** L'AI ha spesso confuso percentuali e Sesterzi (somma ~100 o valori identici). */
function compensiLookLikePercentages(segments: VersionSegment[]): boolean {
  const sumCompensi = sumSegmentCompensi(segments)
  if (sumCompensi <= 0 || sumCompensi > 100) return false

  const sumPercentages = sumDifficoltaPercentuali(segments)
  if (sumPercentages > 0 && Math.abs(sumPercentages - 100) <= 5) {
    return true
  }

  return segments.every(
    (segment) =>
      typeof segment.compenso_assegnato === 'number' &&
      typeof segment.difficolta_percentuale === 'number' &&
      Math.abs(segment.compenso_assegnato - segment.difficolta_percentuale) <= 1,
  )
}

export function shouldNormalizeSegmentCompensi(
  segments: VersionSegment[],
  customMaxReward: number,
): boolean {
  if (!Number.isFinite(customMaxReward) || customMaxReward <= 0) {
    return false
  }

  const totalReward = Math.round(customMaxReward)
  const sumCompensi = sumSegmentCompensi(segments)

  if (sumCompensi !== totalReward) {
    return true
  }

  if (totalReward > 100 && compensiLookLikePercentages(segments)) {
    return true
  }

  return false
}

/** Distribuisce un intero totale in base a pesi proporzionali (metodo del resto maggiore). */
function distributeIntegerByWeights(weights: number[], total: number): number[] {
  if (weights.length === 0) return []

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const effectiveWeights =
    totalWeight > 0 ? weights : weights.map(() => 1 / weights.length)

  const weightSum =
    totalWeight > 0 ? totalWeight : effectiveWeights.reduce((a, b) => a + b, 0)

  const rawShares = effectiveWeights.map(
    (weight) => (total * weight) / weightSum,
  )
  const floored = rawShares.map((share) => Math.floor(share))
  let remainder = total - floored.reduce((sum, value) => sum + value, 0)

  const ranked = rawShares
    .map((share, index) => ({
      index,
      fraction: share - floored[index],
    }))
    .sort((a, b) => b.fraction - a.fraction)

  const distributed = [...floored]
  for (let index = 0; index < remainder; index += 1) {
    distributed[ranked[index].index] += 1
  }

  return distributed
}

function resolveDistributionWeights(segments: VersionSegment[]): number[] {
  const percentageSum = sumDifficoltaPercentuali(segments)
  if (percentageSum > 0) {
    return segments.map((segment) => segment.difficolta_percentuale ?? 0)
  }

  const compensoSum = sumSegmentCompensi(segments)
  if (compensoSum > 0) {
    return segments.map((segment) => segment.compenso_assegnato ?? 0)
  }

  return segments.map(() => 1)
}

/**
 * Ricalcola `compenso_assegnato` per segmento in proporzione a `difficolta_percentuale`
 * (o ai compensi esistenti / ripartizione equa) fino a coprire esattamente `customMaxReward`.
 */
export function normalizeVersionSegmentCompensi(
  segments: VersionSegment[],
  customMaxReward: number,
): VersionSegment[] {
  if (segments.length === 0) {
    return segments
  }

  const totalReward = Math.round(customMaxReward)
  if (!Number.isFinite(totalReward) || totalReward <= 0) {
    return segments
  }

  if (!shouldNormalizeSegmentCompensi(segments, totalReward)) {
    return segments
  }

  const weights = resolveDistributionWeights(segments)
  const distributed = distributeIntegerByWeights(weights, totalReward)

  return segments.map((segment, index) => ({
    ...segment,
    compenso_assegnato: distributed[index],
  }))
}

export function normalizeVersionExerciseCompensi(
  exercise: VersionExercise,
  customMaxReward?: number,
): VersionExercise {
  if (
    customMaxReward === undefined ||
    !Number.isFinite(customMaxReward) ||
    customMaxReward <= 0
  ) {
    return exercise
  }

  return {
    ...exercise,
    segmenti: normalizeVersionSegmentCompensi(
      exercise.segmenti,
      customMaxReward,
    ),
  }
}

export function parseVersionExerciseJson(
  raw: string,
  options?: ParseVersionExerciseOptions,
): VersionExercise {
  if (!raw.trim()) {
    throw new VersionJsonLoadError(
      'Incolla o carica un file JSON della versione prima di procedere.',
    )
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(extractJsonContent(raw))
  } catch {
    throw new VersionJsonLoadError('Errore: sintassi JSON non valida.')
  }

  const normalized = normalizeVersionPayload(parsed)

  if (!isVersionExercise(normalized)) {
    throw new VersionJsonLoadError(VERSION_JSON_LOAD_ERROR)
  }

  if (normalized.segmenti.length === 0) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (serve almeno un segmento).`,
    )
  }

  if (!normalized.titolo.trim()) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (titolo mancante).`,
    )
  }

  let segmenti = normalized.segmenti.map(normalizeSegment)

  if (options?.customMaxReward !== undefined) {
    segmenti = normalizeVersionSegmentCompensi(
      segmenti,
      options.customMaxReward,
    )
  }

  return {
    ...normalized,
    titolo: normalized.titolo.trim(),
    autore: normalized.autore.trim(),
    introduzione: normalized.introduzione.trim(),
    segmenti,
  }
}
