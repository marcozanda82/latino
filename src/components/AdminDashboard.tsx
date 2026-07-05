import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Unlock } from 'lucide-react'
import { JsonLoader } from './JsonLoader'
import { useExercises } from '../context/ExerciseContext'
import { AppLayout } from './layout/AppLayout'
import { GlassCard } from './ui/GlassCard'
import { AdminDashboardSkeleton, LevelCardsSkeleton } from './ui/Skeletons'
import { clearTutorAuthentication } from '../services/tutorAuthService'
import { showError, showSuccess } from '../lib/toast'
import {
  DEFAULT_GAMIFICATION_SETTINGS,
  getSettings,
  updateSettings,
  type GamificationSettings,
} from '../services/settingsService'
import { updateLevelCompensation, updateGroupLock, updateLevelLock, unlockAllLevels, isLevelLockedByTutor } from '../services/exerciseService'
import { calculateMaxSesterziReward } from '../utils/gamification'
import { getExistingGroupNames, groupLevelsByName } from '../utils/levelGroups'
import { usePendingEvaluations } from '../hooks/usePendingEvaluations'
import { TutorDashboard } from './TutorDashboard'
import { TutorRewardsManager } from './TutorRewardsManager'
import { TutorTransactionsManager } from './TutorTransactionsManager'
import type { LatinAnalysis } from '../types'

type AdminTab = 'esercizi' | 'obiettivi' | 'valutazioni' | 'economia'

