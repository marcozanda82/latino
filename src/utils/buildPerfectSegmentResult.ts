import type { SentenceExerciseCompleteResult } from '../components/SentenceExerciseFlow'
import type { PendingTranslation } from '../types/evaluation'
import type { VersionSegment } from '../types/version'
import { buildFullTranslation } from './complements'
import {
  buildVersionSegmentFullTranslation,
  getVersionSegmentPrimaryProposizione,
  proposizioneToLatinAnalysis,
} from './proposizione'
import { buildReviewDraftFromEvaluation } from './reviewState'

const PERFECT_MECHANICAL_SCORE = 60

/** Simula risposte perfette per un segmento versione (override tutor). */
export function buildPerfectSegmentCompleteResult(
  segment: VersionSegment,
): SentenceExerciseCompleteResult {
  const primaryProposizione = getVersionSegmentPrimaryProposizione(segment)
  const analysis = proposizioneToLatinAnalysis(primaryProposizione)
  const studentFullTranslation = buildVersionSegmentFullTranslation(segment)

  const evaluation: PendingTranslation = {
    id: '',
    fraseOriginale: analysis.frase_originale,
    traduzioneAttesa: buildFullTranslation(analysis),
    traduzioneStudente: studentFullTranslation,
    status: 'approved',
    mechanicalScore: PERFECT_MECHANICAL_SCORE,
  }

  const draft = buildReviewDraftFromEvaluation(analysis, evaluation)

  return {
    mechanicalScore: PERFECT_MECHANICAL_SCORE,
    studentFullTranslation,
    xpScore: 0,
    step1PlacedTileId: draft.step1PlacedTileId,
    step2SelectedAnswers: draft.step2SelectedAnswers ?? {},
    step3PlacedTileIds: draft.step3PlacedTileIds,
    step3ImplicitSuccess: draft.step3ImplicitSuccess,
    studentCoreTranslation: draft.studentCoreTranslation,
    studentComplementTranslations: draft.studentComplementTranslations,
  }
}
