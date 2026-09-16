import type { LatinAnalysis } from '../types'
import type { ExerciseDraftData } from '../types/exerciseDraft'
import type { PendingTranslation } from '../types/evaluation'
import type {
  Proposizione,
  VersionSegment,
  VersionSegmentProgress,
  VersionSegmentStepAnswers,
} from '../types/version'
import { proposizioneToLatinAnalysis } from './proposizione'
import { getVersionSegmentPrimaryProposizione } from './proposizione'

export interface ProposizioneReviewResult {
  proposizioneId: string | number
  mechanicalScore: number
  studentFullTranslation: string
  traduzioneLibera: string
  studentCoreTranslation: string
  studentComplementTranslations: string[]
  step1PlacedTileId: string | null
  step2SelectedAnswers: Partial<Record<VerbCategory, string>>
  step3PlacedTileIds: string[]
  step3ImplicitSuccess: boolean
}
import {
  getPrimaryTranslation,
} from './textNormalization'
import type { VerbCategory } from './verbAnalysis'
import { VERB_CATEGORY_ORDER } from './verbAnalysis'
import type { LatinCase } from './caseAnalysis'
import { getInteractiveComplementi } from './complements'

function findTileIdForWords(
  paroleArray: string[],
  words: string[],
): string[] {
  const ids: string[] = []
  const usedIndices = new Set<number>()

  for (const word of words) {
    const index = paroleArray.findIndex(
      (candidate, candidateIndex) =>
        candidate === word && !usedIndices.has(candidateIndex),
    )
    if (index >= 0) {
      usedIndices.add(index)
      ids.push(`tile-${index}-${word}`)
    }
  }

  return ids
}

function findVerbTileId(analysis: LatinAnalysis): string | null {
  const verbWords = analysis.step1_verbo.parola_corretta.split(/\s+/).filter(Boolean)
  const verbStartIndex = analysis.parole_array.findIndex((word) =>
    verbWords.includes(word),
  )

  if (verbStartIndex < 0) return null
  return `tile-${verbStartIndex}-${analysis.parole_array[verbStartIndex]}`
}

function buildStep2FromAnalysis(
  analysis: LatinAnalysis,
): {
  completed: Record<VerbCategory, boolean>
  selectedAnswers: Partial<Record<VerbCategory, string>>
} {
  const completed: Record<VerbCategory, boolean> = {
    modo: false,
    persona: false,
    numero: false,
    tempo: false,
    forma: false,
  }

  const selectedAnswers: Partial<Record<VerbCategory, string>> = {}

  for (const category of VERB_CATEGORY_ORDER) {
    const value = analysis.step2_analisi_verbo[category]
    if (typeof value === 'string' && value.trim()) {
      completed[category] = true
      selectedAnswers[category] = value
    }
  }

  return { completed, selectedAnswers }
}

function buildComplementTranslations(
  analysis: LatinAnalysis,
  stepAnswers?: VersionSegmentStepAnswers,
): string[] {
  if (stepAnswers?.studentComplementTranslations?.length) {
    return stepAnswers.studentComplementTranslations
  }

  return getInteractiveComplementi(analysis.step5_complementi).map((complemento) =>
    getPrimaryTranslation(complemento.traduzione),
  )
}

