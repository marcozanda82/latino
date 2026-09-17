import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Mic, MicOff } from 'lucide-react'
import type { TranslationValue } from '../types'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { getCaseTranslationCoherenceIssue } from '../utils/caseTranslationCoherence'
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
  readOnly?: boolean
  latinWords?: string[]
  selectedGrammaticalCase?: string | null
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
  readOnly = false,
  latinWords,
  selectedGrammaticalCase = null,
}: SelfAssessmentTranslationProps) {
  const [translation, setTranslation] = useState(initialTranslation)
  const [isVerified, setIsVerified] = useState(false)
  const [isAutoSuccess, setIsAutoSuccess] = useState(initialConfirmed)
  const [isSuccess, setIsSuccess] = useState(initialConfirmed || readOnly)
  const speechBaseRef = useRef('')

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  } = useSpeechToText()

  const primaryReference = getPrimaryTranslation(referenceTranslation)
  const inputLocked = readOnly || isVerified || isSuccess

  const coherenceIssue = useMemo(() => {
    if (!latinWords?.length || !selectedGrammaticalCase) return null
    return getCaseTranslationCoherenceIssue(
      latinWords,
      selectedGrammaticalCase,
      translation,
    )
  }, [latinWords, selectedGrammaticalCase, translation])

  useEffect(() => {
    onSuccessChange?.(isSuccess)
  }, [isSuccess, onSuccessChange])

  useEffect(() => {
    if (!transcript.trim()) return

    const base = speechBaseRef.current.trim()
    const spoken = transcript.trim()
    const nextValue = base ? `${base} ${spoken}` : spoken
    setTranslation(nextValue)
  }, [transcript])

  useEffect(() => {
    if (inputLocked && isListening) {
      stopListening()
    }
  }, [inputLocked, isListening, stopListening])

  useEffect(() => {
    if (!isListening) return
    return () => {
      stopListening()
    }
  }, [isListening, stopListening])

  const handleMicToggle = () => {
    if (inputLocked) return

    if (isListening) {
      stopListening()
      return
    }

    speechBaseRef.current = translation
    startListening()
  }

  const confirmTranslation = (text: string) => {
    onTranslationConfirmed?.(text.trim())
  }

  const handleVerify = () => {
    if (!translation.trim() || isSuccess || coherenceIssue) return

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
    if (coherenceIssue) return

    confirmTranslation(translation)
    setIsSuccess(true)
    onConfirmed()
  }

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={inputId} className="sr-only">
        Traduzione del blocco
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={translation}
          onChange={(event) => setTranslation(event.target.value)}
          placeholder={placeholder}
          disabled={inputLocked}
          readOnly={inputLocked}
          className={[
            'w-full rounded-lg border bg-white py-3 text-base text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-default disabled:text-slate-700',
            isSupported && !inputLocked ? 'pl-4 pr-12' : 'px-4',
            isAutoSuccess
              ? 'border-emerald-400 bg-emerald-50 disabled:bg-emerald-50'
              : coherenceIssue
                ? 'border-amber-300 bg-amber-50/40 focus:border-amber-400'
                : 'border-slate-200 disabled:bg-slate-50',
          ].join(' ')}
          aria-invalid={coherenceIssue ? true : undefined}
          aria-describedby={coherenceIssue ? `${inputId}-coherence-hint` : undefined}
        />

        {isSupported && !inputLocked && (
          <motion.button
            type="button"
            onClick={handleMicToggle}
            aria-label={isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'}
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
              'absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border transition-colors',
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

      <AnimatePresence>
        {coherenceIssue && !inputLocked && (
          <motion.div
            key="coherence-hint"
            id={`${inputId}-coherence-hint`}
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <p className="font-medium">Incongruenza tra caso e traduzione</p>
              <p className="leading-relaxed text-amber-800/90">
                {coherenceIssue.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!readOnly && !isVerified && !isSuccess && (
        <button
          type="button"
          onClick={handleVerify}
          disabled={!translation.trim() || Boolean(coherenceIssue)}
          title={
            coherenceIssue
              ? 'Correggi l\'incongruenza tra caso grammaticale e traduzione'
              : undefined
          }
          className="cursor-pointer rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Verifica Traduzione
        </button>
      )}

      <AnimatePresence>
        {(isAutoSuccess || (readOnly && isSuccess)) && (
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

        {!readOnly && isVerified && !isAutoSuccess && (
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
                {coherenceIssue && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <p className="leading-relaxed">{coherenceIssue.message}</p>
                  </div>
                )}

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
                    disabled={Boolean(coherenceIssue)}
                    className="cursor-pointer rounded-lg border border-emerald-500 bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-400"
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
