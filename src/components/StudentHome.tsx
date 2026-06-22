import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useExercises } from '../context/ExerciseContext'
import { AppLayout } from './layout/AppLayout'
import { TutorPinModal } from './TutorPinModal'
import { WeeklyGoalTracker } from './WeeklyGoalTracker'
import { GlassCard } from './ui/GlassCard'
import { StudentHomeSkeleton } from './ui/Skeletons'
import {
  getCompletedLevels,
  getWeeklyCompletionCount,
  type LevelProgress,
} from '../services/progressService'
import {
  DEFAULT_GAMIFICATION_SETTINGS,
  getSettings,
  type GamificationSettings,
} from '../services/settingsService'
import {
  groupLevelsByName,
  isLevelUnlockedByEvaluation,
} from '../utils/levelGroups'
import {
  subscribeToStudentEvaluations,
} from '../services/firebaseEvaluations'
import type { PendingTranslation } from '../types/evaluation'

const HIDDEN_ACTION_CLICKS = 5
const HIDDEN_ACTION_RESET_MS = 2000

function EvaluationBadge({ evalData }: { evalData: PendingTranslation }) {
  switch (evalData.status) {
    case 'in_attesa':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200/80 bg-sky-50/90 px-2.5 py-1 text-xs font-medium text-sky-800">
          <span aria-hidden>⏳</span>
          In attesa del tutor
        </span>
      )
    case 'verde':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-800">
          <span aria-hidden>🟢</span>
          {evalData.totalScore ?? evalData.mechanicalScore}/100
        </span>
      )
    case 'giallo':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-900">
          <span aria-hidden>🟡</span>
          {evalData.totalScore ?? evalData.mechanicalScore}/100
        </span>
      )
    case 'rosso':
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-rose-800">
          <span aria-hidden>🔴</span>
          {evalData.totalScore ?? evalData.mechanicalScore}/100
        </span>
      )
    default:
      return null
  }
}

