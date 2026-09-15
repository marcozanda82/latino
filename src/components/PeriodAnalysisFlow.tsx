import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import {
  PreviousContextPanel,
  type PreviousSegmentContext,
} from './PreviousContextPanel'
import {
  ProposizioneMicroFlow,
  type ProposizioneMicroResult,
} from './period/ProposizioneMicroFlow'
import type { SentenceExerciseCompleteResult } from './SentenceExerciseFlow'
import type { Proposizione, ProposizioneTipo, VersionSegment } from '../types/version'
import { getVersionSegmentLatinText } from '../types/version'
import { calculateSegmentReward } from '../utils/scoring'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { showError } from '../lib/toast'
import { getVersionSegmentPrimaryProposizione } from '../utils/proposizione'

const TIPO_OPTIONS: { value: ProposizioneTipo; label: string }[] = [
  { value: 'principale', label: 'Principale' },
  { value: 'coordinata', label: 'Coordinata' },
  { value: 'subordinata', label: 'Subordinata' },
]

function getProposizioneKey(proposizione: Proposizione): string {
  return String(proposizione.id)
}

export interface PeriodAnalysisFlowProps {
  segment: VersionSegment
  title: string
  segmentMaxReward?: number
  previousContext?: PreviousSegmentContext[]
  onCancel?: () => void
  onComplete?: (result: SentenceExerciseCompleteResult) => void
}