export function buildReviewDraftFromEvaluation(
  analysis: LatinAnalysis,
  evaluation: PendingTranslation,
): ExerciseDraftData {
  const stepAnswers = evaluation.stepAnswers

  const step1PlacedTileId =
    stepAnswers?.step1PlacedTileId ?? findVerbTileId(analysis)

  const step2 = stepAnswers?.step2SelectedAnswers
    ? {
        completed: Object.fromEntries(
          VERB_CATEGORY_ORDER.map((category) => [
            category,
            Boolean(stepAnswers.step2SelectedAnswers?.[category]),
          ]),
        ) as Record<VerbCategory, boolean>,
        selectedAnswers: stepAnswers.step2SelectedAnswers,
      }
    : buildStep2FromAnalysis(analysis)

  const step3PlacedTileIds =
    stepAnswers?.step3PlacedTileIds ??
    findTileIdForWords(
      analysis.parole_array,
      analysis.step3_soggetto.parole_corrette,
    )

  const step3ImplicitSuccess =
    stepAnswers?.step3ImplicitSuccess ?? analysis.step3_soggetto.sottinteso

  const studentCoreTranslation =
    stepAnswers?.studentCoreTranslation?.trim() ||
    getPrimaryTranslation(analysis.step4_nucleo_tradotto)

  const studentComplementTranslations = buildComplementTranslations(
    analysis,
    stepAnswers,
  )

  const interactiveCount = getInteractiveComplementi(
    analysis.step5_complementi,
  ).length

  const lastComplement = getInteractiveComplementi(analysis.step5_complementi).at(-1)

  return {
    userId: '',
    exerciseId: evaluation.levelId ?? '',
    fraseOriginale: analysis.frase_originale,
    currentStep: 5,
    step1Complete: true,
    step2Complete: true,
    step3Complete: true,
    step4Complete: true,
    step5Complete: true,
    score: evaluation.totalScore ?? evaluation.mechanicalScore ?? 1000,
    mechanicalScore: evaluation.mechanicalScore,
    studentCoreTranslation,
    studentComplementTranslations,
    step1PlacedTileId,
    step2Completed: step2.completed,
    step2SelectedAnswers: step2.selectedAnswers as Record<string, string>,
    step3PlacedTileIds,
    step3ImplicitSuccess,
    step5CurrentIndex: Math.max(0, interactiveCount - 1),
    step5CaseLocked: true,
    step5SelectedCase: (lastComplement?.caso as LatinCase | undefined) ?? null,
  }
}

function buildMicroResultForReview(
  proposizione: Proposizione,
  segmentProgress: VersionSegmentProgress | undefined,
  isPrimary: boolean,
): ProposizioneReviewResult {
  const analysis = proposizioneToLatinAnalysis(proposizione)
  const evaluation: PendingTranslation = {
    id: '',
    fraseOriginale: analysis.frase_originale,
    traduzioneAttesa: '',
    traduzioneStudente: '',
    status: 'approved',
    mechanicalScore: segmentProgress?.mechanicalScore ?? 60,
    stepAnswers: isPrimary ? segmentProgress?.stepAnswers : undefined,
  }
  const draft = buildReviewDraftFromEvaluation(analysis, evaluation)

  return {
    proposizioneId: proposizione.id,
    mechanicalScore: draft.mechanicalScore,
    studentFullTranslation: [
      draft.studentCoreTranslation,
      ...draft.studentComplementTranslations,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
    traduzioneLibera:
      (isPrimary && segmentProgress?.traduzioneSegmento?.trim()) ||
      getPrimaryTranslation(proposizione.step4_nucleo_tradotto),
    studentCoreTranslation: draft.studentCoreTranslation,
    studentComplementTranslations: draft.studentComplementTranslations,
    step1PlacedTileId: draft.step1PlacedTileId,
    step2SelectedAnswers:
      (draft.step2SelectedAnswers as Partial<Record<VerbCategory, string>>) ?? {},
    step3PlacedTileIds: draft.step3PlacedTileIds,
    step3ImplicitSuccess: draft.step3ImplicitSuccess,
  }
}

export interface PeriodReviewState {
  resolvedIds: string[]
  microResults: Record<string, ProposizioneReviewResult>
  finalTranslation: string
}

export function buildPeriodReviewState(
  segment: VersionSegment,
  segmentProgress?: VersionSegmentProgress,
): PeriodReviewState {
  const primary = getVersionSegmentPrimaryProposizione(segment)
  const primaryKey = String(primary.id)

  const microResults = Object.fromEntries(
    segment.proposizioni.map((proposizione) => {
      const key = String(proposizione.id)
      return [
        key,
        buildMicroResultForReview(
          proposizione,
          segmentProgress,
          key === primaryKey,
        ),
      ]
    }),
  )

  return {
    resolvedIds: segment.proposizioni.map((proposizione) =>
      String(proposizione.id),
    ),
    microResults,
    finalTranslation: segmentProgress?.traduzioneSegmento?.trim() ?? '',
  }
}
