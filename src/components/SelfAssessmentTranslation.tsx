import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TranslationValue } from '../types'
import {
  getPrimaryTranslation,
  matchesTranslation,
} from '../utils/textNormalization'

interface SelfAssessmentTranslationProps {
  inputId: string
  referenceTranslation: TranslationValue
  placeholder?: string
  onConfirmed: () => void
  onTranslationConfirmed?: (translation: string) => void
  onRetry?: () => void
  onSuccessChange?: (success: boolean) => void
  initialTranslation?: string
  initialConfirmed?: boolean
}

export function SelfAssessmentTranslation({
  inputId,
  referenceTranslation,
  placeholder = 'Traduci in italiano...',
  onConfirmed,
  onTranslationConfirmed,
  onRetry,
  onSuccessChange,
  initialTranslation = '',
  initialConfirmed = false,
}: SelfAssessmentTranslationProps) {
  const [translation, setTranslation] = useState(initialTranslation)
  const [isVerified, setIsVerified] = useState(false)
  const [isAutoSuccess, setIsAutoSuccess] = useState(initialConfirmed)
  const [isSuccess, setIsSuccess] = useState(initialConfirmed)

  const primaryReference = getPrimaryTranslation(referenceTranslation)
  const inputLocked = isVerified || isSuccess

  useEffect(() => {
    onSuccessChange?.(isSuccess)
  }, [isSuccess, onSuccessChange])

  const confirmTranslation = (text: string) => {
    onTranslationConfirmed?.(text.trim())
  }

  const handleVerify = () => {
    if (!translation.trim() || isSuccess) return

    if (matchesTranslation(translation, referenceTranslation)) {
      confirmTranslation(translation)
      setIsAutoSuccess(true)
      setIsSuccess(true)
      window.setTimeout(() => onConfirmed(), 1000)
      return
    }

    setIsVerified(true)
  }

  const handleRetry = () => {
    onRetry?.()
    setIsVerified(false)
  }

  const handleConfirm = () => {
    confirmTranslation(translation)
    setIsSuccess(true)
    onConfirmed()
  }

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={inputId} className="sr-only">
        Traduzione del blocco
      </label>
      <input
        id={inputId}
        type="text"
        value={translation}
        onChange={(event) => setTranslation(event.target.value)}
        placeholder={placeholder}
        disabled={inputLocked}
        readOnly={inputLocked}
        className={[
          'w-full rounded-lg border bg-white px-4 py-3 text-base text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-default disabled:text-slate-700',
          isAutoSuccess
            ? 'border-emerald-400 bg-emerald-50 disabled:bg-emerald-50'
            : 'border-slate-200 disabled:bg-slate-50',
        ].join(' ')}
      />

      {!isVerified && !isSuccess && (
        <button
          type="button"
          onClick={handleVerify}
          disabled={!translation.trim()}
          className="cursor-pointer rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Verifica Traduzione
        </button>
      )}

      <AnimatePresence>
        {isAutoSuccess && (
          <motion.section
            key="auto-success"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
          >
            <motion.p
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm font-medium text-emerald-700"
            >
              Traduzione corretta!
            </motion.p>
          </motion.section>
        )}

        {isVerified && !isAutoSuccess && (
          <motion.section
            key="feedback"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Traduzione di Riferimento
              </p>
              <p className="mt-2 text-lg font-medium text-slate-800">
                {primaryReference}
              </p>
            </div>

            {!isSuccess && (
              <>
                <p className="text-sm font-medium text-slate-700">
                  La tua traduzione ha lo stesso significato di quella di
                  riferimento?
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors can-hover:hover:border-slate-400 can-hover:hover:bg-slate-50"
                  >
                    No, riprovo
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="cursor-pointer rounded-lg border border-emerald-500 bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-emerald-600"
                  >
                    Sì, è corretta
                  </button>
                </div>
              </>
            )}

            {isSuccess && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium text-emerald-700"
              >
                Traduzione confermata correttamente.
              </motion.p>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
