import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { Step1VerbSelection } from './steps/Step1VerbSelection'
import { Step2VerbAnalysis } from './steps/Step2VerbAnalysis'
import { Step3SubjectSelection } from './steps/Step3SubjectSelection'
import { Step4CoreTranslation } from './steps/Step4CoreTranslation'
import { Step5Satellites } from './steps/Step5Satellites'
import { ScoreBadge } from './ScoreBadge'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import { FinalReviewPanel } from './FinalReviewPanel'
import {
  PreviousContextPanel,
  type PreviousSegmentContext,
} from './PreviousContextPanel'
import { buildFullTranslation } from '../utils/complements'
import { showError } from '../lib/toast'
import {
  applyPenalty,
  calculateFinalSesterziReward,
  XP_INITIAL,
  XP_PENALTY_CHIP,
  XP_PENALTY_SELECTION,
  XP_PENALTY_RETRY,
} from '../utils/gamification'
import { calculateSegmentReward } from '../utils/scoring'
import type { LatinAnalysis } from '../types'
import type { ExerciseDraftData } from '../types/exerciseDraft'
import { clearLevelProgress, saveLevelScore } from '../services/progressService'
import { submitTranslationForReview, canAutoApproveTranslation } from '../services/firebaseEvaluations'
import {
  getStudentBalanceDocPath,
  getStudentUserId,
} from '../services/studentService'
import { deleteExerciseDraft } from '../services/draftService'
import type { VerbCategory } from '../utils/verbAnalysis'
import type { LatinCase } from '../utils/caseAnalysis'

type AppStep = 1 | 2 | 3 | 4 | 5

export type SentenceExerciseMode = 'standalone' | 'version-segment'

export interface SentenceExerciseCompleteResult {
  mechanicalScore: number
  studentFullTranslation: string
  xpScore: number
  step1PlacedTileId: string | null
  step2SelectedAnswers: Partial<Record<VerbCategory, string>>
  step3PlacedTileIds: string[]
  step3ImplicitSuccess: boolean
  studentCoreTranslation: string
  studentComplementTranslations: string[]
}

const MECHANICAL_SCORE_INITIAL = 60
const MECHANICAL_PENALTY = 2

const STEP_LABELS: Record<AppStep, string> = {
  1: 'Identifica il verbo',
  2: 'Analisi del verbo',
  3: 'Trova il Soggetto',
  4: 'Traduci il Nucleo',
  5: 'Analisi Complementi',
}

export type { PreviousSegmentContext }

export interface SentenceExerciseFlowProps {
  analysis: LatinAnalysis
  mode: SentenceExerciseMode
  title: string
  levelId?: string
  /** Compenso massimo per frase singola (standalone). */
  customMaxReward?: number
  /** Compenso massimo del segmento (version-segment). */
  segmentMaxReward?: number
  /** Segmenti già completati prima di quello attivo (solo version-segment). */
  previousContext?: PreviousSegmentContext[]
  onBackToLevels?: () => void
  onCancel?: () => void
  onComplete?: (result: SentenceExerciseCompleteResult) => void
  hideTutorSubmit?: boolean
  initialDraft?: ExerciseDraftData
  /** Modalità consultazione: esercizio completato, UI non modificabile. */
  isReviewMode?: boolean
}

