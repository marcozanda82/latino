import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { Step1VerbSelection } from '../steps/Step1VerbSelection'
import { Step2VerbAnalysis } from '../steps/Step2VerbAnalysis'
import { Step3SubjectSelection } from '../steps/Step3SubjectSelection'
import { Step4CoreTranslation } from '../steps/Step4CoreTranslation'
import { Step5Satellites } from '../steps/Step5Satellites'
import { showError } from '../../lib/toast'
import { useSpeechToText } from '../../hooks/useSpeechToText'
import type { Proposizione } from '../../types/version'
import { proposizioneToLatinAnalysis } from '../../utils/proposizione'
import type { VerbCategory } from '../../utils/verbAnalysis'
import type { LatinCase } from '../../utils/caseAnalysis'

type MicroStep = 1 | 2 | 3 | 4 | 5

const STEP_LABELS: Record<MicroStep, string> = {
  1: 'Verbo',
  2: 'Analisi verbo',
  3: 'Soggetto',
  4: 'Nucleo',
  5: 'Complementi',
}

const MECHANICAL_SCORE_INITIAL = 60
const MECHANICAL_PENALTY = 2

export interface ProposizioneMicroResult {
  proposizioneId: string | number
  mechanicalScore: number
  /** Assemblaggio grezzo da nucleo + complementi. */
  studentFullTranslation: string
  /** Traduzione libera confermata dallo studente. */
  traduzioneLibera: string
  studentCoreTranslation: string
  studentComplementTranslations: string[]
  step1PlacedTileId: string | null
  step2SelectedAnswers: Partial<Record<VerbCategory, string>>
  step3PlacedTileIds: string[]
  step3ImplicitSuccess: boolean
}

interface ProposizioneMicroFlowProps {
  proposizione: Proposizione
  isActive: boolean
  isComplete: boolean
  completedResult?: ProposizioneMicroResult
  isReviewMode?: boolean
  onComplete: (result: ProposizioneMicroResult) => void
}

