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
} from '../utils/levelGroups'
import { subscribeToStudentEvaluations } from '../services/firebaseEvaluations'
import type { PendingTranslation } from '../types/evaluation'
import {
  getLevelPreviewText,
  isSentenceLevel,
  isVersionLevel,
} from '../services/exerciseService'
import { calculateMaxSesterziReward } from '../utils/gamification'
import {
  filterLevelsWithoutSubmission,
  getSubmittedLevelIds,
} from '../utils/studentEvaluations'
import { getGradeForLevelId } from '../utils/exerciseTransactions'
import { useStudentBalance } from '../hooks/useStudentBalance'
import { useExerciseGradeEntries } from '../hooks/useExerciseGradeEntries'
import { SHOW_GAMIFICATION, IS_DEMO_MODE } from '../config/features'
import { useDemoMode } from '../context/DemoModeContext'
import { formatAverageSchoolGrade } from '../utils/grades'
import { RewardsShop } from './RewardsShop'
import { StudentBankStatement } from './StudentBankStatement'
import { StudentGradeRegister } from './StudentGradeRegister'
import { StudentArchive } from './StudentArchive'

type StudentTab = 'livelli' | 'negozio' | 'estratti' | 'archivio'

function getTabLabel(tab: StudentTab): string {
  if (tab === 'estratti') {
    return IS_DEMO_MODE ? 'Il Mio Registro' : 'Estratto Conto'
  }

  const labels: Record<StudentTab, string> = {
    livelli: 'Livelli',
    negozio: 'Negozio Premi',
    estratti: 'Estratto Conto',
    archivio: 'Archivio',
  }

  return labels[tab]
}

const HIDDEN_ACTION_CLICKS = 5
const HIDDEN_ACTION_RESET_MS = 2000