export function StudentHome() {
  const navigate = useNavigate()
  const { levels, loading } = useExercises()
  const [progress, setProgress] = useState<LevelProgress>({})
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [settings, setSettings] = useState<GamificationSettings>(
    DEFAULT_GAMIFICATION_SETTINGS,
  )
  const [hiddenClickCount, setHiddenClickCount] = useState(0)
  const [showPinModal, setShowPinModal] = useState(false)
  const [evaluations, setEvaluations] = useState<PendingTranslation[]>([])

  const evaluationsMap = useMemo(() => {
    const map: Record<string, PendingTranslation> = {}

    evaluations.forEach((evaluation) => {
      if (!map[evaluation.fraseOriginale]) {
        map[evaluation.fraseOriginale] = evaluation
      }
    })

    return map
  }, [evaluations])

  const groupedLevels = useMemo(() => groupLevelsByName(levels), [levels])

  const flatLevels = useMemo(
    () => groupedLevels.flatMap((group) => group.levels),
    [groupedLevels],
  )

  const refreshProgress = useCallback(() => {
    setProgress(getCompletedLevels())
    setWeeklyCount(getWeeklyCompletionCount())
  }, [])

  useEffect(() => {
    refreshProgress()
    getSettings().then(setSettings)
  }, [refreshProgress])

  useEffect(() => {
    const unsubscribe = subscribeToStudentEvaluations(setEvaluations)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (hiddenClickCount === 0) return
    const timer = window.setTimeout(
      () => setHiddenClickCount(0),
      HIDDEN_ACTION_RESET_MS,
    )
    return () => window.clearTimeout(timer)
  }, [hiddenClickCount])

  const handleHiddenAction = () => {
    setHiddenClickCount((count) => {
      const next = count + 1
      if (next >= HIDDEN_ACTION_CLICKS) {
        setShowPinModal(true)
        return 0
      }
      return next
    })
  }

  const handlePinSuccess = () => {
    setShowPinModal(false)
    navigate('/admin')
  }

  const header = (
    <div>
      <button
        type="button"
        onClick={handleHiddenAction}
        className="flex items-center gap-3 text-left"
        aria-label="Profilo studente"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-sm text-slate-500 shadow-sm">
          👤
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Modalità Studente
        </p>
      </button>
      <button type="button" onClick={handleHiddenAction} className="mt-3 block text-left">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
          Scegli un livello
        </h1>
      </button>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Ogni livello è un&apos;analisi guidata con punteggio XP.
      </p>
    </div>
  )

  return (
    <AppLayout header={header}>
      {!loading && (
        <WeeklyGoalTracker completedCount={weeklyCount} settings={settings} />
      )}

      {loading ? (
        <StudentHomeSkeleton />
      ) : levels.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nessun livello disponibile.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Chiedi al tutor di caricare il primo esercizio.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-12">
          {groupedLevels.map((group, groupIndex) => {
            const groupStartIndex = groupedLevels
              .slice(0, groupIndex)
              .reduce((sum, item) => sum + item.levels.length, 0)
            const isGroupReachable = isLevelUnlockedByEvaluation(
              groupStartIndex,
              flatLevels,
              evaluationsMap,
              group.groupName,
            )

            return (
              <section key={group.groupName}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
                    {group.groupName}
                  </h2>
                  {!isGroupReachable && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      🔒 Bloccato
                    </span>
                  )}
                </div>

                {!isGroupReachable && (
                  <p className="mb-5 text-sm leading-relaxed text-slate-600">
                    Invia la traduzione del livello precedente per sbloccare i
                    prossimi esercizi.
                  </p>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  {group.levels.map((level, index) => {
                    const globalIndex = groupStartIndex + index
                    const isLevelUnlocked = isLevelUnlockedByEvaluation(
                      globalIndex,
                      flatLevels,
                      evaluationsMap,
                      group.groupName,
                    )
                    const entry = progress[level.id]
                    const bestScore = entry?.bestScore
                    const isCompleted = bestScore !== undefined
                    const evalData =
                      evaluationsMap[level.analysis.frase_originale]
                    const isAwaitingTutor = evalData?.status === 'in_attesa'
                    const isPlayable = isLevelUnlocked && !isAwaitingTutor

                    const cardContent = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            Livello {index + 1}
                          </p>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {evalData && <EvaluationBadge evalData={evalData} />}
                            {!isLevelUnlocked ? (
                              <span className="text-xs text-slate-500">🔒</span>
                            ) : isCompleted && !evalData ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                ✅ Completato
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-slate-800">
                          {level.title}
                        </h3>
                        <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-600">
                          « {level.analysis.frase_originale} »
                        </p>
                        <p className="mt-5 text-xs font-medium text-emerald-700">
                          {!isLevelUnlocked ? (
                            <span className="text-slate-500">Bloccato</span>
                          ) : isAwaitingTutor ? (
                            <span className="text-sky-700">
                              Valutazione in corso — non puoi ripetere questa
                              frase
                            </span>
                          ) : isCompleted ? (
                            <>
                              🏆 Miglior Punteggio: {bestScore} XP
                              <span className="mt-1 block text-slate-600">
                                Rigioca
                              </span>
                            </>
                          ) : (
                            'Inizia'
                          )}
                        </p>
                      </>
                    )

                    const cardClassName = [
                      'block text-left transition-all duration-200',
                      isCompleted && !isAwaitingTutor
                        ? 'border-emerald-200/80 bg-emerald-50/70 hover:border-emerald-300'
                        : '',
                      isAwaitingTutor
                        ? 'cursor-not-allowed opacity-90'
                        : '',
                      isPlayable
                        ? 'hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]'
                        : 'cursor-not-allowed opacity-70',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <motion.div
                        key={level.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {isPlayable ? (
                          <Link to={`/play/${level.id}`} className={cardClassName}>
                            <GlassCard className="!p-6">{cardContent}</GlassCard>
                          </Link>
                        ) : (
                          <GlassCard className="!p-6" as="article">
                            {cardContent}
                          </GlassCard>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <TutorPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />
    </AppLayout>
  )
}