export function ProposizioneMicroFlow({
  proposizione,
  isActive,
  isComplete,
  completedResult,
  isReviewMode = false,
  onComplete,
}: ProposizioneMicroFlowProps) {
  const analysis = useMemo(
    () => proposizioneToLatinAnalysis(proposizione),
    [proposizione],
  )

  const [currentStep, setCurrentStep] = useState<MicroStep>(1)
  const [step1Complete, setStep1Complete] = useState(false)
  const [step2Complete, setStep2Complete] = useState(false)
  const [step3Complete, setStep3Complete] = useState(false)
  const [step4Complete, setStep4Complete] = useState(false)
  const [step5Complete, setStep5Complete] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [freeTranslation, setFreeTranslation] = useState('')
  const [mechanicalScore, setMechanicalScore] = useState(MECHANICAL_SCORE_INITIAL)
  const [studentCoreTranslation, setStudentCoreTranslation] = useState('')
  const [studentComplementTranslations, setStudentComplementTranslations] =
    useState<string[]>([])
  const [step1Snapshot, setStep1Snapshot] = useState({
    placedTileId: null as string | null,
    isComplete: false,
  })
  const [step2Snapshot, setStep2Snapshot] = useState<{
    completed: Record<VerbCategory, boolean>
    selectedAnswers: Partial<Record<VerbCategory, string>>
  }>({
    completed: {
      modo: false,
      persona: false,
      numero: false,
      tempo: false,
      forma: false,
    },
    selectedAnswers: {},
  })
  const [step3Snapshot, setStep3Snapshot] = useState({
    placedTileIds: [] as string[],
    implicitSuccess: false,
  })
  const [step5Snapshot, setStep5Snapshot] = useState({
    currentIndex: 0,
    caseLocked: false,
    selectedCase: null as LatinCase | null,
  })
  const speechBaseRef = useRef('')

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  } = useSpeechToText()

  useEffect(() => {
    if (!isReviewMode || !completedResult) return

    setCurrentStep(5)
    setStep1Complete(true)
    setStep2Complete(true)
    setStep3Complete(true)
    setStep4Complete(true)
    setStep5Complete(true)
    setAnalysisComplete(!isReviewMode)
    setFreeTranslation(completedResult.traduzioneLibera)
    setMechanicalScore(completedResult.mechanicalScore)
    setStudentCoreTranslation(completedResult.studentCoreTranslation)
    setStudentComplementTranslations(completedResult.studentComplementTranslations)
    setStep1Snapshot({
      placedTileId: completedResult.step1PlacedTileId,
      isComplete: true,
    })
    setStep2Snapshot({
      completed: Object.fromEntries(
        Object.entries(completedResult.step2SelectedAnswers).map(([key]) => [
          key,
          true,
        ]),
      ) as Record<VerbCategory, boolean>,
      selectedAnswers: completedResult.step2SelectedAnswers,
    })
    setStep3Snapshot({
      placedTileIds: completedResult.step3PlacedTileIds,
      implicitSuccess: completedResult.step3ImplicitSuccess,
    })
    setStep5Snapshot({
      currentIndex: Math.max(0, completedResult.studentComplementTranslations.length - 1),
      caseLocked: true,
      selectedCase: null,
    })
  }, [completedResult, isReviewMode])

  const handleMistake = useCallback(() => {
    setMechanicalScore((prev) => Math.max(0, prev - MECHANICAL_PENALTY))
  }, [])

  const handleComplementTranslationConfirmed = useCallback(
    (translation: string) => {
      setStudentComplementTranslations((current) => [...current, translation])
    },
    [],
  )

  const studentFullTranslation = useMemo(
    () =>
      [studentCoreTranslation, ...studentComplementTranslations]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    [studentCoreTranslation, studentComplementTranslations],
  )

  useEffect(() => {
    if (!transcript.trim()) return

    const base = speechBaseRef.current.trim()
    const spoken = transcript.trim()
    setFreeTranslation(base ? `${base} ${spoken}` : spoken)
  }, [transcript])

  const buildResult = useCallback(
    (traduzioneLibera: string): ProposizioneMicroResult => ({
      proposizioneId: proposizione.id,
      mechanicalScore,
      studentFullTranslation,
      traduzioneLibera: traduzioneLibera.trim(),
      studentCoreTranslation,
      studentComplementTranslations,
      step1PlacedTileId: step1Snapshot.placedTileId,
      step2SelectedAnswers: step2Snapshot.selectedAnswers,
      step3PlacedTileIds: step3Snapshot.placedTileIds,
      step3ImplicitSuccess: step3Snapshot.implicitSuccess,
    }),
    [
      mechanicalScore,
      proposizione.id,
      step1Snapshot.placedTileId,
      step2Snapshot.selectedAnswers,
      step3Snapshot.implicitSuccess,
      step3Snapshot.placedTileIds,
      studentComplementTranslations,
      studentCoreTranslation,
      studentFullTranslation,
    ],
  )

  const handleStep5Complete = useCallback(() => {
    setStep5Complete(true)
    setAnalysisComplete(true)
  }, [])

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
      return
    }

    speechBaseRef.current = freeTranslation
    startListening()
  }

  const handleConfirmFreeTranslation = () => {
    if (!freeTranslation.trim()) return
    stopListening()
    onComplete(buildResult(freeTranslation))
  }

  const handleAvanti = () => {
    if (currentStep === 1 && step1Complete) setCurrentStep(2)
    else if (currentStep === 2 && step2Complete) setCurrentStep(3)
    else if (currentStep === 3 && step3Complete) setCurrentStep(4)
    else if (currentStep === 4 && step4Complete) setCurrentStep(5)
  }

  const isAvantiEnabled =
    (currentStep === 1 && step1Complete) ||
    (currentStep === 2 && step2Complete) ||
    (currentStep === 3 && step3Complete) ||
    (currentStep === 4 && step4Complete)

  if (isComplete && completedResult && !isReviewMode) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Proposizione completata
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {completedResult.traduzioneLibera}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Punteggio meccanico: {completedResult.mechanicalScore}/60
        </p>
      </div>
    )
  }

  if (!isActive) {
    return (
      <p className="mt-4 text-sm italic text-slate-400">
        Completa prima l&apos;analisi delle proposizioni precedenti.
      </p>
    )
  }

  if (analysisComplete) {
    return (
      <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Pezzi tradotti (bozza)
          </p>
          <p className="mt-2 text-sm italic text-slate-600">
            {studentFullTranslation || '—'}
          </p>
        </div>

        <section>
          <h4 className="text-sm font-semibold text-slate-800">
            Traduzione finale proposizione
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Riscrivi la proposizione in un italiano corretto e scorrevole.
          </p>

          <label
            htmlFor={`proposizione-free-${proposizione.id}`}
            className="sr-only"
          >
            Traduzione finale proposizione
          </label>
          <div className="relative mt-3">
            <textarea
              id={`proposizione-free-${proposizione.id}`}
              rows={3}
              value={freeTranslation}
              onChange={(event) => setFreeTranslation(event.target.value)}
              placeholder="Scrivi la traduzione in italiano…"
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

          <button
            type="button"
            onClick={handleConfirmFreeTranslation}
            disabled={!freeTranslation.trim()}
            className="mt-4 cursor-pointer rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Conferma traduzione
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Analisi logica · 5 step
        </p>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-600">
          {mechanicalScore}/60
        </span>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {([1, 2, 3, 4, 5] as MicroStep[]).map((step) => (
          <div
            key={step}
            className={[
              'h-1 flex-1 rounded-full transition-colors',
              step5Complete || step < currentStep
                ? 'bg-emerald-400'
                : step === currentStep
                  ? 'bg-slate-700'
                  : 'bg-slate-200',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="mb-4 text-xs font-medium text-slate-600">
        Step {currentStep} — {STEP_LABELS[currentStep]}
      </p>

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="micro-step-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Step1VerbSelection
              analysis={analysis}
              onVerbComplete={() => setStep1Complete(true)}
              onError={showError}
              onMistake={handleMistake}
              showAvantiButton={false}
              classroomMode
              readOnly={isReviewMode}
              initialPlacedTileId={step1Snapshot.placedTileId}
              onStateSnapshot={setStep1Snapshot}
            />
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="micro-step-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Step2VerbAnalysis
              verb={analysis.step1_verbo.parola_corretta}
              analisiVerbo={analysis.step2_analisi_verbo}
              onComplete={() => setStep2Complete(true)}
              onError={showError}
              onMistake={handleMistake}
              readOnly={isReviewMode}
              initialCompleted={step2Snapshot.completed}
              initialSelectedAnswers={step2Snapshot.selectedAnswers}
              onStateSnapshot={setStep2Snapshot}
            />
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="micro-step-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Step3SubjectSelection
              analysis={analysis}
              onComplete={() => setStep3Complete(true)}
              onError={showError}
              onMistake={handleMistake}
              classroomMode
              readOnly={isReviewMode}
              initialPlacedTileIds={step3Snapshot.placedTileIds}
              initialImplicitSuccess={step3Snapshot.implicitSuccess}
              onStateSnapshot={setStep3Snapshot}
            />
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="micro-step-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Step4CoreTranslation
              verb={analysis.step1_verbo.parola_corretta}
              subjectWords={analysis.step3_soggetto.parole_corrette}
              isSubjectImplicit={analysis.step3_soggetto.sottinteso}
              referenceTranslation={analysis.step4_nucleo_tradotto}
              onComplete={() => setStep4Complete(true)}
              onTranslationConfirmed={setStudentCoreTranslation}
              onMistake={handleMistake}
              readOnly={isReviewMode}
              initialTranslation={studentCoreTranslation}
              initialConfirmed={step4Complete || isReviewMode}
            />
          </motion.div>
        )}

        {currentStep === 5 && (!step5Complete || isReviewMode) && (
          <motion.div
            key="micro-step-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Step5Satellites
              complementi={analysis.step5_complementi}
              onComplete={handleStep5Complete}
              onTranslationConfirmed={handleComplementTranslationConfirmed}
              onError={showError}
              onMistakeChip={handleMistake}
              onMistakeRetry={handleMistake}
              readOnly={isReviewMode}
              reviewTranslations={
                isReviewMode ? studentComplementTranslations : undefined
              }
              initialCurrentIndex={step5Snapshot.currentIndex}
              initialCaseLocked={step5Snapshot.caseLocked || isReviewMode}
              initialSelectedCase={step5Snapshot.selectedCase}
              onStateSnapshot={setStep5Snapshot}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isReviewMode && freeTranslation.trim() ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Traduzione libera proposizione
          </p>
          <p className="mt-2 text-sm text-slate-800">{freeTranslation}</p>
        </div>
      ) : null}

      {!isReviewMode && currentStep < 5 && (
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={handleAvanti}
            disabled={!isAvantiEnabled}
            className="cursor-pointer rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Avanti
          </button>
        </div>
      )}
    </div>
  )
}
