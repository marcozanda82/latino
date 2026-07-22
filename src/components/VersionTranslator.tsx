import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import {
  SentenceExerciseFlow,
  type SentenceExerciseCompleteResult,
} from './SentenceExerciseFlow'
import { showError, showSuccess } from '../lib/toast'
import { submitVersionForReview } from '../services/firebaseEvaluations'
import { useVersionProgress } from '../hooks/useVersionProgress'
import { buildFullTranslation } from '../utils/complements'
import {
  calculateSegmentReward,
} from '../utils/scoring'
import type {
  VersionExercise,
  VersionSegment,
  VersionSegmentProgressStatus,
  VersionSegmentSubmission,
} from '../types/version'
import { getVersionSegmentLatinText } from '../types/version'

interface VersionTranslatorProps {
  version: VersionExercise
  levelId?: string
  levelTitle?: string
  customMaxReward?: number
  onBackToLevels: () => void
}

const STATUS_LABELS: Record<
  VersionSegmentProgressStatus,
  { emoji: string; label: string; className: string }
> = {
  locked: {
    emoji: '🔒',
    label: 'Bloccato',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
  },
  available: {
    emoji: '▶',
    label: 'Disponibile',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  in_progress: {
    emoji: '⏳',
    label: 'In corso',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  completed: {
    emoji: '✅',
    label: 'Completato',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
}

function buildDefaultBellaCopia(
  segments: VersionSegment[],
  segmentProgress: Record<number, { traduzioneSegmento?: string }>,
): string {
  return segments
    .map((segment) => segmentProgress[segment.id]?.traduzioneSegmento?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function VersionTranslator({
  version,
  levelId,
  levelTitle,
  customMaxReward,
  onBackToLevels,
}: VersionTranslatorProps) {
  const segmentIds = useMemo(
    () => version.segmenti.map((segment) => segment.id),
    [version.segmenti],
  )

  const { progress, loading, error, persistProgress } = useVersionProgress(
    levelId,
    segmentIds,
  )

  const [bellaCopiaDraft, setBellaCopiaDraft] = useState('')
  const [bellaCopiaInitialized, setBellaCopiaInitialized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const title = levelTitle?.trim() || version.titolo
  const isSubmitted = Boolean(progress?.submittedAt)

  const allSegmentsCompleted = useMemo(() => {
    if (!progress) return false
    return version.segmenti.every(
      (segment) => progress.segments[segment.id]?.status === 'completed',
    )
  }, [progress, version.segmenti])

  const activeSegmentId = progress?.activeSegmentId ?? null
  const activeSegment =
    activeSegmentId !== null
      ? version.segmenti.find((segment) => segment.id === activeSegmentId)
      : undefined

  useEffect(() => {
    if (!progress || !allSegmentsCompleted || bellaCopiaInitialized) return

    const defaultText =
      progress.bellaCopia?.trim() ||
      buildDefaultBellaCopia(version.segmenti, progress.segments)

    setBellaCopiaDraft(defaultText)
    setBellaCopiaInitialized(true)
  }, [progress, allSegmentsCompleted, bellaCopiaInitialized, version.segmenti])

  const handleStartSegment = useCallback(
    async (segmentId: number) => {
      if (!progress || isSubmitted) return

      const currentStatus = progress.segments[segmentId]?.status
      if (currentStatus !== 'available' && currentStatus !== 'in_progress') {
        return
      }

      try {
        await persistProgress({
          ...progress,
          activeSegmentId: segmentId,
          segments: {
            ...progress.segments,
            [segmentId]: {
              ...progress.segments[segmentId],
              status: 'in_progress',
            },
          },
          updatedAt: new Date().toISOString(),
        })
      } catch {
        showError('Impossibile avviare il segmento. Riprova.')
      }
    },
    [progress, isSubmitted, persistProgress],
  )

  const handleCancelSegment = useCallback(async () => {
    if (!progress) return

    try {
      await persistProgress({
        ...progress,
        activeSegmentId: null,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      showError('Impossibile tornare alla panoramica. Riprova.')
    }
  }, [progress, persistProgress])

  const handleSegmentComplete = useCallback(
    async (segmentId: number, result: SentenceExerciseCompleteResult) => {
      if (!progress) return

      const sortedIds = [...segmentIds].sort((a, b) => a - b)
      const currentIndex = sortedIds.indexOf(segmentId)
      const nextId =
        currentIndex >= 0 && currentIndex < sortedIds.length - 1
          ? sortedIds[currentIndex + 1]
          : null

      const segments = {
        ...progress.segments,
        [segmentId]: {
          status: 'completed' as const,
          mechanicalScore: result.mechanicalScore,
          traduzioneSegmento: result.studentFullTranslation,
          xpScore: result.xpScore,
          stepAnswers: {
            step1PlacedTileId: result.step1PlacedTileId,
            step2SelectedAnswers: result.step2SelectedAnswers,
            step3PlacedTileIds: result.step3PlacedTileIds,
            step3ImplicitSuccess: result.step3ImplicitSuccess,
            studentCoreTranslation: result.studentCoreTranslation,
            studentComplementTranslations: result.studentComplementTranslations,
          },
        },
      }

      if (nextId && segments[nextId]?.status === 'locked') {
        segments[nextId] = { ...segments[nextId], status: 'available' }
      }

      const updatedProgress = {
        ...progress,
        activeSegmentId: null,
        segments,
        updatedAt: new Date().toISOString(),
      }

      try {
        await persistProgress(updatedProgress)

        const willAllBeComplete = version.segmenti.every(
          (segment) => updatedProgress.segments[segment.id]?.status === 'completed',
        )

        if (willAllBeComplete) {
          const defaultBellaCopia = buildDefaultBellaCopia(
            version.segmenti,
            updatedProgress.segments,
          )
          setBellaCopiaDraft(
            updatedProgress.bellaCopia?.trim() || defaultBellaCopia,
          )
          setBellaCopiaInitialized(true)
        }
      } catch {
        showError('Impossibile salvare il segmento completato. Riprova.')
      }
    },
    [progress, segmentIds, persistProgress, version.segmenti],
  )

  const handleBellaCopiaChange = (value: string) => {
    setBellaCopiaDraft(value)
  }

  const handleBellaCopiaBlur = useCallback(async () => {
    if (!progress || isSubmitted) return

    try {
      await persistProgress({
        ...progress,
        bellaCopia: bellaCopiaDraft,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      console.error('[VersionTranslator] bellaCopia save failed')
    }
  }, [progress, isSubmitted, persistProgress, bellaCopiaDraft])

  const buildSegmentSubmissions = useCallback((): VersionSegmentSubmission[] => {
    if (!progress) return []

    return version.segmenti.map((segment) => {
      const segmentProgress = progress.segments[segment.id]
      return {
        id: segment.id,
        latino: getVersionSegmentLatinText(segment),
        traduzioneSegmento: segmentProgress?.traduzioneSegmento?.trim() ?? '',
        mechanicalScore: segmentProgress?.mechanicalScore ?? 0,
        compensoAssegnato: segment.compenso_assegnato,
        xpScore: segmentProgress?.xpScore,
        traduzioneAttesa: buildFullTranslation(segment.analisi),
        stepAnswers: segmentProgress?.stepAnswers,
      }
    })
  }, [progress, version.segmenti])

  const handleSubmitVersion = async () => {
    if (!progress || !allSegmentsCompleted || isSubmitted) return

    const bellaCopia = bellaCopiaDraft.trim()
    if (!bellaCopia) {
      showError('Completa la bella copia prima di consegnare la versione.')
      return
    }

    setIsSubmitting(true)

    try {
      await submitVersionForReview({
        levelId,
        titolo: title,
        autore: version.autore,
        segmentTranslations: buildSegmentSubmissions(),
        bellaCopia,
        suggestedReward:
          typeof customMaxReward === 'number' &&
          Number.isFinite(customMaxReward)
            ? Math.round(customMaxReward)
            : undefined,
      })

      await persistProgress({
        ...progress,
        bellaCopia,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      showSuccess('Versione consegnata. In attesa della valutazione del tutor.')
    } catch (submitError) {
      console.error('[VersionTranslator] handleSubmitVersion failed:', submitError)
      showError('Impossibile consegnare la versione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout
        header={
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Versione latina
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
              {title}
            </h1>
          </div>
        }
      >
        <LevelCardsSkeleton count={Math.min(version.segmenti.length, 4)} />
      </AppLayout>
    )
  }

  if (error || !progress) {
    return (
      <AppLayout>
        <GlassCard className="py-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            {error ?? 'Progressi non disponibili.'}
          </p>
          <button
            type="button"
            onClick={onBackToLevels}
            className="mt-6 rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white"
          >
            Torna ai Livelli
          </button>
        </GlassCard>
      </AppLayout>
    )
  }

  if (activeSegment && !isSubmitted) {
    const segmentIndex = version.segmenti.findIndex(
      (segment) => segment.id === activeSegment.id,
    )

    return (
      <SentenceExerciseFlow
        key={activeSegment.id}
        mode="version-segment"
        analysis={activeSegment.analisi}
        title={`${title} · Segmento ${segmentIndex + 1}`}
        segmentMaxReward={activeSegment.compenso_assegnato}
        hideTutorSubmit
        initialDraft={progress.segments[activeSegment.id]?.draft}
        onCancel={handleCancelSegment}
        onComplete={(result) => void handleSegmentComplete(activeSegment.id, result)}
      />
    )
  }

  const completedCount = version.segmenti.filter(
    (segment) => progress.segments[segment.id]?.status === 'completed',
  ).length

  return (
    <AppLayout
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Versione latina
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {version.autore}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {completedCount}/{version.segmenti.length} segmenti completati
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <GlassCard className="!p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Introduzione
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {version.introduzione}
          </p>
        </GlassCard>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Segmenti</h2>
            <p className="mt-1 text-sm text-slate-500">
              Risolvi un segmento alla volta con l&apos;analisi logica a 5 step.
              I progressi vengono salvati automaticamente.
            </p>
          </div>

          <div className="grid gap-4">
            {version.segmenti.map((segment, index) => {
              const segmentProgress = progress.segments[segment.id]
              const status = segmentProgress?.status ?? 'locked'
              const statusMeta = STATUS_LABELS[status]
              const latinPreview = getVersionSegmentLatinText(segment)
              const truncatedLatin =
                latinPreview.length > 140
                  ? `${latinPreview.slice(0, 140)}…`
                  : latinPreview
              const canStart =
                !isSubmitted &&
                (status === 'available' || status === 'in_progress')

              return (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <GlassCard
                    className={[
                      '!p-5 transition-colors',
                      status === 'completed'
                        ? 'border border-emerald-200 bg-emerald-50/30'
                        : status === 'in_progress'
                          ? 'border border-amber-200 bg-amber-50/20'
                          : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Segmento {index + 1}
                        </p>
                        <span
                          className={[
                            'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                            statusMeta.className,
                          ].join(' ')}
                        >
                          <span aria-hidden>{statusMeta.emoji}</span>
                          {statusMeta.label}
                        </span>
                      </div>

                      {typeof segment.compenso_assegnato === 'number' &&
                      segment.compenso_assegnato > 0 ? (
                        status === 'completed' &&
                        segmentProgress?.mechanicalScore !== undefined ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tabular-nums text-amber-900">
                            🪙{' '}
                            {calculateSegmentReward(
                              segment.compenso_assegnato,
                              segmentProgress.mechanicalScore,
                            ).toLocaleString('it-IT')}{' '}
                            /{' '}
                            {segment.compenso_assegnato.toLocaleString('it-IT')}{' '}
                            Sesterzi
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tabular-nums text-amber-900">
                            fino a{' '}
                            {segment.compenso_assegnato.toLocaleString('it-IT')}{' '}
                            Sesterzi
                          </span>
                        )
                      ) : null}
                    </div>

                    {segment.note?.trim() ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs italic text-amber-900">
                        {segment.note}
                      </p>
                    ) : null}

                    <p className="mt-3 font-serif text-base font-semibold leading-relaxed text-slate-800">
                      {truncatedLatin}
                    </p>

                    {status === 'completed' &&
                    segmentProgress?.mechanicalScore !== undefined ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Analisi meccanica: {segmentProgress.mechanicalScore}/60
                      </p>
                    ) : null}

                    {canStart ? (
                      <button
                        type="button"
                        onClick={() => void handleStartSegment(segment.id)}
                        className="mt-4 rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-slate-700"
                      >
                        {status === 'in_progress'
                          ? 'Riprendi segmento'
                          : 'Risolvi segmento'}
                      </button>
                    ) : null}
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </section>

        {allSegmentsCompleted ? (
          <GlassCard className="!p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Bella copia finale
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Abbiamo unito le traduzioni dei segmenti in una bozza. Rifinisci
                il testo in un italiano scorrevole prima della consegna.
              </p>
            </div>

            <label
              htmlFor="version-bella-copia"
              className="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Resa in italiano fluida
            </label>
            <textarea
              id="version-bella-copia"
              rows={6}
              value={bellaCopiaDraft}
              onChange={(event) => handleBellaCopiaChange(event.target.value)}
              onBlur={() => void handleBellaCopiaBlur()}
              disabled={isSubmitted}
              placeholder="Riscrivi la versione in un italiano naturale e coerente…"
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
            />

            {!isSubmitted ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSubmitVersion()}
                  disabled={
                    isSubmitting || !bellaCopiaDraft.trim() || !allSegmentsCompleted
                  }
                  className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSubmitting ? 'Consegna in corso…' : 'Consegna Versione'}
                </button>
                <button
                  type="button"
                  onClick={onBackToLevels}
                  className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors can-hover:hover:bg-slate-50"
                >
                  Torna ai Livelli
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm font-medium text-sky-900">
                  Versione consegnata con successo. In attesa della valutazione
                  del tutor.
                </div>
                <button
                  type="button"
                  onClick={onBackToLevels}
                  className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-slate-700"
                >
                  Torna ai Livelli
                </button>
              </div>
            )}
          </GlassCard>
        ) : (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onBackToLevels}
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors can-hover:hover:bg-slate-50"
            >
              Torna ai Livelli
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
