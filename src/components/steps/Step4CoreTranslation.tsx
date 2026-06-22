import { useState } from 'react'
import { motion } from 'framer-motion'
import { SelfAssessmentTranslation } from '../SelfAssessmentTranslation'
import type { TranslationValue } from '../../types'

interface Step4CoreTranslationProps {
  verb: string
  subjectWords: string[]
  isSubjectImplicit: boolean
  referenceTranslation: TranslationValue
  onComplete: () => void
  onTranslationConfirmed?: (translation: string) => void
  onMistake?: () => void
  initialTranslation?: string
  initialConfirmed?: boolean
}

function buildLatinCore(
  verb: string,
  subjectWords: string[],
  isSubjectImplicit: boolean,
): string {
  if (isSubjectImplicit) return verb
  return [...subjectWords, verb].join(' ')
}

export function Step4CoreTranslation({
  verb,
  subjectWords,
  isSubjectImplicit,
  referenceTranslation,
  onComplete,
  onTranslationConfirmed,
  onMistake,
  initialTranslation = '',
  initialConfirmed = false,
}: Step4CoreTranslationProps) {
  const [isSuccess, setIsSuccess] = useState(initialConfirmed)
  const latinCore = buildLatinCore(verb, subjectWords, isSubjectImplicit)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={[
        'flex flex-col gap-6 rounded-xl border-2 p-1 transition-colors',
        isSuccess ? 'border-emerald-400' : 'border-transparent',
      ].join(' ')}
    >
      <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/80 px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Nucleo latino
        </p>
        <p className="mt-3 font-serif text-3xl tracking-wide text-slate-800">
          {latinCore}
        </p>
        {isSubjectImplicit && (
          <p className="mt-2 text-sm italic text-slate-500">(sogg. sottinteso)</p>
        )}
      </div>

      <SelfAssessmentTranslation
        inputId="core-translation"
        referenceTranslation={referenceTranslation}
        placeholder="Traduci il nucleo in italiano..."
        onConfirmed={onComplete}
        onTranslationConfirmed={onTranslationConfirmed}
        onRetry={onMistake}
        onSuccessChange={setIsSuccess}
        initialTranslation={initialTranslation}
        initialConfirmed={initialConfirmed}
      />
    </motion.div>
  )
}
