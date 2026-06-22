import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import type { Step2AnalisiVerbo } from '../../types'
import {
  getRequiredVerbCategories,
  isInfinitoMode,
  isVerbAnswerCorrect,
  VERB_CATEGORY_LABELS,
  VERB_CATEGORY_OPTIONS,
  VERB_CATEGORY_ORDER,
  type VerbCategory,
} from '../../utils/verbAnalysis'

interface Step2VerbAnalysisProps {
  verb: string
  analisiVerbo: Step2AnalisiVerbo
  onComplete: () => void
  onError: (message: string) => void
  onMistake?: () => void
}

const ERROR_TOAST =
  'Sbagliato. Controlla bene la desinenza del verbo!'

function createInitialCompletedState(): Record<VerbCategory, boolean> {
  return {
    modo: false,
    persona: false,
    numero: false,
    tempo: false,
    forma: false,
  }
}

interface ChipButtonProps {
  label: string
  category: VerbCategory
  isLocked: boolean
  isSelected: boolean
  isShaking: boolean
  isError: boolean
  onSelect: (category: VerbCategory, label: string) => void
}

function ChipButton({
  label,
  category,
  isLocked,
  isSelected,
  isShaking,
  isError,
  onSelect,
}: ChipButtonProps) {
  return (
    <motion.button
      type="button"
      disabled={isLocked}
      whileTap={isLocked ? undefined : { scale: 0.97 }}
      onTap={() => {
        if (!isLocked) {
          onSelect(category, label)
        }
      }}
      animate={
        isShaking
          ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
          : { x: 0 }
      }
      transition={
        isShaking
          ? { duration: 0.45, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 400, damping: 28 }
      }
      className={[
        'relative z-50 pointer-events-auto touch-manipulation rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        isSelected
          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200'
          : isError
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-slate-200 bg-white text-slate-700 can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50',
        isLocked && !isSelected ? 'pointer-events-none opacity-40' : '',
        isLocked && isSelected ? 'cursor-default' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </motion.button>
  )
}

export function Step2VerbAnalysis({
  verb,
  analisiVerbo,
  onComplete,
  onError,
  onMistake,
}: Step2VerbAnalysisProps) {
  const [completed, setCompleted] = useState(createInitialCompletedState)
  const [selectedAnswers, setSelectedAnswers] = useState<
    Partial<Record<VerbCategory, string>>
  >({})
  const [shakingChip, setShakingChip] = useState<string | null>(null)
  const [errorChip, setErrorChip] = useState<string | null>(null)

  const isInfinitoSelected =
    completed.modo &&
    selectedAnswers.modo !== undefined &&
    isInfinitoMode(selectedAnswers.modo)

  const requiredCategories = getRequiredVerbCategories(completed, selectedAnswers)
  const allComplete = requiredCategories.every((category) => completed[category])

  const handleSelect = useCallback(
    (category: VerbCategory, label: string) => {
      if (completed[category]) return
      if (category === 'persona' && isInfinitoSelected) return

      const expected = analisiVerbo[category]
      const chipKey = `${category}-${label}`

      if (isVerbAnswerCorrect(category, label, expected)) {
        let nextCompleted = { ...completed, [category]: true }

        if (category === 'modo' && isInfinitoMode(label)) {
          nextCompleted = { ...nextCompleted, persona: true }
        }

        setCompleted(nextCompleted)
        setSelectedAnswers((prev) => ({ ...prev, [category]: label }))
        setErrorChip(null)

        const nextRequired = getRequiredVerbCategories(nextCompleted, {
          ...selectedAnswers,
          [category]: label,
        })

        if (nextRequired.every((item) => nextCompleted[item])) {
          onComplete()
        }
        return
      }

      setShakingChip(chipKey)
      setErrorChip(chipKey)
      onMistake?.()
      onError(ERROR_TOAST)

      window.setTimeout(() => {
        setShakingChip(null)
        setErrorChip(null)
      }, 500)
    },
    [
      analisiVerbo,
      completed,
      isInfinitoSelected,
      onComplete,
      onError,
      onMistake,
      selectedAnswers,
    ],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/80 px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Verbo individuato
        </p>
        <span className="mt-3 rounded-xl border border-slate-200 bg-white px-8 py-3 font-serif text-3xl tracking-wide text-slate-800 shadow-sm">
          {verb}
        </span>
        <p className="mt-3 text-sm text-slate-500">
          Completa l&apos;analisi grammaticale selezionando le opzioni corrette.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {VERB_CATEGORY_ORDER.map((category) => {
          const isSkippedForInfinito = category === 'persona' && isInfinitoSelected
          const isLocked = completed[category] || isSkippedForInfinito
          const selected = selectedAnswers[category]

          return (
            <section
              key={category}
              className={[
                'relative isolate rounded-xl border bg-white p-5',
                isSkippedForInfinito
                  ? 'border-slate-100 bg-slate-50/80'
                  : 'border-slate-200',
              ].join(' ')}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {VERB_CATEGORY_LABELS[category]}
                </h3>
                {isSkippedForInfinito && (
                  <span className="text-xs font-medium text-slate-400">
                    Non applicabile per l&apos;infinito
                  </span>
                )}
              </div>

              <div className="relative z-20 pointer-events-auto flex flex-wrap gap-2.5">
                {VERB_CATEGORY_OPTIONS[category].map((option) => {
                  const chipKey = `${category}-${option}`
                  const isSelected = selected === option

                  return (
                    <ChipButton
                      key={chipKey}
                      label={option}
                      category={category}
                      isLocked={isLocked}
                      isSelected={isSelected}
                      isShaking={shakingChip === chipKey}
                      isError={errorChip === chipKey}
                      onSelect={handleSelect}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-500">
          {allComplete
            ? 'Analisi completata — puoi proseguire.'
            : `${requiredCategories.filter((c) => completed[c]).length} di ${requiredCategories.length} categorie completate`}
        </p>
        <div className="flex gap-1.5">
          {requiredCategories.map((category) => (
            <div
              key={category}
              className={[
                'h-2 w-2 rounded-full transition-colors',
                completed[category] ? 'bg-emerald-500' : 'bg-slate-200',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
