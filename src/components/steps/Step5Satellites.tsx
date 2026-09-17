import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SelfAssessmentTranslation } from '../SelfAssessmentTranslation'
import type { Complemento } from '../../types'
import { getInteractiveComplementi } from '../../utils/complements'
import {
  CASE_CHIP_LABELS,
  CASE_CHIP_VARIANTS,
  CASE_ERROR_TOAST,
  isComplementCaseCorrect,
  isValidCase,
  normalizeCase,
  VALID_CASES,
  type LatinCase,
} from '../../utils/caseAnalysis'

interface Step5SatellitesProps {
  complementi: Complemento[]
  onComplete: () => void
  onTranslationConfirmed?: (translation: string) => void
  onError: (message: string) => void
  onMistakeChip?: () => void
  onMistakeRetry?: () => void
  initialCurrentIndex?: number
  initialCaseLocked?: boolean
  initialSelectedCase?: LatinCase | null
  onStateSnapshot?: (state: {
    currentIndex: number
    caseLocked: boolean
    selectedCase: LatinCase | null
  }) => void
  readOnly?: boolean
  reviewTranslations?: string[]
}

interface CaseChipProps {
  label: string
  caseValue: LatinCase
  isLocked: boolean
  isSelected: boolean
  isShaking: boolean
  onSelect: (caseValue: LatinCase) => void
}

function CaseChip({
  label,
  caseValue,
  isLocked,
  isSelected,
  isShaking,
  onSelect,
}: CaseChipProps) {
  const variant = CASE_CHIP_VARIANTS[caseValue] ?? 'default'

  return (
    <motion.button
      type="button"
      layout
      disabled={isLocked}
      whileTap={isLocked ? undefined : { scale: 0.97 }}
      onClick={() => onSelect(caseValue)}
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
        'relative z-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        isSelected
          ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200'
          : variant === 'subordinate'
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700 can-hover:hover:border-indigo-300 can-hover:hover:bg-indigo-100'
            : variant === 'conjunction'
              ? 'border-teal-200 bg-teal-50 text-teal-800 can-hover:hover:border-teal-300 can-hover:hover:bg-teal-100'
              : 'border-slate-200 bg-white text-slate-700 can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50',
        isLocked && !isSelected ? 'pointer-events-none opacity-40' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </motion.button>
  )
}

export function Step5Satellites({
  complementi,
  onComplete,
  onTranslationConfirmed,
  onError,
  onMistakeChip,
  onMistakeRetry,
  initialCurrentIndex = 0,
  initialCaseLocked = false,
  initialSelectedCase = null,
  onStateSnapshot,
  readOnly = false,
  reviewTranslations,
}: Step5SatellitesProps) {
  const interactiveComplementi = useMemo(
    () => getInteractiveComplementi(complementi),
    [complementi],
  )

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(
      initialCurrentIndex,
      Math.max(0, getInteractiveComplementi(complementi).length - 1),
    ),
  )
  const [caseLocked, setCaseLocked] = useState(initialCaseLocked)
  const [selectedCase, setSelectedCase] = useState<LatinCase | null>(
    initialSelectedCase,
  )
  const [shakingCase, setShakingCase] = useState<LatinCase | null>(null)

  useEffect(() => {
    onStateSnapshot?.({ currentIndex, caseLocked, selectedCase })
  }, [currentIndex, caseLocked, selectedCase, onStateSnapshot])

  useEffect(() => {
    if (readOnly || interactiveComplementi.length === 0) {
      if (interactiveComplementi.length === 0) onComplete()
      return
    }
  }, [interactiveComplementi.length, onComplete, readOnly])

  if (interactiveComplementi.length === 0) {
    return null
  }

  const current = interactiveComplementi[currentIndex]
  const blockLabel = current.parole.join(' ')
  const total = interactiveComplementi.length

  const reviewCaseForComplement = (complemento: Complemento): LatinCase | null => {
    const normalized = normalizeCase(complemento.caso)
    return isValidCase(normalized) ? normalized : null
  }

  const effectiveSelectedCase = readOnly
    ? reviewCaseForComplement(current) ?? selectedCase
    : selectedCase

  const effectiveCaseLocked = readOnly || caseLocked

  const handleCaseSelect = (caseValue: LatinCase) => {
    if (readOnly || caseLocked) return

    if (isComplementCaseCorrect(caseValue, current.parole, current.caso)) {
      setSelectedCase(caseValue)
      setCaseLocked(true)
      setShakingCase(null)
      return
    }

    setShakingCase(caseValue)
    onMistakeChip?.()
    onError(CASE_ERROR_TOAST)
    window.setTimeout(() => setShakingCase(null), 500)
  }

  const handleTranslationConfirmed = () => {
    if (currentIndex + 1 >= interactiveComplementi.length) {
      onComplete()
      return
    }

    setCurrentIndex((index) => index + 1)
    setCaseLocked(false)
    setSelectedCase(null)
  }

  const handleReviewComplementChange = (nextIndex: number) => {
    if (!readOnly) return
    if (nextIndex < 0 || nextIndex >= interactiveComplementi.length) return
    setCurrentIndex(nextIndex)
  }

  return (
    <motion.div
      key={currentIndex}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">
          Complemento {currentIndex + 1} di {total}
        </p>
        <div className="flex gap-1.5">
          {interactiveComplementi.map((_, index) => (
            <div
              key={index}
              className={[
                'h-2 w-2 rounded-full transition-colors',
                index < currentIndex
                  ? 'bg-emerald-500'
                  : index === currentIndex
                    ? 'bg-slate-700'
                    : 'bg-slate-200',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/80 px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Blocco latino
        </p>
        <p className="mt-3 font-serif text-3xl tracking-wide text-slate-800">
          {blockLabel}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          Che caso è?
        </h3>
        <div className="relative z-10 flex flex-wrap gap-2.5">
          {VALID_CASES.map((caseValue) => (
            <CaseChip
              key={caseValue}
              label={CASE_CHIP_LABELS[caseValue]}
              caseValue={caseValue}
              isLocked={effectiveCaseLocked}
              isSelected={effectiveSelectedCase === caseValue}
              isShaking={shakingCase === caseValue}
              onSelect={handleCaseSelect}
            />
          ))}
        </div>
      </section>

      {readOnly && total > 1 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={() => handleReviewComplementChange(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40 can-hover:hover:bg-slate-100"
          >
            Complemento precedente
          </button>
          <button
            type="button"
            onClick={() => handleReviewComplementChange(currentIndex + 1)}
            disabled={currentIndex >= total - 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40 can-hover:hover:bg-slate-100"
          >
            Complemento successivo
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {effectiveCaseLocked && (
          <motion.section
            key="translation-phase"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 text-sm font-semibold text-slate-700">
              Traduzione del blocco
            </h3>
            <SelfAssessmentTranslation
              key={`translation-${currentIndex}`}
              inputId={`satellite-translation-${currentIndex}`}
              referenceTranslation={current.traduzione}
              placeholder="Traduci questo complemento in italiano..."
              onConfirmed={handleTranslationConfirmed}
              onTranslationConfirmed={onTranslationConfirmed}
              onRetry={onMistakeRetry}
              readOnly={readOnly}
              initialConfirmed={readOnly}
              initialTranslation={reviewTranslations?.[currentIndex] ?? ''}
              latinWords={current.parole}
              selectedGrammaticalCase={effectiveSelectedCase}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
