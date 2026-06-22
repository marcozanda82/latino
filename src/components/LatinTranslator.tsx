import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Step1VerbSelection } from './steps/Step1VerbSelection'
import { Step2VerbAnalysis } from './steps/Step2VerbAnalysis'
import { Step3SubjectSelection } from './steps/Step3SubjectSelection'
import { Step4CoreTranslation } from './steps/Step4CoreTranslation'
import { Step5Satellites } from './steps/Step5Satellites'
import { ScoreBadge } from './ScoreBadge'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import { FinalReviewPanel } from './FinalReviewPanel'
import { buildFullTranslation } from '../utils/complements'
import { showError } from '../lib/toast'
import {
  applyPenalty,
  calculateFinalSesterziReward,
  XP_INITIAL,
  XP_PENALTY_CHIP,
  XP_PENALTY_DRAG,
  XP_PENALTY_RETRY,
} from '../utils/gamification'
import type { LatinAnalysis } from '../types'
import { saveLevelScore } from '../services/progressService'
import { submitTranslationForReview, canAutoApproveTranslation } from '../services/firebaseEvaluations'
import {
  getStudentBalanceDocPath,
  getStudentUserId,
} from '../services/studentService'
import { deleteExerciseDraft } from '../services/draftService'
import type { VerbCategory } from '../utils/verbAnalysis'
import type { LatinCase } from '../utils/caseAnalysis'

type AppStep = 1 | 2 | 3 | 4 | 5

const MECHANICAL_SCORE_INITIAL = 60
const MECHANICAL_PENALTY = 2

const STEP_LABELS: Record<AppStep, string> = {
  1: 'Identifica il verbo',
  2: 'Analisi del verbo',
  3: 'Trova il Soggetto',
  4: 'Traduci il Nucleo',
  5: 'Analisi Complementi',
}

interface LatinTranslatorProps {
  analysis: LatinAnalysis
  levelTitle: string
  levelId?: string
  customMaxReward?: number
  onBackToLevels: () => void
}