export function StudentHome() {
  const navigate = useNavigate()
  const { setDemoRole } = useDemoMode()
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
  const { gradeEntries, averageGrade } = useExerciseGradeEntries()

  const visibleTabs = useMemo(
    () =>
      (['livelli', 'negozio', 'estratti', 'archivio'] as StudentTab[]).filter(
        (tab) => {
          if (tab === 'estratti') {
            return SHOW_GAMIFICATION || IS_DEMO_MODE
          }
          if (tab === 'negozio') {
            return SHOW_GAMIFICATION
          }
          return true
        },
      ),
    [],
  )

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('livelli')
    }
  }, [activeTab, visibleTabs])

  const submittedLevelIds = useMemo(
    () => getSubmittedLevelIds(evaluations, levels),
    [evaluations, levels],
  )

  const availableLevels = useMemo(
    () => filterLevelsWithoutSubmission(levels, submittedLevelIds),
    [levels, submittedLevelIds],
  )

  const allGroupedLevels = useMemo(() => groupLevelsByName(levels), [levels])

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

  const completedLevels = useMemo(
    () => levels.filter((level) => submittedLevelIds.has(level.id)),
    [levels, submittedLevelIds],
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
    if (IS_DEMO_MODE) {
      setDemoRole('tutor')
    }
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
        {SHOW_GAMIFICATION
          ? "Completa gli esercizi disponibili, guadagna Sesterzi e consulta l'archivio per ripassare quelli già inviati."
          : IS_DEMO_MODE
            ? 'Completa gli esercizi disponibili e consulta il registro per i tuoi voti in decimi.'
            : 'Completa gli esercizi disponibili e consulta l\'archivio per ripassare quelli già inviati.'}
      </p>
      {SHOW_GAMIFICATION ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-4 py-2 text-sm font-semibold tabular-nums text-amber-900">
          <span aria-hidden>🪙</span>
          {balance.toLocaleString('it-IT')} Sesterzi
        </p>
      ) : IS_DEMO_MODE ? (
        averageGrade !== null ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-4 py-2 text-sm font-semibold tabular-nums text-sky-900">
            Media Voti: {formatAverageSchoolGrade(averageGrade)}
          </p>
        ) : null
      ) : (
        <p className="mt-4 text-sm font-medium tabular-nums text-slate-700">
          Punteggio totale: {balance.toLocaleString('it-IT')}
        </p>
      )}
    </div>
  )

  return (
    <AppLayout header={header}>
      <GlassCard className="mb-8 !p-2">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
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
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
      </GlassCard>

      {activeTab === 'negozio' && SHOW_GAMIFICATION ? (
        <RewardsShop balance={balance} />
      ) : activeTab === 'estratti' && IS_DEMO_MODE ? (
        <StudentGradeRegister />
      ) : activeTab === 'estratti' && SHOW_GAMIFICATION ? (
        <StudentBankStatement />
      ) : activeTab === 'archivio' ? (
        <StudentArchive />
      ) : (
        <>
          {!loading && SHOW_GAMIFICATION && (
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
          ) : availableLevels.length === 0 && !IS_DEMO_MODE ? (
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
              {IS_DEMO_MODE && completedLevels.length > 0 ? (
                <section>
                  <div className="mb-5">
                    <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
                      Esercizi completati
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Consulta il voto ottenuto o ripassa la consegna.
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {completedLevels.map((level, index) => {
                      const grade = getGradeForLevelId(gradeEntries, level.id)
                      const preview = getLevelPreviewText(level)

                      return (
                        <motion.div
                          key={level.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link
                            to={`/play/${level.id}?mode=review`}
                            className="block text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
                          >
                            <GlassCard className="border-emerald-200/80 bg-emerald-50/20 !p-6">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-base font-semibold text-slate-800">
                                  {level.title}
                                </h3>
                                {typeof grade === 'number' ? (
                                  <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold tabular-nums text-sky-800">
                                    Voto: {formatAverageSchoolGrade(grade)}/10
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-600">
                                « {preview} »
                              </p>
                              <p className="mt-4 text-xs font-medium text-sky-700">
                                Vedi consegna
                              </p>
                            </GlassCard>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </section>
              ) : null}

              {groupedLevels.length > 0 ? (
                groupedLevels.map((group) => (
                  <section key={group.groupName}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
                        {group.groupName}
                      </h2>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {group.levels.map((level, index) => {
                        const maxReward = isSentenceLevel(level)
                          ? calculateMaxSesterziReward(
                              level.analysis,
                              level.customMaxReward,
                            )
                          : typeof level.customMaxReward === 'number'
                            ? Math.round(level.customMaxReward)
                            : 0
                        const preview = getLevelPreviewText(level)

                        return (
                          <motion.div
                            key={level.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link
                              to={`/play/${level.id}`}
                              className="block text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]"
                            >
                              <GlassCard className="!p-6">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                    Livello {index + 1}
                                  </p>
                                  {isVersionLevel(level) ? (
                                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                      Versione
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                      Frase
                                    </span>
                                  )}
                                </div>
                                <h3 className="mt-3 text-base font-semibold text-slate-800">
                                  {level.title}
                                </h3>
                                {isVersionLevel(level) && (
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    {level.version.autore}
                                  </p>
                                )}
                                <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-600">
                                  « {preview} »
                                </p>
                                {!IS_DEMO_MODE ? (
                                  <p className="mt-3 text-xs font-medium text-slate-600">
                                    Valore massimo:{' '}
                                    <span className="font-bold text-yellow-600">
                                      💰 {maxReward.toLocaleString('it-IT')} Sesterzi
                                    </span>
                                  </p>
                                ) : null}
                                <p className="mt-5 text-xs font-medium text-emerald-700">
                                  {isVersionLevel(level)
                                    ? 'Inizia versione'
                                    : 'Inizia traduzione'}
                                </p>
                              </GlassCard>
                            </Link>
                          </motion.div>
                        )
                      })}
                    </div>
                  </section>
                ))
              ) : IS_DEMO_MODE && completedLevels.length > 0 ? null : (
                <GlassCard className="py-16 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Hai inviato tutti gli esercizi disponibili.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Consulta Il Mio Registro per i tuoi voti.
                  </p>
                </GlassCard>
              )}
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