const TAB_LABELS: Record<AdminTab, string> = {
  esercizi: 'Esercizi',
  obiettivi: 'Premi Shop',
  valutazioni: 'Valutazioni',
  economia: 'Gestione Economia',
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const { levels, loading, saving, addLevel, removeLevel, refreshLevels } =
    useExercises()
  const [compDrafts, setCompDrafts] = useState<
    Record<string, { coefficient: string; customMaxReward: string }>
  >({})
  const [savingCompId, setSavingCompId] = useState<string | null>(null)
  const [togglingLockId, setTogglingLockId] = useState<string | null>(null)
  const [togglingGroupName, setTogglingGroupName] = useState<string | null>(null)
  const [unlockingAll, setUnlockingAll] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('esercizi')
  const [pendingAnalysis, setPendingAnalysis] = useState<LatinAnalysis | null>(
    null,
  )
  const [title, setTitle] = useState('')
  const [groupName, setGroupName] = useState('Settimana 1')
  const [settings, setSettings] = useState<GamificationSettings>(
    DEFAULT_GAMIFICATION_SETTINGS,
  )
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const { pendingCount, evaluatingId, resettingId, allEvaluations, handleEvaluate, handleReset } =
    usePendingEvaluations()

  const existingGroupNames = useMemo(
    () => getExistingGroupNames(levels),
    [levels],
  )

  const groupedSavedLevels = useMemo(
    () => groupLevelsByName(levels),
    [levels],
  )

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .finally(() => setSettingsLoading(false))
  }, [])

  useEffect(() => {
    setCompDrafts(
      Object.fromEntries(
        levels.map((level) => [
          level.id,
          {
            coefficient: String(level.analysis.coefficiente ?? 1),
            customMaxReward:
              level.customMaxReward !== undefined
                ? String(level.customMaxReward)
                : '',
          },
        ]),
      ),
    )
  }, [levels])

  const handleSaveCompensation = async (levelId: string) => {
    const draft = compDrafts[levelId]
    if (!draft) return

    const coefficient = Number(draft.coefficient)
    const customMaxReward = draft.customMaxReward.trim()
      ? Number(draft.customMaxReward)
      : null

    if (!Number.isFinite(coefficient) || coefficient < 0) {
      showError('Coefficiente non valido.')
      return
    }

    if (
      customMaxReward !== null &&
      (!Number.isFinite(customMaxReward) || customMaxReward < 0)
    ) {
      showError('Compenso massimo non valido.')
      return
    }

    setSavingCompId(levelId)
    try {
      await updateLevelCompensation(levelId, {
        coefficient,
        customMaxReward,
      })
      await refreshLevels()
      showSuccess('Compenso aggiornato.')
    } catch {
      showError('Impossibile aggiornare il compenso.')
    } finally {
      setSavingCompId(null)
    }
  }

  const handleToggleLevelLock = async (
    levelId: string,
    currentlyLocked: boolean,
  ) => {
    setTogglingLockId(levelId)
    try {
      await updateLevelLock(levelId, !currentlyLocked)
      await refreshLevels()
      showSuccess(
        currentlyLocked
          ? 'Esercizio sbloccato per lo studente.'
          : 'Esercizio bloccato per lo studente.',
      )
    } catch {
      showError('Impossibile aggiornare il lucchetto.')
    } finally {
      setTogglingLockId(null)
    }
  }

  const handleToggleGroupLock = async (
    groupName: string,
    groupLevelIds: string[],
    lockAll: boolean,
  ) => {
    setTogglingGroupName(groupName)
    try {
      await updateGroupLock(groupLevelIds, lockAll)
      await refreshLevels()
      showSuccess(
        lockAll
          ? `Tutti gli esercizi di "${groupName}" sono stati bloccati.`
          : `Tutti gli esercizi di "${groupName}" sono stati sbloccati.`,
      )
    } catch {
      showError('Impossibile aggiornare i lucchetti del gruppo.')
    } finally {
      setTogglingGroupName(null)
    }
  }

  const handleUnlockAllLevels = async () => {
    const confirmed = window.confirm(
      'Sbloccare TUTTI gli esercizi nel database?\n\nOgni documento in "levels" avrà isLocked: false.',
    )
    if (!confirmed) return

    setUnlockingAll(true)
    try {
      const count = await unlockAllLevels()
      showSuccess(
        count > 0
          ? `${count} esercizi sbloccati nel database.`
          : 'Nessun esercizio trovato nel database.',
      )
    } catch {
      showError('Impossibile sbloccare tutti gli esercizi.')
    } finally {
      setUnlockingAll(false)
    }
  }

  const handleLoad = (analysis: LatinAnalysis) => {
    setPendingAnalysis(analysis)
    setTitle(
      analysis.frase_originale.length > 48
        ? `${analysis.frase_originale.slice(0, 48)}…`
        : analysis.frase_originale,
    )
  }

  const handleSave = async () => {
    if (!pendingAnalysis || !title.trim() || !groupName.trim()) return

    try {
      await addLevel(title, pendingAnalysis, groupName)
      setPendingAnalysis(null)
      setTitle('')
      showSuccess('Esercizio salvato con successo!')
    } catch {
      showError('Errore durante il salvataggio. Riprova.')
    }
  }

  const handleDelete = async (id: string) => {
    await removeLevel(id)
  }

  const handleSettingsSave = async () => {
    if (settings.weeklyTarget < 1 || !settings.currentReward.trim()) {
      showError('Inserisci un obiettivo valido e un premio.')
      return
    }

    setSettingsSaving(true)
    try {
      await updateSettings(settings)
      showSuccess('Obiettivi aggiornati con successo!')
    } catch {
      showError('Errore durante il salvataggio degli obiettivi.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleExitToStudent = () => {
    clearTutorAuthentication()
    navigate('/')
  }

  return (
    <AppLayout
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Area Tutor
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            Plancia di comando
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Gestisci esercizi, premi shop, obiettivi settimanali, valutazioni ed
            economia studente.
          </p>
          <button
            type="button"
            onClick={handleExitToStudent}
            className="mt-5 w-full rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
          >
            Esci e torna alla Modalità Studente
          </button>
        </div>
      }
    >
      <GlassCard className="mb-8 !p-2">
        <div className="flex flex-wrap gap-2">
          {(['esercizi', 'obiettivi', 'valutazioni', 'economia'] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                'relative flex min-h-11 flex-1 min-w-[7rem] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 can-hover:hover:bg-slate-50',
              ].join(' ')}
            >
              <span>{TAB_LABELS[tab]}</span>
              {tab === 'valutazioni' && pendingCount > 0 ? (
                <span
                  className={[
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    activeTab === tab
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-100 text-rose-700',
                  ].join(' ')}
                  aria-label={`${pendingCount} correzioni in sospeso`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </GlassCard>

      <main className="space-y-8">
        {activeTab === 'economia' && <TutorTransactionsManager />}

        {activeTab === 'valutazioni' && (
          <TutorDashboard
            evaluations={allEvaluations}
            evaluatingId={evaluatingId}
            resettingId={resettingId}
            onEvaluate={handleEvaluate}
            onReset={handleReset}
          />
        )}

        {activeTab === 'obiettivi' && (
          <div className="space-y-8">
            <TutorRewardsManager />

            <GlassCard>
              <h2 className="text-lg font-semibold text-slate-800">
                Obiettivo settimanale
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Traguardo e premio simbolico mostrati nella barra settimanale
                dello studente.
              </p>

              {settingsLoading ? (
                <div className="mt-6 space-y-4">
                  <LevelCardsSkeleton count={1} />
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  <div>
                    <label
                      htmlFor="weekly-target"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Numero di frasi per il premio
                    </label>
                    <input
                      id="weekly-target"
                      type="number"
                      min={1}
                      max={20}
                      value={settings.weeklyTarget}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          weeklyTarget: Number(event.target.value),
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="current-reward"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Premio in palio
                    </label>
                    <input
                      id="current-reward"
                      type="text"
                      value={settings.currentReward}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          currentReward: event.target.value,
                        }))
                      }
                      placeholder="Es. Pizza da Roma, McDonald's..."
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSettingsSave}
                    disabled={settingsSaving}
                    className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {settingsSaving ? 'Salvataggio...' : 'Salva obiettivo settimanale'}
                  </button>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {activeTab === 'esercizi' && (
          <>
            <GlassCard className="border-rose-200 bg-rose-50/80">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">
                Emergenza lucchetti
              </p>
              <p className="mt-2 text-sm text-rose-900">
                Se degli esercizi restano bloccati lato studente, usa questo
                tasto per impostare <code className="font-mono text-xs">isLocked: false</code>{' '}
                su tutti i documenti della collezione.
              </p>
              <button
                type="button"
                onClick={handleUnlockAllLevels}
                disabled={unlockingAll || saving}
                className="mt-4 w-full cursor-pointer rounded-xl border-2 border-rose-600 bg-rose-600 px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors can-hover:hover:bg-rose-700 disabled:opacity-60 sm:w-auto"
              >
                {unlockingAll
                  ? 'Sblocco in corso…'
                  : 'Sblocca tutto il database'}
              </button>
            </GlassCard>

            <GlassCard>
              <JsonLoader onLoadComplete={handleLoad} onError={showError} />
            </GlassCard>

            {pendingAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Salva come livello
                  </h2>
                  <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-600">
                    « {pendingAnalysis.frase_originale} »
                  </p>

                  <label
                    htmlFor="level-title"
                    className="mt-4 block text-sm font-medium text-slate-700"
                  >
                    Titolo del livello
                  </label>
                  <input
                    id="level-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Es. Livello 1: La prima declinazione"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                  />

                  <label
                    htmlFor="group-name"
                    className="mt-4 block text-sm font-medium text-slate-700"
                  >
                    Settimana / Mondo
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    list="existing-groups"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder='Es. Settimana 1: Gallia'
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                  />
                  <datalist id="existing-groups">
                    {existingGroupNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!title.trim() || !groupName.trim() || saving}
                    className="mt-4 rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {saving ? 'Salvataggio...' : 'Salva Esercizio'}
                  </button>
                </GlassCard>
              </motion.div>
            )}

            <GlassCard>
              <h2 className="text-lg font-semibold text-slate-800">
                Livelli salvati ({levels.length})
              </h2>

              {loading ? (
                <AdminDashboardSkeleton />
              ) : levels.length === 0 ? (
                <p className="mt-5 text-sm text-slate-600">
                  Nessun esercizio salvato. Carica un JSON per iniziare.
                </p>
              ) : (
                <div className="mt-5 space-y-8">
                  {groupedSavedLevels.map((group) => {
                    const allLocked = group.levels.every((level) =>
                      isLevelLockedByTutor(level),
                    )
                    const groupLevelIds = group.levels.map((level) => level.id)
                    const isGroupBusy = togglingGroupName === group.groupName

                    return (
                      <section
                        key={group.groupName}
                        className="rounded-xl border border-slate-200 bg-white/60 p-4"
                      >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-serif text-lg font-semibold text-slate-800">
                            {group.groupName}
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleGroupLock(
                                group.groupName,
                                groupLevelIds,
                                !allLocked,
                              )
                            }
                            disabled={isGroupBusy || saving}
                            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors can-hover:hover:bg-slate-50 disabled:opacity-50"
                          >
                            {isGroupBusy
                              ? 'Aggiornamento…'
                              : allLocked
                                ? 'Sblocca tutti'
                                : 'Blocca tutti'}
                          </button>
                        </div>

                        <ul className="space-y-4">
                          {group.levels.map((level) => {
                            const draft = compDrafts[level.id] ?? {
                              coefficient: String(
                                level.analysis.coefficiente ?? 1,
                              ),
                              customMaxReward:
                                level.customMaxReward !== undefined
                                  ? String(level.customMaxReward)
                                  : '',
                            }
                            const previewMax = calculateMaxSesterziReward(
                              level.analysis,
                              draft.customMaxReward.trim()
                                ? Number(draft.customMaxReward)
                                : level.customMaxReward,
                            )
                            const locked = isLevelLockedByTutor(level)
                            const isLockBusy = togglingLockId === level.id

                            return (
                              <li
                                key={level.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleLevelLock(level.id, locked)
                                      }
                                      disabled={isLockBusy || saving}
                                      aria-label={
                                        locked
                                          ? 'Sblocca esercizio'
                                          : 'Blocca esercizio'
                                      }
                                      className={[
                                        'mt-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:opacity-50',
                                        locked
                                          ? 'border-rose-200 bg-rose-50 text-rose-600 can-hover:hover:bg-rose-100'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-600 can-hover:hover:bg-emerald-100',
                                      ].join(' ')}
                                    >
                                      {locked ? (
                                        <Lock className="h-4 w-4" aria-hidden />
                                      ) : (
                                        <Unlock className="h-4 w-4" aria-hidden />
                                      )}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-800">
                                        {level.title}
                                      </p>
                                      <p className="truncate font-serif text-xs italic text-slate-500">
                                        {level.analysis.frase_originale}
                                      </p>
                                      <p className="mt-2 text-xs font-medium text-amber-800">
                                        Valore max stimato:{' '}
                                        {previewMax.toLocaleString('it-IT')} Sesterzi
                                      </p>
                                      <p
                                        className={[
                                          'mt-1 text-xs font-medium',
                                          locked
                                            ? 'text-rose-600'
                                            : 'text-emerald-700',
                                        ].join(' ')}
                                      >
                                        {locked ? 'Bloccato' : 'Sbloccato'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(level.id)}
                                    disabled={saving}
                                    className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Elimina
                                  </button>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600">
                                      Coefficiente
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.1}
                                      value={draft.coefficient}
                                      onChange={(event) =>
                                        setCompDrafts((current) => ({
                                          ...current,
                                          [level.id]: {
                                            ...draft,
                                            coefficient: event.target.value,
                                          },
                                        }))
                                      }
                                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600">
                                      Compenso max fisso (Sesterzi)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={draft.customMaxReward}
                                      placeholder="Opzionale"
                                      onChange={(event) =>
                                        setCompDrafts((current) => ({
                                          ...current,
                                          [level.id]: {
                                            ...draft,
                                            customMaxReward: event.target.value,
                                          },
                                        }))
                                      }
                                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveCompensation(level.id)
                                      }
                                      disabled={savingCompId === level.id}
                                      className="min-h-10 w-full cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white can-hover:hover:bg-slate-700 disabled:opacity-60"
                                    >
                                      {savingCompId === level.id
                                        ? 'Salvataggio…'
                                        : 'Salva compenso'}
                                    </button>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    )
                  })}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </main>
    </AppLayout>
  )
}