export function LatinTranslator({
  analysis,
  levelTitle,
  levelId,
  customMaxReward,
  onBackToLevels,
}: LatinTranslatorProps) {
  const [currentStep, setCurrentStep] = useState<AppStep>(1)
  const [step1Complete, setStep1Complete] = useState(false)
  const [step2Complete, setStep2Complete] = useState(false)
  const [step3Complete, setStep3Complete] = useState(false)
  const [step4Complete, setStep4Complete] = useState(false)
  const [step5Complete, setStep5Complete] = useState(false)
  const [score, setScore] = useState(XP_INITIAL)
  const [mechanicalScore, setMechanicalScore] = useState(MECHANICAL_SCORE_INITIAL)
  const [studentCoreTranslation, setStudentCoreTranslation] = useState('')
  const [studentComplementTranslations, setStudentComplementTranslations] =
    useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [earnedSesterzi, setEarnedSesterzi] = useState<number | null>(null)
  const [wasAutoApproved, setWasAutoApproved] = useState(false)
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
  const [inReview, setInReview] = useState(false)
  const [reviewEditStep, setReviewEditStep] = useState<AppStep | null>(null)

  useEffect(() => {
    if (levelId) {
      void deleteExerciseDraft(levelId)
    }
  }, [levelId])

  useEffect(() => {
    if (step5Complete && levelId) {
      saveLevelScore(levelId, score)
    }
  }, [step5Complete, levelId, score])

  const handleMistake = useCallback(() => {
    setMechanicalScore((prev) => Math.max(0, prev - MECHANICAL_PENALTY))
  }, [])

  const handleXpMistake = useCallback((penalty: number) => {
    setScore((current) => applyPenalty(current, penalty))
  }, [])

  const handleStepMistake = useCallback(
    (penalty: number) => {
      handleMistake()
      handleXpMistake(penalty)
    },
    [handleMistake, handleXpMistake],
  )

  const handleStepChange = (step: AppStep) => {
    setCurrentStep(step)
    if (step < 2) setStep2Complete(false)
    if (step < 3) setStep3Complete(false)
    if (step < 4) {
      setStep4Complete(false)
      setStudentCoreTranslation('')
      setStudentComplementTranslations([])
      setIsSubmitted(false)
    }
    if (step < 5) {
      setStep5Complete(false)
      setStudentComplementTranslations([])
      setIsSubmitted(false)
    }
  }

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

  const handleSubmitToTutor = async () => {
    if (!studentFullTranslation.trim() || isSubmitting || isSubmitted) return

    setIsSubmitting(true)

    const reward = calculateFinalSesterziReward(
      analysis,
      mechanicalScore,
      customMaxReward,
    )
    const autoApproved = canAutoApproveTranslation(
      studentFullTranslation,
      fullTranslation,
      mechanicalScore,
    )
    const userId = getStudentUserId()
    const docPath = getStudentBalanceDocPath()

    console.log('[LatinTranslator] Invio valutazione — payload reward:', {
      reward,
      mechanicalScore,
      userId,
      docPath,
      paroleCount: analysis.parole_array.length,
      coefficiente: analysis.coefficiente ?? 1.0,
      studentFullTranslation: studentFullTranslation.trim(),
      autoApproved,
    })

    if (reward === undefined || reward <= 0) {
      console.warn(
        '[LatinTranslator] reward è 0 o non valido — il saldo non verrà incrementato.',
        { reward, mechanicalScore },
      )
    }

    try {
      const result = await submitTranslationForReview({
        levelId,
        fraseOriginale: analysis.frase_originale,
        traduzioneAttesa: fullTranslation,
        traduzioneStudente: studentFullTranslation,
        mechanicalScore,
        reward,
        autoApproved,
      })
      if (levelId) {
        await deleteExerciseDraft(levelId)
      }
      setEarnedSesterzi(reward)
      setWasAutoApproved(result.autoApproved)
      setIsSubmitted(true)
      setInReview(true)
      setReviewEditStep(null)
    } catch (error) {
      console.error('[LatinTranslator] handleSubmitToTutor failed:', error)
      showError('Impossibile inviare la traduzione al tutor. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showAvanti =
    !inReview &&
    !step5Complete &&
    currentStep >= 1 &&
    currentStep <= 4

  const isAvantiEnabled =
    (currentStep === 1 && step1Complete) ||
    (currentStep === 2 && step2Complete) ||
    (currentStep === 3 && step3Complete) ||
    (currentStep === 4 && step4Complete)

  const handleAvanti = () => {
    if (currentStep === 1 && step1Complete) handleStepChange(2)
    else if (currentStep === 2 && step2Complete) handleStepChange(3)
    else if (currentStep === 3 && step3Complete) handleStepChange(4)
    else if (currentStep === 4 && step4Complete) handleStepChange(5)
  }

  const fullTranslation = buildFullTranslation(analysis)

  const showStepContent = !inReview || reviewEditStep !== null
  const showReviewPanel = inReview && reviewEditStep === null
  const showCompletionPrompt = step5Complete && !inReview && !isSubmitted

  const handleEnterReview = () => {
    setInReview(true)
    setReviewEditStep(null)
  }

  const handleEditFromReview = (step: AppStep) => {
    setReviewEditStep(step)
    setCurrentStep(step)
  }

  const handleReturnToReview = () => {
    setReviewEditStep(null)
  }

  const handleStep1Snapshot = useCallback(
    (state: { placedTileId: string | null; isComplete: boolean }) => {
      setStep1Snapshot(state)
    },
    [],
  )

  const handleStep2Snapshot = useCallback(
    (state: {
      completed: Record<VerbCategory, boolean>
      selectedAnswers: Partial<Record<VerbCategory, string>>
    }) => {
      setStep2Snapshot(state)
    },
    [],
  )

  const handleStep3Snapshot = useCallback(
    (state: { placedTileIds: string[]; implicitSuccess: boolean }) => {
      setStep3Snapshot(state)
    },
    [],
  )

  const handleStep5Snapshot = useCallback(
    (state: {
      currentIndex: number
      caseLocked: boolean
      selectedCase: LatinCase | null
    }) => {
      setStep5Snapshot(state)
    },
    [],
  )

  return (
    <AppLayout
      header={
        <div className="relative">
          <div className="absolute right-0 top-0 flex flex-col items-end gap-2">
            <ScoreBadge score={score} />
            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 shadow-sm">
              Analisi: {mechanicalScore}/60
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Analisi logica · Latino
          </p>
          <h1 className="mt-2 max-w-[70%] font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {levelTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {inReview
              ? 'Rileggi il tuo lavoro e invialo al Tutor quando sei pronta.'
              : step5Complete
                ? 'Tutti gli step sono completati. Passa alla revisione finale.'
                : 'Completa ogni passaggio prima di proseguire.'}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as AppStep[]).map((step) => (
                <div
                  key={step}
                  className={[
                    'h-1.5 w-8 rounded-full transition-colors sm:w-10',
                    step5Complete || step < currentStep
                      ? 'bg-emerald-400'
                      : step === currentStep
                        ? 'bg-slate-700'
                        : 'bg-slate-200',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-600">
              {inReview
                ? 'Revisione finale'
                : step5Complete
                  ? 'Completato'
                  : `Step ${currentStep} — ${STEP_LABELS[currentStep]}`}
            </span>
          </div>
        </div>
      }
    >
      <GlassCard>
          {inReview && reviewEditStep !== null ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="text-sm font-medium text-sky-900">
                Modifica Step {reviewEditStep} — {STEP_LABELS[reviewEditStep]}
              </p>
              <button
                type="button"
                onClick={handleReturnToReview}
                className="cursor-pointer rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-800 can-hover:hover:bg-sky-100"
              >
                Torna alla revisione
              </button>
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {showStepContent && currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <Step1VerbSelection
                  analysis={analysis}
                  onVerbComplete={() => setStep1Complete(true)}
                  onError={showError}
                  onMistake={() => handleStepMistake(XP_PENALTY_DRAG)}
                  showAvantiButton={false}
                  classroomMode
                  initialPlacedTileId={step1Snapshot.placedTileId}
                  onStateSnapshot={handleStep1Snapshot}
                />
              </motion.div>
            )}

            {showStepContent && currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Step2VerbAnalysis
                  verb={analysis.step1_verbo.parola_corretta}
                  analisiVerbo={analysis.step2_analisi_verbo}
                  onComplete={() => setStep2Complete(true)}
                  onError={showError}
                  onMistake={() => handleStepMistake(XP_PENALTY_CHIP)}
                  initialCompleted={step2Snapshot.completed}
                  initialSelectedAnswers={step2Snapshot.selectedAnswers}
                  onStateSnapshot={handleStep2Snapshot}
                />
              </motion.div>
            )}

            {showStepContent && currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Step3SubjectSelection
                  analysis={analysis}
                  onComplete={() => setStep3Complete(true)}
                  onError={showError}
                  onMistake={() => handleStepMistake(XP_PENALTY_DRAG)}
                  classroomMode
                  initialPlacedTileIds={step3Snapshot.placedTileIds}
                  initialImplicitSuccess={step3Snapshot.implicitSuccess}
                  onStateSnapshot={handleStep3Snapshot}
                />
              </motion.div>
            )}

            {showStepContent && currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Step4CoreTranslation
                  verb={analysis.step1_verbo.parola_corretta}
                  subjectWords={analysis.step3_soggetto.parole_corrette}
                  isSubjectImplicit={analysis.step3_soggetto.sottinteso}
                  referenceTranslation={analysis.step4_nucleo_tradotto}
                  onComplete={() => setStep4Complete(true)}
                  onTranslationConfirmed={setStudentCoreTranslation}
                  onMistake={() => handleStepMistake(XP_PENALTY_RETRY)}
                  initialTranslation={studentCoreTranslation}
                  initialConfirmed={step4Complete}
                />
              </motion.div>
            )}

            {showStepContent &&
              currentStep === 5 &&
              !(step5Complete && !inReview && !reviewEditStep) && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <Step5Satellites
                  complementi={analysis.step5_complementi}
                  onComplete={() => setStep5Complete(true)}
                  onTranslationConfirmed={handleComplementTranslationConfirmed}
                  onError={showError}
                  onMistakeChip={() => handleStepMistake(XP_PENALTY_CHIP)}
                  onMistakeRetry={() => handleStepMistake(XP_PENALTY_RETRY)}
                  initialCurrentIndex={step5Snapshot.currentIndex}
                  initialCaseLocked={step5Snapshot.caseLocked}
                  initialSelectedCase={step5Snapshot.selectedCase}
                  onStateSnapshot={handleStep5Snapshot}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCompletionPrompt && (
              <motion.div
                key="completion-prompt"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  Analisi completata
                </p>
                <p className="mt-3 text-3xl font-bold tabular-nums text-amber-900">
                  {score} XP
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Analisi meccanica: {mechanicalScore}/60
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  Rileggi tutto il tuo lavoro prima di inviarlo al Tutor.
                </p>
                <button
                  type="button"
                  onClick={handleEnterReview}
                  className="mt-6 min-h-11 cursor-pointer rounded-lg border border-sky-600 bg-sky-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all can-hover:hover:bg-sky-700"
                >
                  Controlla e Invia
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {showReviewPanel ? (
            <FinalReviewPanel
              analysis={analysis}
              step1PlacedTileId={step1Snapshot.placedTileId}
              step2SelectedAnswers={step2Snapshot.selectedAnswers}
              step3PlacedTileIds={step3Snapshot.placedTileIds}
              step3ImplicitSuccess={step3Snapshot.implicitSuccess}
              studentCoreTranslation={studentCoreTranslation}
              studentComplementTranslations={studentComplementTranslations}
              studentFullTranslation={studentFullTranslation}
              score={score}
              mechanicalScore={mechanicalScore}
              isSubmitting={isSubmitting}
              isSubmitted={isSubmitted}
              earnedSesterzi={earnedSesterzi}
              wasAutoApproved={wasAutoApproved}
              onEditStep={handleEditFromReview}
              onSubmit={handleSubmitToTutor}
              onBackToLevels={onBackToLevels}
            />
          ) : null}

          {showAvanti && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: isAvantiEnabled ? 1 : 0.4, y: 0 }}
              className="mt-6 flex justify-end border-t border-slate-100 pt-6"
            >
              <button
                type="button"
                onClick={handleAvanti}
                disabled={!isAvantiEnabled}
                className="cursor-pointer rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Avanti
              </button>
            </motion.div>
          )}
        </GlassCard>

        <footer className="mt-8 text-center">
          <p className="font-serif text-lg italic text-slate-500">
            « {analysis.frase_originale} »
          </p>
        </footer>
    </AppLayout>
  )
}
