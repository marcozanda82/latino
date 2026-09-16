import { useEffect, useState } from 'react'
import type { LatinAnalysis } from '../types'
import type { ExerciseDraftData } from '../types/exerciseDraft'
import { SentenceExerciseFlow } from './SentenceExerciseFlow'
import { getArchivedEvaluationForLevel } from '../services/firebaseEvaluations'
import { buildReviewDraftFromEvaluation } from '../utils/reviewState'
import { PlayLevelSkeleton } from './ui/Skeletons'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'

interface LatinTranslatorProps {
  analysis: LatinAnalysis
  levelTitle: string
  levelId?: string
  customMaxReward?: number
  isReviewMode?: boolean
  onBackToLevels: () => void
}

export function LatinTranslator({
  analysis,
  levelTitle,
  levelId,
  customMaxReward,
  isReviewMode = false,
  onBackToLevels,
}: LatinTranslatorProps) {
  const [reviewDraft, setReviewDraft] = useState<ExerciseDraftData | undefined>()
  const [reviewLoading, setReviewLoading] = useState(isReviewMode)

  useEffect(() => {
    if (!isReviewMode || !levelId) {
      setReviewLoading(false)
      return
    }

    let cancelled = false

    void getArchivedEvaluationForLevel(levelId).then((evaluation) => {
      if (cancelled) return

      if (evaluation) {
        setReviewDraft(buildReviewDraftFromEvaluation(analysis, evaluation))
      }

      setReviewLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [analysis, isReviewMode, levelId])

  if (reviewLoading) {
    return <PlayLevelSkeleton />
  }

  if (isReviewMode && !reviewDraft) {
    return (
      <AppLayout>
        <GlassCard className="py-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nessuna consegna archiviata per questo esercizio.
          </p>
          <button
            type="button"
            onClick={onBackToLevels}
            className="mt-6 rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white"
          >
            Torna indietro
          </button>
        </GlassCard>
      </AppLayout>
    )
  }

  return (
    <SentenceExerciseFlow
      mode="standalone"
      analysis={analysis}
      title={levelTitle}
      levelId={levelId}
      customMaxReward={customMaxReward}
      isReviewMode={isReviewMode}
      initialDraft={isReviewMode ? reviewDraft : undefined}
      onBackToLevels={onBackToLevels}
    />
  )
}
