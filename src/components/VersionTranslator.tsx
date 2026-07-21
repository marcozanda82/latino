import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import { showError, showSuccess } from '../lib/toast'
import { submitVersionForReview } from '../services/firebaseEvaluations'
import type { VersionExercise } from '../types/version'

interface VersionTranslatorProps {
  version: VersionExercise
  levelId?: string
  levelTitle?: string
  customMaxReward?: number
  onBackToLevels: () => void
}

interface SegmentDraft {
  text: string
  isConfirmed: boolean
}

export function VersionTranslator({
  version,
  levelId,
  levelTitle,
  customMaxReward,
  onBackToLevels,
}: VersionTranslatorProps) {
  const segmentRefs = useRef<Record<number, HTMLElement | null>>({})

  const [segmentDrafts, setSegmentDrafts] = useState<Record<number, SegmentDraft>>(
    () =>
      Object.fromEntries(
        version.segmenti.map((segment) => [
          segment.id,
          { text: '', isConfirmed: false },
        ]),
      ),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const title = levelTitle?.trim() || version.titolo

  const confirmedSegments = useMemo(
    () =>
      version.segmenti
        .map((segment) => {
          const draft = segmentDrafts[segment.id]
          if (!draft?.isConfirmed || !draft.text.trim()) return null
          return {
            id: segment.id,
            text: draft.text.trim(),
          }
        })
        .filter((item): item is { id: number; text: string } => item !== null),
    [segmentDrafts, version.segmenti],
  )

  const freeTranslation = useMemo(
    () => confirmedSegments.map((segment) => segment.text).join(' '),
    [confirmedSegments],
  )

  const allSegmentsConfirmed = version.segmenti.every((segment) => {
    const draft = segmentDrafts[segment.id]
    return Boolean(draft?.isConfirmed && draft.text.trim())
  })

  const canSubmit =
    allSegmentsConfirmed &&
    freeTranslation.length > 0 &&
    !isSubmitting &&
    !isSubmitted

  const handleSegmentChange = (segmentId: number, value: string) => {
    setSegmentDrafts((current) => ({
      ...current,
      [segmentId]: {
        text: value,
        isConfirmed: current[segmentId]?.isConfirmed ?? false,
      },
    }))
  }

  const handleConfirmSegment = (segmentId: number) => {
    const draft = segmentDrafts[segmentId]
    if (!draft?.text.trim()) {
      showError('Scrivi una traduzione prima di confermare il segmento.')
      return
    }

    setSegmentDrafts((current) => ({
      ...current,
      [segmentId]: {
        text: current[segmentId]?.text.trim() ?? '',
        isConfirmed: true,
      },
    }))
  }

  const handleEditSegment = (segmentId: number) => {
    setSegmentDrafts((current) => ({
      ...current,
      [segmentId]: {
        text: current[segmentId]?.text ?? '',
        isConfirmed: false,
      },
    }))
  }

  const handleFinalSpanClick = (segmentId: number) => {
    if (isSubmitted) return

    handleEditSegment(segmentId)

    window.requestAnimationFrame(() => {
      segmentRefs.current[segmentId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)

    try {
      await submitVersionForReview({
        levelId,
        titolo: title,
        autore: version.autore,
        segmentTranslations: version.segmenti.map((segment) => ({
          id: segment.id,
          latino: segment.latino,
          traduzione: segmentDrafts[segment.id]?.text.trim() ?? '',
        })),
        bellaCopia: freeTranslation,
        suggestedReward:
          typeof customMaxReward === 'number' && Number.isFinite(customMaxReward)
            ? Math.round(customMaxReward)
            : undefined,
      })

      setIsSubmitted(true)
      showSuccess('Versione consegnata. In attesa della valutazione del tutor.')
    } catch (error) {
      console.error('[VersionTranslator] handleSubmit failed:', error)
      showError('Impossibile consegnare la versione. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <h2 className="text-lg font-semibold text-slate-800">Brutta copia</h2>
            <p className="mt-1 text-sm text-slate-500">
              Traduci e conferma ogni segmento. La bella copia si aggiorna da sola.
            </p>
          </div>

          {version.segmenti.map((segment, index) => {
            const draft = segmentDrafts[segment.id] ?? {
              text: '',
              isConfirmed: false,
            }
            const isLocked = draft.isConfirmed || isSubmitted

            return (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                ref={(node) => {
                  segmentRefs.current[segment.id] = node
                }}
              >
                <GlassCard
                  className={[
                    '!p-5 transition-colors',
                    draft.isConfirmed
                      ? 'border border-emerald-200 bg-emerald-50/40'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Segmento {index + 1}
                      {draft.isConfirmed ? ' · Confermato' : ''}
                    </p>
                    {segment.note?.trim() ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs italic text-amber-900">
                        {segment.note}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 font-serif text-base font-semibold leading-relaxed text-slate-800">
                    {segment.latino}
                  </p>

                  <label
                    htmlFor={`version-segment-${segment.id}`}
                    className="mt-4 block text-xs font-semibold uppercase tracking-widest text-slate-400"
                  >
                    Traduzione
                  </label>
                  <textarea
                    id={`version-segment-${segment.id}`}
                    rows={3}
                    value={draft.text}
                    onChange={(event) =>
                      handleSegmentChange(segment.id, event.target.value)
                    }
                    disabled={isSubmitted}
                    readOnly={isLocked && !isSubmitted}
                    placeholder="Scrivi qui la traduzione di questo segmento…"
                    className={[
                      'mt-2 w-full resize-y rounded-lg border px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400',
                      isLocked
                        ? 'cursor-default border-emerald-200 bg-emerald-50/70'
                        : 'border-slate-200 bg-white',
                      isSubmitted ? 'disabled:cursor-default disabled:bg-slate-50' : '',
                    ].join(' ')}
                  />

                  {!isSubmitted ? (
                    <div className="mt-3">
                      {draft.isConfirmed ? (
                        <button
                          type="button"
                          onClick={() => handleEditSegment(segment.id)}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Modifica
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmSegment(segment.id)}
                          disabled={!draft.text.trim()}
                          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          Conferma
                        </button>
                      )}
                    </div>
                  ) : null}
                </GlassCard>
              </motion.div>
            )
          })}
        </section>

        <GlassCard className="!p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Bella copia finale
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Si compone automaticamente dai segmenti confermati. Clicca su un
              pezzo di testo per tornare a modificarlo.
            </p>
          </div>

          <div
            id="version-bella-copia"
            className="mt-4 min-h-40 rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-base leading-relaxed text-slate-800"
            aria-live="polite"
          >
            {confirmedSegments.length === 0 ? (
              <p className="text-sm italic text-slate-400">
                Conferma i segmenti in alto: qui apparirà la traduzione finale.
              </p>
            ) : (
              <p className="font-serif text-lg leading-relaxed">
                {confirmedSegments.map((segment, index) => (
                  <span key={segment.id}>
                    {index > 0 ? ' ' : null}
                    <span
                      role="button"
                      tabIndex={isSubmitted ? -1 : 0}
                      onClick={() => handleFinalSpanClick(segment.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleFinalSpanClick(segment.id)
                        }
                      }}
                      className={[
                        'rounded-sm px-0.5 transition-colors',
                        isSubmitted
                          ? 'cursor-default'
                          : 'cursor-pointer hover:bg-amber-100/80 focus:bg-amber-100/80 focus:outline-none',
                      ].join(' ')}
                      title={
                        isSubmitted
                          ? undefined
                          : 'Clicca per modificare questo segmento'
                      }
                    >
                      {segment.text}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </div>

          {!isSubmitted ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isSubmitting ? 'Consegna in corso…' : 'Consegna Versione'}
              </button>
              <button
                type="button"
                onClick={onBackToLevels}
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Torna ai Livelli
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm font-medium text-sky-900">
                Versione consegnata con successo. In attesa della valutazione del
                tutor.
              </div>
              <button
                type="button"
                onClick={onBackToLevels}
                className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
              >
                Torna ai Livelli
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  )
}
