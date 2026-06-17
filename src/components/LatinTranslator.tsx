import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Step1VerbSelection } from './steps/Step1VerbSelection'
import { Step2VerbAnalysis } from './steps/Step2VerbAnalysis'
import { Step3SubjectSelection } from './steps/Step3SubjectSelection'
import { Step4CoreTranslation } from './steps/Step4CoreTranslation'
import { Step5Satellites } from './steps/Step5Satellites'
import { ScoreBadge } from './ScoreBadge'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import { buildFullTranslation } from '../utils/complements'
import { showError } from '../lib/toast'
import {
  applyPenalty,
  getMotivationalMessage,
  XP_INITIAL,
  XP_PENALTY_CHIP,
  XP_PENALTY_DRAG,
  XP_PENALTY_RETRY,
} from '../utils/gamification'
import type { LatinAnalysis } from '../types'
import { saveLevelScore } from '../services/progressService'
import { getPrimaryTranslation } from '../utils/textNormalization'

type AppStep = 1 | 2 | 3 | 4 | 5

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
  onBackToLevels: () => void
}

export function LatinTranslator({
  analysis,
  levelTitle,
  levelId,
  onBackToLevels,
}: LatinTranslatorProps) {
  const [currentStep, setCurrentStep] = useState<AppStep>(1)
  const [step1Complete, setStep1Complete] = useState(false)
  const [step2Complete, setStep2Complete] = useState(false)
  const [step3Complete, setStep3Complete] = useState(false)
  const [step4Complete, setStep4Complete] = useState(false)
  const [step5Complete, setStep5Complete] = useState(false)
  const [score, setScore] = useState(XP_INITIAL)

  useEffect(() => {
    if (step5Complete && levelId) {
      saveLevelScore(levelId, score)
    }
  }, [step5Complete, levelId, score])

  const handleMistake = useCallback((penalty: number) => {
    setScore((current) => applyPenalty(current, penalty))
  }, [])

  const handleStepChange = (step: AppStep) => {
    setCurrentStep(step)
    if (step < 2) setStep2Complete(false)
    if (step < 3) setStep3Complete(false)
    if (step < 4) setStep4Complete(false)
    if (step < 5) setStep5Complete(false)
  }

  const showAvanti = currentStep >= 1 && currentStep <= 4

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
  const motivationalMessage = getMotivationalMessage(score)

  return (
    <AppLayout
      header={
        <div className="relative">
          <div className="absolute right-0 top-0">
            <ScoreBadge score={score} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Analisi logica · Latino
          </p>
          <h1 className="mt-2 max-w-[70%] font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {levelTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {step5Complete
              ? 'Hai completato l\'intera analisi e traduzione della frase.'
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
              {step5Complete
                ? 'Completato'
                : `Step ${currentStep} — ${STEP_LABELS[currentStep]}`}
            </span>
          </div>
        </div>
      }
    >
      <GlassCard>
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
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
                  onMistake={() => handleMistake(XP_PENALTY_DRAG)}
                  showAvantiButton={false}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
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
                  onMistake={() => handleMistake(XP_PENALTY_CHIP)}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
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
                  onMistake={() => handleMistake(XP_PENALTY_DRAG)}
                />
              </motion.div>
            )}

            {currentStep === 4 && (
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
                  onMistake={() => handleMistake(XP_PENALTY_RETRY)}
                />
              </motion.div>
            )}

            {currentStep === 5 && (
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
                  onError={showError}
                  onMistakeChip={() => handleMistake(XP_PENALTY_CHIP)}
                  onMistakeRetry={() => handleMistake(XP_PENALTY_RETRY)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step5Complete && (
              <motion.div
                key="victory"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8"
              >
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  Frase completata
                </p>

                <div className="mx-auto mt-6 flex w-fit flex-col items-center rounded-2xl border border-amber-200 bg-amber-50 px-10 py-8 shadow-sm">
                  <span className="text-4xl" aria-hidden>
                    🏆
                  </span>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-amber-900">
                    {score} XP
                  </p>
                  <p className="mt-2 text-lg font-medium text-emerald-900">
                    {motivationalMessage}
                  </p>
                </div>

                <div className="mt-6 space-y-4 rounded-lg border border-emerald-100 bg-white/70 p-5 text-left">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Latino
                    </p>
                    <p className="mt-1 font-serif text-lg italic text-slate-700">
                      « {analysis.frase_originale} »
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Nucleo
                    </p>
                    <p className="mt-1 text-base text-slate-800">
                      {getPrimaryTranslation(analysis.step4_nucleo_tradotto)}
                    </p>
                  </div>

                  {analysis.step5_complementi.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Complementi
                      </p>
                      <ul className="mt-2 space-y-2">
                        {analysis.step5_complementi.map((item, index) => (
                          <li
                            key={`${item.parole.join('-')}-${index}`}
                            className="flex flex-wrap items-baseline gap-2 text-sm text-slate-700"
                          >
                            <span className="font-serif text-slate-500">
                              {item.parole.join(' ')}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span>{getPrimaryTranslation(item.traduzione)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-emerald-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                      Traduzione completa
                    </p>
                    <p className="mt-2 text-lg font-medium text-emerald-900">
                      {fullTranslation}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={onBackToLevels}
                    className="rounded-lg bg-slate-800 px-8 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700"
                  >
                    Torna ai Livelli
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showAvanti && !step5Complete && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: isAvantiEnabled ? 1 : 0.4, y: 0 }}
              className="mt-6 flex justify-end border-t border-slate-100 pt-6"
            >
              <button
                type="button"
                onClick={handleAvanti}
                disabled={!isAvantiEnabled}
                className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
