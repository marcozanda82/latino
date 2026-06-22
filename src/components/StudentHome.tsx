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
  getWeeklyCompletionCount,
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
import { subscribeToStudentEvaluations } from '../services/firebaseEvaluations'
import type { PendingTranslation } from '../types/evaluation'
import { calculateMaxSesterziReward } from '../utils/gamification'
import {
  buildEvaluationByLevelId,
  filterLevelsWithoutSubmission,
  getSubmittedLevelIds,
} from '../utils/studentEvaluations'
import { useStudentBalance } from '../hooks/useStudentBalance'
import { RewardsShop } from './RewardsShop'
import { StudentBankStatement } from './StudentBankStatement'
import { StudentArchive } from './StudentArchive'

type StudentTab = 'livelli' | 'negozio' | 'estratti' | 'archivio'

const TAB_LABELS: Record<StudentTab, string> = {
  livelli: 'Livelli',
  negozio: 'Negozio Premi',
  estratti: 'Estratto Conto',
  archivio: 'Archivio',
}

const HIDDEN_ACTION_CLICKS = 5
const HIDDEN_ACTION_RESET_MS = 2000

export function StudentHome() {
  const navigate = useNavigate()
  const { levels, loading } = useExercises()
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [settings, setSettings] = useState<GamificationSettings>(
    DEFAULT_GAMIFICATION_SETTINGS,
  )
  const [hiddenClickCount, setHiddenClickCount] = useState(0)
  const [showPinModal, setShowPinModal] = useState(false)
  const [evaluations, setEvaluations] = useState<PendingTranslation[]>([])
  const [activeTab, setActiveTab] = useState<StudentTab>('livelli')
  const { balance } = useStudentBalance()

  const evaluationsByLevelId = useMemo(
    () => buildEvaluationByLevelId(evaluations, levels),
    [evaluations, levels],
  )

  const submittedLevelIds = useMemo(
    () => getSubmittedLevelIds(evaluations, levels),
    [evaluations, levels],
  )

  const availableLevels = useMemo(
    () => filterLevelsWithoutSubmission(levels, submittedLevelIds),
    [levels, submittedLevelIds],
  )

  const allGroupedLevels = useMemo(() => groupLevelsByName(levels), [levels])

  const allFlatLevels = useMemo(
    () => allGroupedLevels.flatMap((group) => group.levels),
    [allGroupedLevels],
  )

  const groupedLevels = useMemo(
    () =>
      allGroupedLevels
        .map((group) => ({
          ...group,
          levels: filterLevelsWithoutSubmission(group.levels, submittedLevelIds),
        }))
        .filter((group) => group.levels.length > 0),
    [allGroupedLevels, submittedLevelIds],
  )

  const refreshProgress = useCallback(() => {
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
        Completa gli esercizi disponibili, guadagna Sesterzi e consulta
        l&apos;archivio per ripassare quelli già inviati.
      </p>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-4 py-2 text-sm font-semibold tabular-nums text-amber-900">
        <span aria-hidden>🪙</span>
        {balance.toLocaleString('it-IT')} Sesterzi
      </p>
    </div>
  )

  return (
    <AppLayout header={header}>
      <GlassCard className="mb-8 !p-2">
        <div className="flex flex-wrap gap-2">
          {(['livelli', 'negozio', 'estratti', 'archivio'] as StudentTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                'flex min-h-11 flex-1 min-w-[7rem] cursor-pointer touch-manipulation items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 can-hover:hover:bg-slate-50',
              ].join(' ')}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </GlassCard>

      {activeTab === 'negozio' ? (
        <RewardsShop balance={balance} />
      ) : activeTab === 'estratti' ? (
        <StudentBankStatement />
      ) : activeTab === 'archivio' ? (
        <StudentArchive />
      ) : (
        <>
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
          ) : availableLevels.length === 0 ? (
            <GlassCard className="py-16 text-center">
              <p className="text-sm font-medium text-slate-600">
                Hai inviato tutti gli esercizi disponibili.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Consulta la tab Archivio per ripassare le frasi già completate.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-12">
              {groupedLevels.map((group) => {
                const firstVisibleLevel = group.levels[0]
                const groupStartIndex = firstVisibleLevel
                  ? allFlatLevels.findIndex(
                      (level) => level.id === firstVisibleLevel.id,
                    )
                  : 0
                const isGroupReachable = isLevelUnlockedByEvaluation(
                  groupStartIndex,
                  allFlatLevels,
                  evaluationsByLevelId,
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
                        const globalIndex = allFlatLevels.findIndex(
                          (item) => item.id === level.id,
                        )
                        const isLevelUnlocked = isLevelUnlockedByEvaluation(
                          globalIndex,
                          allFlatLevels,
                          evaluationsByLevelId,
                          group.groupName,
                        )
                        const maxReward = calculateMaxSesterziReward(
                          level.analysis,
                          level.customMaxReward,
                        )
                        const isPlayable = isLevelUnlocked

                        const cardContent = (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                Livello {index + 1}
                              </p>
                              {!isLevelUnlocked ? (
                                <span className="text-xs text-slate-500">🔒</span>
                              ) : null}
                            </div>
                            <h3 className="mt-3 text-base font-semibold text-slate-800">
                              {level.title}
                            </h3>
                            <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-600">
                              « {level.analysis.frase_originale} »
                            </p>
                            <p className="mt-3 text-xs font-medium text-slate-600">
                              Valore massimo:{' '}
                              <span className="font-bold text-yellow-600">
                                💰 {maxReward.toLocaleString('it-IT')} Sesterzi
                              </span>
                            </p>
                            <p className="mt-5 text-xs font-medium text-emerald-700">
                              {!isLevelUnlocked ? (
                                <span className="text-slate-500">Bloccato</span>
                              ) : (
                                'Inizia'
                              )}
                            </p>
                          </>
                        )

                        const cardClassName = [
                          'block text-left transition-all duration-200',
                          isPlayable
                            ? 'hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]'
                            : 'cursor-not-allowed opacity-70',
                        ].join(' ')

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
        </>
      )}

      <TutorPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />
    </AppLayout>
  )
}
