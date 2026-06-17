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
  isGroupUnlocked,
} from '../utils/levelGroups'

const HIDDEN_ACTION_CLICKS = 5
const HIDDEN_ACTION_RESET_MS = 2000

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

  const groupedLevels = useMemo(() => groupLevelsByName(levels), [levels])

  const refreshProgress = useCallback(() => {
    setProgress(getCompletedLevels())
    setWeeklyCount(getWeeklyCompletionCount())
  }, [])

  useEffect(() => {
    refreshProgress()
    getSettings().then(setSettings)
  }, [refreshProgress])

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
            const unlocked = isGroupUnlocked(groupIndex, groupedLevels, progress)

            return (
              <section key={group.groupName}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
                    {group.groupName}
                  </h2>
                  {!unlocked && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      🔒 Bloccato
                    </span>
                  )}
                </div>

                {!unlocked && (
                  <p className="mb-5 text-sm leading-relaxed text-slate-600">
                    Completa tutti i livelli del mondo precedente per sbloccare
                    questo gruppo.
                  </p>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  {group.levels.map((level, index) => {
                    const entry = progress[level.id]
                    const bestScore = entry?.bestScore
                    const isCompleted = bestScore !== undefined

                    const cardContent = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            Livello {index + 1}
                          </p>
                          {!unlocked ? (
                            <span className="shrink-0 text-xs text-slate-500">
                              🔒
                            </span>
                          ) : isCompleted ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              ✅ Completato
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-slate-800">
                          {level.title}
                        </h3>
                        <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-600">
                          « {level.analysis.frase_originale} »
                        </p>
                        <p className="mt-5 text-xs font-medium text-emerald-700">
                          {!unlocked ? (
                            <span className="text-slate-500">Bloccato</span>
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
                      isCompleted
                        ? 'border-emerald-200/80 bg-emerald-50/70 hover:border-emerald-300'
                        : '',
                      unlocked
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
                        {unlocked ? (
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
