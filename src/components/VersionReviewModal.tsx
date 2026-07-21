import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, X } from 'lucide-react'
import type { PendingTranslation } from '../types/evaluation'

interface VersionReviewModalProps {
  evaluation: PendingTranslation
  isSubmitting?: boolean
  onClose: () => void
  onApprove: (payload: { reward: number; tutorNotes: string }) => void
}

export function VersionReviewModal({
  evaluation,
  isSubmitting = false,
  onClose,
  onApprove,
}: VersionReviewModalProps) {
  const [segmentsOpen, setSegmentsOpen] = useState(false)
  const [rewardInput, setRewardInput] = useState('')
  const [tutorNotes, setTutorNotes] = useState('')

  useEffect(() => {
    const suggested =
      typeof evaluation.suggestedReward === 'number'
        ? evaluation.suggestedReward
        : undefined
    setRewardInput(suggested !== undefined ? String(suggested) : '')
    setTutorNotes('')
    setSegmentsOpen(false)
  }, [evaluation.id, evaluation.suggestedReward])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isSubmitting, onClose])

  const title = evaluation.titolo || evaluation.fraseOriginale
  const author = evaluation.autore || 'Autore non indicato'
  const bellaCopia =
    evaluation.freeTranslation?.trim() ||
    evaluation.traduzioneStudente.trim() ||
    '—'
  const segments = evaluation.segmentTranslations ?? []

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
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setSegmentsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              aria-expanded={segmentsOpen}
            >
              <span className="text-sm font-semibold text-slate-800">
                Mostra dettaglio segmenti (Brutta Copia)
              </span>
              <ChevronDown
                className={[
                  'h-4 w-4 shrink-0 text-slate-500 transition-transform',
                  segmentsOpen ? 'rotate-180' : '',
                ].join(' ')}
              />
            </button>

            <AnimatePresence initial={false}>
              {segmentsOpen ? (
                <motion.div
                  key="segments"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden border-t border-slate-100"
                >
                  <div className="space-y-3 px-4 py-4">
                    {segments.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nessun segmento di brutta copia disponibile.
                      </p>
                    ) : (
                      segments.map((segment, index) => (
                        <div
                          key={`${segment.id}-${index}`}
                          className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Segmento {index + 1}
                          </p>
                          <p className="mt-2 font-serif text-sm font-semibold leading-relaxed text-slate-800">
                            {segment.latino}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-700">
                            {segment.traduzione.trim() || (
                              <span className="italic text-slate-400">
                                (traduzione assente)
                              </span>
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Valutazione
            </p>

            <label
              htmlFor="version-reward"
              className="mt-4 block text-sm font-medium text-slate-700"
            >
              Premio in Sesterzi
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
            {typeof evaluation.suggestedReward === 'number' ? (
              <p className="mt-2 text-xs text-slate-500">
                Suggerito dal livello:{' '}
                {evaluation.suggestedReward.toLocaleString('it-IT')} Sesterzi
              </p>
            ) : null}

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
              {isSubmitting
                ? 'Salvataggio…'
                : 'Approva e Assegna Ricompensa'}
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
