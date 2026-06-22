import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import type { LatinAnalysis } from '../types'
import type { VerbCategory } from '../utils/verbAnalysis'
import { VERB_CATEGORY_LABELS } from '../utils/verbAnalysis'
import { buildTilesFromWords } from '../utils/tiles'

type AppStep = 1 | 2 | 3 | 4 | 5

interface FinalReviewPanelProps {
  analysis: LatinAnalysis
  step1PlacedTileId: string | null
  step2SelectedAnswers: Partial<Record<VerbCategory, string>>
  step3PlacedTileIds: string[]
  step3ImplicitSuccess: boolean
  studentCoreTranslation: string
  studentComplementTranslations: string[]
  studentFullTranslation: string
  score: number
  mechanicalScore: number
  isSubmitting: boolean
  isSubmitted: boolean
  earnedSesterzi: number | null
  onEditStep: (step: AppStep) => void
  onSubmit: () => void
  onBackToLevels: () => void
}

function wordFromTileId(tileId: string): string {
  const parts = tileId.split('-')
  return parts.length >= 3 ? parts.slice(2).join('-') : tileId
}

function buildRemainingWords(analysis: LatinAnalysis): string[] {
  const verb = analysis.step1_verbo.parola_corretta
  return analysis.parole_array.filter((word) => word !== verb)
}

export function FinalReviewPanel({
  analysis,
  step1PlacedTileId,
  step2SelectedAnswers,
  step3PlacedTileIds,
  step3ImplicitSuccess,
  studentCoreTranslation,
  studentComplementTranslations,
  studentFullTranslation,
  score,
  mechanicalScore,
  isSubmitting,
  isSubmitted,
  earnedSesterzi,
  onEditStep,
  onSubmit,
  onBackToLevels,
}: FinalReviewPanelProps) {
  const placedVerb = step1PlacedTileId
    ? wordFromTileId(step1PlacedTileId)
    : '—'

  const subjectTiles = buildTilesFromWords(
    buildRemainingWords(analysis),
    'subject',
  )
  const subjectTileById = Object.fromEntries(
    subjectTiles.map((tile) => [tile.id, tile]),
  )
  const subjectWords = step3ImplicitSuccess
    ? ['Soggetto sottinteso']
    : step3PlacedTileIds
        .map((id) => subjectTileById[id]?.word)
        .filter(Boolean)

  const step2Entries = (
    Object.entries(step2SelectedAnswers) as [VerbCategory, string][]
  ).filter(([, value]) => Boolean(value))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="mt-8 space-y-6 rounded-xl border border-sky-200 bg-sky-50/60 px-6 py-8"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
          Revisione finale
        </p>
        <h2 className="mt-2 font-serif text-xl font-semibold text-slate-800">
          Controlla il tuo lavoro prima dell&apos;invio
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Rileggi ogni passaggio. Se noti un&apos;incongruenza, modifica lo step
          corrispondente, poi invia al Tutor.
        </p>
      </div>

      <GlassCard className="space-y-5 !p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Frase latina
          </p>
          <p className="mt-1 font-serif text-lg italic text-slate-800">
            « {analysis.frase_originale} »
          </p>
        </div>

        <ReviewSection
          title="Step 1 — Verbo"
          onEdit={() => onEditStep(1)}
          disabled={isSubmitted}
        >
          <p className="text-sm text-slate-800">{placedVerb}</p>
        </ReviewSection>

        <ReviewSection
          title="Step 2 — Analisi del verbo"
          onEdit={() => onEditStep(2)}
          disabled={isSubmitted}
        >
          {step2Entries.length > 0 ? (
            <dl className="grid gap-2 text-sm">
              {step2Entries.map(([category, value]) => (
                <div key={category} className="flex justify-between gap-4">
                  <dt className="text-slate-500">
                    {VERB_CATEGORY_LABELS[category]}
                  </dt>
                  <dd className="font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Nessuna selezione registrata.</p>
          )}
        </ReviewSection>

        <ReviewSection
          title="Step 3 — Soggetto"
          onEdit={() => onEditStep(3)}
          disabled={isSubmitted}
        >
          <p className="text-sm text-slate-800">
            {subjectWords.length > 0 ? subjectWords.join(', ') : '—'}
          </p>
        </ReviewSection>

        <ReviewSection
          title="Step 4 — Traduzione del nucleo"
          onEdit={() => onEditStep(4)}
          disabled={isSubmitted}
        >
          <p className="text-sm text-slate-800">
            {studentCoreTranslation.trim() || '—'}
          </p>
        </ReviewSection>

        <ReviewSection
          title="Step 5 — Complementi"
          onEdit={() => onEditStep(5)}
          disabled={isSubmitted}
        >
          {studentComplementTranslations.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-800">
              {studentComplementTranslations.map((text, index) => (
                <li key={`${text}-${index}`}>{text}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nessun complemento tradotto.</p>
          )}
        </ReviewSection>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
            La tua traduzione completa
          </p>
          <p className="mt-2 text-lg font-medium text-slate-900">
            {studentFullTranslation.trim() || '—'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <span>XP: {score}</span>
          <span>Analisi meccanica: {mechanicalScore}/60</span>
        </div>
      </GlassCard>

      {!isSubmitted ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !studentFullTranslation.trim()}
            className="min-h-11 cursor-pointer rounded-lg border border-sky-600 bg-sky-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all can-hover:hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isSubmitting ? 'Invio in corso…' : 'Invia al Tutor'}
          </button>
        </div>
      ) : (
        <GlassCard className="border border-emerald-200 bg-emerald-50/80 !p-5 text-center">
          <p className="text-sm font-medium text-emerald-900">
            Compito inviato! Hai protetto {mechanicalScore} punti su 60. Il Tutor
            valuterà la tua traduzione.
          </p>
          {earnedSesterzi !== null && earnedSesterzi > 0 ? (
            <p className="mt-3 text-sm font-semibold text-amber-800">
              +{earnedSesterzi.toLocaleString('it-IT')} Sesterzi aggiunti al tuo
              tesoro!
            </p>
          ) : null}
        </GlassCard>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onBackToLevels}
          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors can-hover:hover:bg-slate-50"
        >
          Torna ai Livelli
        </button>
      </div>
    </motion.div>
  )
}

function ReviewSection({
  title,
  children,
  onEdit,
  disabled,
}: {
  title: string
  children: ReactNode
  onEdit: () => void
  disabled: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {title}
        </p>
        {!disabled ? (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs font-semibold text-sky-700 can-hover:hover:text-sky-900"
          >
            Modifica
          </button>
        ) : null}
      </div>
      {children}
    </div>
  )
}