export function SentenceExerciseFlow({
  analysis,
  mode,
  title,
  levelId,
  customMaxReward,
  segmentMaxReward,
  previousContext = [],
  onBackToLevels,
  onCancel,
  onComplete,
  hideTutorSubmit = mode === 'version-segment',
  initialDraft,
  isReviewMode = false,
}: SentenceExerciseFlowProps) {
  const showXp = mode === 'standalone'
  const maxReward =
    mode === 'version-segment' ? segmentMaxReward : customMaxReward

  const [currentStep, setCurrentStep] = useState<AppStep>(
    initialDraft?.currentStep ?? 1,
  )
  const [step1Complete, setStep1Complete] = useState(
    initialDraft?.step1Complete ?? false,
  )
  const [step2Complete, setStep2Complete] = useState(
    initialDraft?.step2Complete ?? false,
  )
  const [step3Complete, setStep3Complete] = useState(
    initialDraft?.step3Complete ?? false,
  )
  const [step4Complete, setStep4Complete] = useState(
    initialDraft?.step4Complete ?? false,
  )
  const [step5Complete, setStep5Complete] = useState(
    initialDraft?.step5Complete ?? false,
  )
  const [score, setScore] = useState(initialDraft?.score ?? XP_INITIAL)
  const [mechanicalScore, setMechanicalScore] = useState(
    initialDraft?.mechanicalScore ?? MECHANICAL_SCORE_INITIAL,
  )
  const [studentCoreTranslation, setStudentCoreTranslation] = useState(
    initialDraft?.studentCoreTranslation ?? '',
  )
  const [studentComplementTranslations, setStudentComplementTranslations] =
    useState<string[]>(initialDraft?.studentComplementTranslations ?? [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(isReviewMode)
  const [earnedSesterzi, setEarnedSesterzi] = useState<number | null>(null)
  const [wasAutoApproved, setWasAutoApproved] = useState(false)
  const [step1Snapshot, setStep1Snapshot] = useState({
    placedTileId: initialDraft?.step1PlacedTileId ?? (null as string | null),
    isComplete: initialDraft?.step1Complete ?? false,
  })
  const [step2Snapshot, setStep2Snapshot] = useState<{
    completed: Record<VerbCategory, boolean>
    selectedAnswers: Partial<Record<VerbCategory, string>>
  }>({
    completed: {
      modo: initialDraft?.step2Completed?.modo ?? false,
      persona: initialDraft?.step2Completed?.persona ?? false,
      numero: initialDraft?.step2Completed?.numero ?? false,
      tempo: initialDraft?.step2Completed?.tempo ?? false,
      forma: initialDraft?.step2Completed?.forma ?? false,
    },
    selectedAnswers: (initialDraft?.step2SelectedAnswers ??
      {}) as Partial<Record<VerbCategory, string>>,
  })
  const [step3Snapshot, setStep3Snapshot] = useState({
    placedTileIds: initialDraft?.step3PlacedTileIds ?? ([] as string[]),
    implicitSuccess: initialDraft?.step3ImplicitSuccess ?? false,
  })
  const [step5Snapshot, setStep5Snapshot] = useState({
    currentIndex: initialDraft?.step5CurrentIndex ?? 0,
    caseLocked: initialDraft?.step5CaseLocked ?? false,
    selectedCase: (initialDraft?.step5SelectedCase ?? null) as LatinCase | null,
  })
  const [inReview, setInReview] = useState(false)
  const [reviewEditStep, setReviewEditStep] = useState<AppStep | null>(null)

  useEffect(() => {
    if (mode === 'standalone' && step5Complete && levelId) {
      saveLevelScore(levelId, score)
    }
  }, [step5Complete, levelId, score, mode])

  const handleMistake = useCallback(() => {
    setMechanicalScore((prev) => Math.max(0, prev - MECHANICAL_PENALTY))
  }, [])

  const handleXpMistake = useCallback((penalty: number) => {
    if (!showXp) return
    setScore((current) => applyPenalty(current, penalty))
  }, [showXp])

  const handleStepMistake = useCallback(
    (penalty: number) => {
      handleMistake()
      handleXpMistake(penalty)
    },
    [handleMistake, handleXpMistake],
  )

  const handleStepChange = (step: AppStep) => {
    setCurrentStep(step)
    if (isReviewMode) return
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

  const fullTranslation = buildFullTranslation(analysis)

  const projectedSesterzi = useMemo(() => {
    if (
      mode === 'version-segment' &&
      typeof segmentMaxReward === 'number' &&
      segmentMaxReward > 0
    ) {
      return calculateSegmentReward(segmentMaxReward, mechanicalScore)
    }
    return calculateFinalSesterziReward(analysis, mechanicalScore, maxReward)
  }, [
    mode,
    segmentMaxReward,
    mechanicalScore,
    analysis,
    maxReward,
  ])

  const buildCompleteResult = useCallback(
    (): SentenceExerciseCompleteResult => ({
      mechanicalScore,
      studentFullTranslation,
      xpScore: score,
      step1PlacedTileId: step1Snapshot.placedTileId,
      step2SelectedAnswers: step2Snapshot.selectedAnswers,
      step3PlacedTileIds: step3Snapshot.placedTileIds,
      step3ImplicitSuccess: step3Snapshot.implicitSuccess,
      studentCoreTranslation,
      studentComplementTranslations,
    }),
    [
      mechanicalScore,
      studentFullTranslation,
      score,
      step1Snapshot.placedTileId,
      step2Snapshot.selectedAnswers,
      step3Snapshot.placedTileIds,
      step3Snapshot.implicitSuccess,
      studentCoreTranslation,
      studentComplementTranslations,
    ],
  )

  const handleSubmitToTutor = async (freeTranslation = '') => {
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

    console.log('[SentenceExerciseFlow] Invio valutazione — payload reward:', {
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
        '[SentenceExerciseFlow] reward è 0 o non valido — il saldo non verrà incrementato.',
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
        freeTranslation: freeTranslation.trim() || undefined,
        stepAnswers: {
          step1PlacedTileId: step1Snapshot.placedTileId,
          step2SelectedAnswers: step2Snapshot.selectedAnswers,
          step3PlacedTileIds: step3Snapshot.placedTileIds,
          step3ImplicitSuccess: step3Snapshot.implicitSuccess,
          studentCoreTranslation,
          studentComplementTranslations,
        },
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
      console.error('[SentenceExerciseFlow] handleSubmitToTutor failed:', error)
      showError('Impossibile inviare la traduzione al tutor. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmSegment = () => {
    if (!studentFullTranslation.trim() || isSubmitting || isSubmitted) return
    setIsSubmitting(true)
    try {
      onComplete?.(buildCompleteResult())
      setIsSubmitted(true)
      setInReview(true)
      setReviewEditStep(null)
      if (typeof projectedSesterzi === 'number') {
        setEarnedSesterzi(projectedSesterzi)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const showAvanti =
    isReviewMode
      ? currentStep >= 1 && currentStep <= 4
      : !inReview &&
        !step5Complete &&
        currentStep >= 1 &&
        currentStep <= 4

  const isAvantiEnabled = isReviewMode
    ? true
    : (currentStep === 1 && step1Complete) ||
      (currentStep === 2 && step2Complete) ||
      (currentStep === 3 && step3Complete) ||
      (currentStep === 4 && step4Complete)

  const handleAvanti = () => {
    if (currentStep === 1 && step1Complete) handleStepChange(2)
    else if (currentStep === 2 && step2Complete) handleStepChange(3)
    else if (currentStep === 3 && step3Complete) handleStepChange(4)
    else if (currentStep === 4 && step4Complete) handleStepChange(5)
  }

  const showStepContent =
    isReviewMode || !inReview || reviewEditStep !== null
  const showReviewPanel = !isReviewMode && inReview && reviewEditStep === null
  const showCompletionPrompt =
    !isReviewMode && step5Complete && !inReview && !isSubmitted

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

  const handleReviewStepSelect = (step: AppStep) => {
    if (!isReviewMode) return
    setCurrentStep(step)
  }

  const handleResetExercise = async () => {
    if (isReviewMode || isSubmitting) return

    const confirmed = window.confirm(
      'Vuoi azzerare i progressi di questo esercizio? Tornerai allo Step 1.',
    )
    if (!confirmed) return

    if (levelId) {
      await deleteExerciseDraft(levelId)
      clearLevelProgress(levelId)
    }

    setCurrentStep(1)
    setStep1Complete(false)
    setStep2Complete(false)
    setStep3Complete(false)
    setStep4Complete(false)
    setStep5Complete(false)
    setScore(XP_INITIAL)
    setMechanicalScore(MECHANICAL_SCORE_INITIAL)
    setStudentCoreTranslation('')
    setStudentComplementTranslations([])
    setIsSubmitting(false)
    setIsSubmitted(false)
    setEarnedSesterzi(null)
    setWasAutoApproved(false)
    setStep1Snapshot({ placedTileId: null, isComplete: false })
    setStep2Snapshot({
      completed: {
        modo: false,
        persona: false,
        numero: false,
        tempo: false,
        forma: false,
      },
      selectedAnswers: {},
    })
    setStep3Snapshot({ placedTileIds: [], implicitSuccess: false })
    setStep5Snapshot({
      currentIndex: 0,
      caseLocked: false,
      selectedCase: null,
    })
    setInReview(false)
    setReviewEditStep(null)
  }

  const headerSubtitle = isReviewMode
    ? 'Consultazione della consegna completata — sola lettura.'
    : mode === 'version-segment'
      ? inReview
        ? 'Rileggi il tuo lavoro e conferma il segmento quando sei pronta.'
        : step5Complete
          ? 'Segmento completato. Passa alla revisione finale.'
          : 'Completa ogni passaggio del segmento prima di proseguire.'
      : inReview
        ? 'Rileggi il tuo lavoro e invialo al Tutor quando sei pronta.'
        : step5Complete
          ? 'Tutti gli step sono completati. Passa alla revisione finale.'
          : 'Completa ogni passaggio prima di proseguire.'

  const contextLabel =
    mode === 'version-segment'
      ? 'Analisi logica · Segmento'
      : 'Analisi logica · Latino'

  return (
    <AppLayout
      header={
        <div className="relative">
          <div className="absolute right-0 top-0 flex flex-col items-end gap-2">
            {!isReviewMode ? (
              <button
                type="button"
                onClick={() => void handleResetExercise()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50 can-hover:hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                title="Azzera i progressi e ricomincia dall'inizio"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset esercizio
              </button>
            ) : null}
            {showXp ? <ScoreBadge score={score} /> : null}
            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 shadow-sm">
              Analisi: {mechanicalScore}/60
            </span>
            {mode === 'version-segment' &&
            typeof projectedSesterzi === 'number' &&
            projectedSesterzi > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tabular-nums text-amber-900 shadow-sm">
                ~{projectedSesterzi.toLocaleString('it-IT')} Sesterzi
              </span>
            ) : null}
          </div>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="mb-3 text-xs font-semibold text-sky-700 can-hover:hover:text-sky-900"
            >
              ← Torna alla versione
            </button>
          ) : null}

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {contextLabel}
          </p>
          <h1 className="mt-2 max-w-[70%] font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {headerSubtitle}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as AppStep[]).map((step) =>
                isReviewMode ? (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleReviewStepSelect(step)}
                    aria-label={`Vai allo step ${step}`}
                    className={[
                      'h-1.5 w-8 rounded-full transition-colors sm:w-10',
                      step5Complete || step < currentStep
                        ? 'bg-emerald-400'
                        : step === currentStep
                          ? 'bg-slate-700'
                          : 'bg-slate-200',
                    ].join(' ')}
                  />
                ) : (
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
                ),
              )}
            </div>
            <span className="text-xs font-medium text-slate-600">
              {isReviewMode
                ? `Consultazione · Step ${currentStep} — ${STEP_LABELS[currentStep]}`
                : inReview
                  ? 'Revisione finale'
                  : step5Complete
                    ? 'Completato'
                    : `Step ${currentStep} — ${STEP_LABELS[currentStep]}`}
            </span>
          </div>
        </div>
      }
    >
      <PreviousContextPanel segments={previousContext} />

      <GlassCard>
          {isReviewMode ? (
            <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="text-sm font-medium text-sky-900">
                Modalità consultazione — esercizio completato (sola lettura)
              </p>
            </div>
          ) : null}

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
                  onMistake={() => handleStepMistake(XP_PENALTY_SELECTION)}
                  showAvantiButton={false}
                  classroomMode
                  readOnly={isReviewMode}
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
                  readOnly={isReviewMode}
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
                  onMistake={() => handleStepMistake(XP_PENALTY_SELECTION)}
                  classroomMode
                  readOnly={isReviewMode}
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
                  readOnly={isReviewMode}
                  initialTranslation={studentCoreTranslation}
                  initialConfirmed={step4Complete || isReviewMode}
                />
              </motion.div>
            )}

            {showStepContent &&
              currentStep === 5 &&
              (isReviewMode ||
                !(step5Complete && !inReview && !reviewEditStep)) && (
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
                  readOnly={isReviewMode}
                  reviewTranslations={
                    isReviewMode ? studentComplementTranslations : undefined
                  }
                  initialCurrentIndex={step5Snapshot.currentIndex}
                  initialCaseLocked={step5Snapshot.caseLocked || isReviewMode}
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
                {showXp ? (
                  <p className="mt-3 text-3xl font-bold tabular-nums text-amber-900">
                    {score} XP
                  </p>
                ) : typeof projectedSesterzi === 'number' && projectedSesterzi > 0 ? (
                  <p className="mt-3 text-3xl font-bold tabular-nums text-amber-900">
                    ~{projectedSesterzi.toLocaleString('it-IT')} Sesterzi
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-600">
                  Analisi meccanica: {mechanicalScore}/60
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {mode === 'version-segment'
                    ? 'Rileggi tutto il tuo lavoro prima di confermare il segmento.'
                    : 'Rileggi tutto il tuo lavoro prima di inviarlo al Tutor.'}
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
              hideXp={!showXp}
              hideTutorSubmit={hideTutorSubmit}
              projectedSesterzi={projectedSesterzi}
              onEditStep={handleEditFromReview}
              onSubmit={handleSubmitToTutor}
              onConfirmSegment={hideTutorSubmit ? handleConfirmSegment : undefined}
              onBackToLevels={onBackToLevels}
            />
          ) : null}

          {showAvanti && !isReviewMode ? (
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
          ) : null}

          {isReviewMode && currentStep < 5 ? (
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handleAvanti}
                className="cursor-pointer rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700"
              >
                Step successivo
              </button>
            </div>
          ) : null}
        </GlassCard>

        <footer className="mt-8 text-center">
          <p className="font-serif text-lg italic text-slate-500">
            « {analysis.frase_originale} »
          </p>
        </footer>
    </AppLayout>
  )
}
