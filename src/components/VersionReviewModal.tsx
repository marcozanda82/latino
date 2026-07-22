import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { PendingTranslation } from '../types/evaluation'
import type { VersionSegmentStepAnswers } from '../types/version'
import {
  calculateSegmentReward,
  calculateVersionTotalSegmentReward,
} from '../utils/scoring'
import {
  VERB_CATEGORY_LABELS,
  type VerbCategory,
} from '../utils/verbAnalysis'

interface VersionReviewModalProps {
  evaluation: PendingTranslation
  isSubmitting?: boolean
  onClose: () => void
  onApprove: (payload: { reward: number; tutorNotes: string }) => void
}

function wordFromTileId(tileId: string): string {
  const parts = tileId.split('-')
  return parts.length >= 3 ? parts.slice(2).join('-') : tileId
}

function SegmentStepRecap({
  stepAnswers,
}: {
  stepAnswers?: VersionSegmentStepAnswers
}) {
  if (!stepAnswers) {
    return (
      <p className="text-xs italic text-slate-400">
        Dettaglio analitico non disponibile (consegna precedente al nuovo flusso).
      </p>
    )
  }

  const placedVerb = stepAnswers.step1PlacedTileId
    ? wordFromTileId(stepAnswers.step1PlacedTileId)
    : '—'

  const step2Entries = (
    Object.entries(stepAnswers.step2SelectedAnswers) as [VerbCategory, string][]
  ).filter(([, value]) => Boolean(value))

  const subjectLabel = stepAnswers.step3ImplicitSuccess
    ? 'Soggetto sottinteso'
    : stepAnswers.step3PlacedTileIds.length > 0
      ? stepAnswers.step3PlacedTileIds.map(wordFromTileId).join(', ')
      : '—'

  return (
    <dl className="mt-4 grid gap-2 rounded-lg border border-slate-100 bg-white px-3 py-3 text-xs">
      <div className="flex justify-between gap-3">
        <dt className="text-slate-500">Verbo</dt>
        <dd className="font-medium text-slate-800">{placedVerb}</dd>
      </div>
      {step2Entries.length > 0 ? (
        step2Entries.map(([category, value]) => (
          <div key={category} className="flex justify-between gap-3">
            <dt className="text-slate-500">{VERB_CATEGORY_LABELS[category]}</dt>
            <dd className="font-medium text-slate-800">{value}</dd>
          </div>
        ))
      ) : (
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Analisi verbo</dt>
          <dd className="text-slate-400">—</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt className="text-slate-500">Soggetto</dt>
        <dd className="font-medium text-slate-800">{subjectLabel}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-slate-500">Nucleo</dt>
        <dd className="text-right font-medium text-slate-800">
          {stepAnswers.studentCoreTranslation.trim() || '—'}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">Complementi</dt>
        <dd className="mt-1 font-medium text-slate-800">
          {stepAnswers.studentComplementTranslations.length > 0 ? (
            <ul className="space-y-1">
              {stepAnswers.studentComplementTranslations.map((text, index) => (
                <li key={`${text}-${index}`}>{text}</li>
              ))}
            </ul>
          ) : (
            '—'
          )}
        </dd>
      </div>
    </dl>
  )
}

export function VersionReviewModal({
  evaluation,
  isSubmitting = false,
  onClose,
  onApprove,
}: VersionReviewModalProps) {
  const [rewardInput, setRewardInput] = useState('')
  const [tutorNotes, setTutorNotes] = useState('')

  const title = evaluation.titolo || evaluation.fraseOriginale
  const author = evaluation.autore || 'Autore non indicato'
  const bellaCopia =
    evaluation.freeTranslation?.trim() ||
    evaluation.traduzioneStudente.trim() ||
    '—'
  const segments = evaluation.segmentTranslations ?? []
  const latinContext = evaluation.fraseOriginale.trim()

  const totalEarnedSesterzi = useMemo(
    () => calculateVersionTotalSegmentReward(segments),
    [segments],
  )

  const defaultReward = useMemo(() => {
    if (totalEarnedSesterzi > 0) return totalEarnedSesterzi
    if (typeof evaluation.suggestedReward === 'number') {
      return evaluation.suggestedReward
    }
    return 0
  }, [totalEarnedSesterzi, evaluation.suggestedReward])

  useEffect(() => {
    setRewardInput(String(defaultReward))
    setTutorNotes('')
  }, [evaluation.id, defaultReward])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSubmitting, onClose])

  const rewardValue = Number(rewardInput)
  const canApprove =
    !isSubmitting && Number.isFinite(rewardValue) && rewardValue >= 0

  const handleApprove = () => {
    if (!canApprove) return
    onApprove({
      reward: Math.round(rewardValue),
      tutorNotes: tutorNotes.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-review-title"
      onClick={() => {
        if (!isSubmitting) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  Versione
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  In attesa
                </span>
              </div>
              <h2
                id="version-review-title"
                className="mt-3 font-serif text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">{author}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="rounded-xl border border-sky-200 bg-sky-50/70 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
              Bella copia
            </p>
            <p className="mt-3 whitespace-pre-wrap font-serif text-base leading-relaxed text-slate-800 sm:text-lg">
              {bellaCopia}
            </p>

            {latinContext ? (
              <div className="mt-5 border-t border-sky-200/80 pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-sky-700/80">
                  Contesto — testo latino completo
                </p>
                <p className="mt-2 whitespace-pre-wrap font-serif text-sm italic leading-relaxed text-slate-700">
                  {latinContext}
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Dettaglio segmenti
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Espandi ogni segmento per vedere traduzione, punteggio e analisi
                logica dello studente.
              </p>
            </div>

            {segments.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nessun segmento disponibile in questa consegna.
              </p>
            ) : (
              segments.map((segment, index) => {
                const traduzione =
                  (segment.traduzioneSegmento ?? segment.traduzione ?? '').trim()
                const compenso = segment.compensoAssegnato ?? 0
                const earned = calculateSegmentReward(
                  compenso,
                  segment.mechanicalScore,
                )

                return (
                  <details
                    key={`${segment.id}-${index}`}
                    className="group rounded-xl border border-slate-200 bg-white open:border-slate-300 open:shadow-sm"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          Segmento {index + 1}
                        </p>
                        <p className="mt-0.5 truncate font-serif text-xs italic text-slate-500">
                          {segment.latino}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-xs font-semibold tabular-nums">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                          Analisi {segment.mechanicalScore}/60
                        </span>
                        {compenso > 0 ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900">
                            🪙 {earned.toLocaleString('it-IT')} /{' '}
                            {compenso.toLocaleString('it-IT')}
                          </span>
                        ) : null}
                      </div>
                    </summary>

                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Latino
                      </p>
                      <p className="mt-2 font-serif text-sm font-semibold leading-relaxed text-slate-800">
                        {segment.latino}
                      </p>

                      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Traduzione segmento
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {traduzione || (
                          <span className="italic text-slate-400">
                            (traduzione assente)
                          </span>
                        )}
                      </p>

                      {segment.traduzioneAttesa?.trim() ? (
                        <>
                          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Traduzione attesa
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {segment.traduzioneAttesa}
                          </p>
                        </>
                      ) : null}

                      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Recap analisi (5 step)
                      </p>
                      <SegmentStepRecap stepAnswers={segment.stepAnswers} />
                    </div>
                  </details>
                )
              })
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Approvazione e reward
            </p>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
              <p className="text-sm font-medium text-amber-950">
                Totale Sesterzi guadagnati (somma segmenti)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900">
                {totalEarnedSesterzi.toLocaleString('it-IT')}
              </p>
              {typeof evaluation.suggestedReward === 'number' &&
              evaluation.suggestedReward !== totalEarnedSesterzi ? (
                <p className="mt-1 text-xs text-amber-800/80">
                  Compenso massimo livello:{' '}
                  {evaluation.suggestedReward.toLocaleString('it-IT')} Sesterzi
                </p>
              ) : null}
            </div>

            <label
              htmlFor="version-reward"
              className="mt-4 block text-sm font-medium text-slate-700"
            >
              Sesterzi da assegnare
            </label>
            <input
              id="version-reward"
              type="number"
              min={0}
              step={1}
              value={rewardInput}
              onChange={(event) => setRewardInput(event.target.value)}
              disabled={isSubmitting}
              placeholder="Es. 150"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-slate-500">
              Pre-compilato con la somma dei segmenti. Puoi aumentarlo per un
              bonus stilistico sulla bella copia.
            </p>

            <label
              htmlFor="version-tutor-notes"
              className="mt-4 block text-sm font-medium text-slate-700"
            >
              Note del Tutor
            </label>
            <textarea
              id="version-tutor-notes"
              rows={4}
              value={tutorNotes}
              onChange={(event) => setTutorNotes(event.target.value)}
              disabled={isSubmitting}
              placeholder="Feedback opzionale per lo studente…"
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 disabled:opacity-60"
            />
          </section>
        </div>

        <footer className="shrink-0 border-t border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove}
              className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isSubmitting ? 'Salvataggio…' : 'Approva e Assegna Sesterzi'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Annulla
            </button>
          </div>
        </footer>
      </motion.div>
    </div>
  )
}