export function PeriodAnalysisFlow({
  segment,
  title,
  segmentMaxReward,
  previousContext = [],
  onCancel,
  onComplete,
}: PeriodAnalysisFlowProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set())
  const [shakingKey, setShakingKey] = useState<string | null>(null)
  const [microResults, setMicroResults] = useState<
    Record<string, ProposizioneMicroResult>
  >({})
  const [finalTranslation, setFinalTranslation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const speechBaseRef = useRef('')

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  } = useSpeechToText()

  const segmentLatin = getVersionSegmentLatinText(segment)

  const allClassified = segment.proposizioni.every((proposizione) =>
    resolvedIds.has(getProposizioneKey(proposizione)),
  )

  const allMicroComplete = segment.proposizioni.every((proposizione) =>
    Boolean(microResults[getProposizioneKey(proposizione)]),
  )

  const activeMicroKey = useMemo(() => {
    for (const proposizione of segment.proposizioni) {
      const key = getProposizioneKey(proposizione)
      if (resolvedIds.has(key) && !microResults[key]) {
        return key
      }
    }
    return null
  }, [microResults, resolvedIds, segment.proposizioni])

  const suggestedFinalTranslation = useMemo(
    () =>
      segment.proposizioni
        .map((proposizione) => microResults[getProposizioneKey(proposizione)]?.studentFullTranslation ?? '')
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    [microResults, segment.proposizioni],
  )

  useEffect(() => {
    if (allMicroComplete && !finalTranslation.trim() && suggestedFinalTranslation) {
      setFinalTranslation(suggestedFinalTranslation)
    }
  }, [allMicroComplete, finalTranslation, suggestedFinalTranslation])

  useEffect(() => {
    if (!transcript.trim()) return

    const base = speechBaseRef.current.trim()
    const spoken = transcript.trim()
    setFinalTranslation(base ? `${base} ${spoken}` : spoken)
  }, [transcript])

  const averageMechanicalScore = useMemo(() => {
    const scores = segment.proposizioni
      .map((proposizione) => microResults[getProposizioneKey(proposizione)]?.mechanicalScore)
      .filter((score): score is number => typeof score === 'number')

    if (scores.length === 0) return 0
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }, [microResults, segment.proposizioni])

  const projectedSesterzi = useMemo(() => {
    if (typeof segmentMaxReward !== 'number' || segmentMaxReward <= 0) {
      return undefined
    }
    return calculateSegmentReward(segmentMaxReward, averageMechanicalScore)
  }, [averageMechanicalScore, segmentMaxReward])

  const handleClassificationSelect = useCallback(
    (proposizione: Proposizione, selected: ProposizioneTipo) => {
      const key = getProposizioneKey(proposizione)

      if (resolvedIds.has(key)) return

      if (selected !== proposizione.tipo_proposizione) {
        const chipKey = `${key}-${selected}`
        setShakingKey(chipKey)
        showError('Tipo di proposizione errato. Riprova.')
        window.setTimeout(() => setShakingKey(null), 500)
        return
      }

      setResolvedIds((current) => new Set([...current, key]))
    },
    [resolvedIds],
  )

  const handleMicroComplete = useCallback(
    (result: ProposizioneMicroResult) => {
      setMicroResults((current) => ({
        ...current,
        [String(result.proposizioneId)]: result,
      }))
    },
    [],
  )

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
      return
    }

    speechBaseRef.current = finalTranslation
    startListening()
  }

  const handleConfirmSegment = () => {
    if (!finalTranslation.trim() || isSubmitting || !allMicroComplete) return

    const primaryProposizione = getVersionSegmentPrimaryProposizione(segment)
    const primaryKey = getProposizioneKey(primaryProposizione)
    const primaryResult =
      microResults[primaryKey] ??
      Object.values(microResults)[0]

    if (!primaryResult) return

    setIsSubmitting(true)
    try {
      onComplete?.({
        mechanicalScore: averageMechanicalScore,
        studentFullTranslation: finalTranslation.trim(),
        xpScore: 0,
        step1PlacedTileId: primaryResult.step1PlacedTileId,
        step2SelectedAnswers: primaryResult.step2SelectedAnswers,
        step3PlacedTileIds: primaryResult.step3PlacedTileIds,
        step3ImplicitSuccess: primaryResult.step3ImplicitSuccess,
        studentCoreTranslation: primaryResult.studentCoreTranslation,
        studentComplementTranslations: primaryResult.studentComplementTranslations,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout
      header={
        <div className="relative">
          <div className="absolute right-0 top-0 flex flex-col items-end gap-2">
            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 shadow-sm">
              Analisi: {averageMechanicalScore}/60
            </span>
            {typeof projectedSesterzi === 'number' && projectedSesterzi > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tabular-nums text-amber-900 shadow-sm">
                ~{projectedSesterzi.toLocaleString('it-IT')} Sesterzi
              </span>
            ) : null}
          </div>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="mb-3 text-xs font-semibold text-sky-700 can-hover:hover:text-sky-900"
            >
              ← Torna alla versione
            </button>
          ) : null}

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Analisi del periodo · Segmento
          </p>
          <h1 className="mt-2 max-w-[70%] font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {!allClassified
              ? 'Classifica ogni proposizione, poi completa l\'analisi logica a 5 step.'
              : !allMicroComplete
                ? 'Completa l\'analisi di ogni proposizione in ordine.'
                : 'Unisci le traduzioni in una frase fluida per il segmento.'}
          </p>
        </div>
      }
    >
      <PreviousContextPanel segments={previousContext} />

      <GlassCard>
        <div className="flex flex-col gap-5">
          {segment.proposizioni.map((proposizione, index) => {
            const key = getProposizioneKey(proposizione)
            const isResolved = resolvedIds.has(key)
            const microComplete = Boolean(microResults[key])
            const isActiveMicro = activeMicroKey === key

            return (
              <motion.section
                key={key}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={[
                  'rounded-xl border p-5 transition-colors',
                  isResolved
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-200 bg-white',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Proposizione {index + 1}
                    </p>
                    <p className="mt-2 font-serif text-xl leading-relaxed text-slate-800">
                      {proposizione.testo_proposizione}
                    </p>
                  </div>
                  {isResolved && (
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      Classificata
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {TIPO_OPTIONS.map((option) => {
                    const chipKey = `${key}-${option.value}`
                    const isSelected =
                      isResolved && proposizione.tipo_proposizione === option.value

                    return (
                      <motion.button
                        key={chipKey}
                        type="button"
                        disabled={isResolved}
                        onClick={() =>
                          handleClassificationSelect(proposizione, option.value)
                        }
                        animate={
                          shakingKey === chipKey
                            ? { x: [0, -6, 6, -4, 4, 0] }
                            : { x: 0 }
                        }
                        transition={{ duration: 0.45 }}
                        className={[
                          'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50',
                          isResolved && !isSelected
                            ? 'opacity-40'
                            : '',
                          isResolved ? 'cursor-default' : 'cursor-pointer',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {option.label}
                      </motion.button>
                    )
                  })}
                </div>

                <AnimatePresence>
                  {isResolved && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ProposizioneMicroFlow
                        proposizione={proposizione}
                        isActive={isActiveMicro}
                        isComplete={microComplete}
                        completedResult={microResults[key]}
                        onComplete={handleMicroComplete}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )
          })}
        </div>

        <AnimatePresence>
          {allMicroComplete && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-slate-800">
                Traduzione finale del segmento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Unisci le traduzioni dei nuclei in un italiano scorrevole per
                l&apos;intero segmento.
              </p>

              <label htmlFor="segment-final-translation" className="sr-only">
                Traduzione finale del segmento
              </label>
              <div className="relative mt-4">
                <textarea
                  id="segment-final-translation"
                  rows={4}
                  value={finalTranslation}
                  onChange={(event) => setFinalTranslation(event.target.value)}
                  placeholder="Scrivi la traduzione fluida del segmento…"
                  className={[
                    'w-full resize-y rounded-lg border border-slate-200 bg-white py-3 text-base text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400',
                    isSupported ? 'pl-4 pr-12' : 'px-4',
                  ].join(' ')}
                />

                {isSupported && (
                  <motion.button
                    type="button"
                    onClick={handleMicToggle}
                    aria-label={
                      isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'
                    }
                    aria-pressed={isListening}
                    animate={
                      isListening
                        ? { scale: [1, 1.08, 1], opacity: [1, 0.85, 1] }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={
                      isListening
                        ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.2 }
                    }
                    className={[
                      'absolute right-2 top-3 flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                      isListening
                        ? 'border-red-300 bg-red-50 text-red-600 can-hover:hover:bg-red-100'
                        : 'border-slate-200 bg-white text-slate-500 can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50 can-hover:hover:text-slate-700',
                    ].join(' ')}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Mic className="h-4 w-4" aria-hidden="true" />
                    )}
                  </motion.button>
                )}
              </div>

              {suggestedFinalTranslation && (
                <p className="mt-3 text-xs text-slate-500">
                  Suggerimento: {suggestedFinalTranslation}
                </p>
              )}

              <button
                type="button"
                onClick={handleConfirmSegment}
                disabled={!finalTranslation.trim() || isSubmitting}
                className="mt-5 cursor-pointer rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isSubmitting ? 'Conferma in corso…' : 'Conferma segmento'}
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </GlassCard>

      <footer className="mt-8 text-center">
        <p className="font-serif text-lg italic text-slate-500">
          « {segmentLatin} »
        </p>
      </footer>
    </AppLayout>
  )
}
