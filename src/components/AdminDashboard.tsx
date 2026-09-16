import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Check } from 'lucide-react'
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
import { updateLevelCompensation, isSentenceLevel, isVersionLevel, getLevelPreviewText } from '../services/exerciseService'
import { calculateMaxSesterziReward } from '../utils/gamification'
import { getExistingGroupNames, groupLevelsByName } from '../utils/levelGroups'
import { usePendingEvaluations } from '../hooks/usePendingEvaluations'
import { useStuckExercises } from '../hooks/useStuckExercises'
import { TutorDashboard } from './TutorDashboard'
import { StuckExercisesPanel } from './StuckExercisesPanel'
import { TutorRewardsManager } from './TutorRewardsManager'
import { TutorTransactionsManager } from './TutorTransactionsManager'
import { VERSION_AI_PROMPT, SENTENCE_AI_PROMPT } from '../constants/aiPrompt'
import type { LatinAnalysis } from '../types'
import type { VersionExercise } from '../types/version'
import { getVersionSegmentLatinText } from '../types/version'
import {
  parseVersionExerciseJson,
  normalizeVersionExerciseCompensi,
  VersionJsonLoadError,
} from '../utils/validateVersionExercise'
import { SHOW_GAMIFICATION, IS_DEMO_MODE } from '../config/features'
import { useDemoMode } from '../context/DemoModeContext'

type AdminTab = 'esercizi' | 'obiettivi' | 'valutazioni' | 'economia'
type CreateContentType = 'sentence' | 'version'

const TAB_LABELS: Record<AdminTab, string> = {
  esercizi: 'Esercizi',
  obiettivi: 'Premi Shop',
  valutazioni: 'Valutazioni',
  economia: IS_DEMO_MODE ? 'Registro Valutazioni' : 'Gestione Economia',
}

const VERSION_JSON_PLACEHOLDER = `{
  "titolo": "La battaglia di Maratona",
  "tipo": "version",
  "autore": "Cornelio Nepote",
  "introduzione": "Testo introduttivo...",
  "segmenti": [
    { "id": 1, "latino": "Testo latino 1...", "note": "Nota opzionale" },
    { "id": 2, "latino": "Testo latino 2...", "note": "" }
  ]
}`

export function AdminDashboard() {
  const navigate = useNavigate()
  const { setDemoRole } = useDemoMode()
  const { levels, loading, saving, addLevel, addVersionLevel, removeLevel, refreshLevels } =
    useExercises()
  const [compDrafts, setCompDrafts] = useState<
    Record<string, { coefficient: string; customMaxReward: string }>
  >({})
  const [savingCompId, setSavingCompId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>(
    IS_DEMO_MODE ? 'economia' : 'esercizi',
  )
  const [createType, setCreateType] = useState<CreateContentType>('sentence')
  const [pendingAnalysis, setPendingAnalysis] = useState<LatinAnalysis | null>(
    null,
  )
  const [pendingBatchQueue, setPendingBatchQueue] = useState<LatinAnalysis[]>(
    [],
  )
  const [pendingVersion, setPendingVersion] = useState<VersionExercise | null>(
    null,
  )
  const [versionJsonText, setVersionJsonText] = useState('')
  const [versionMaxReward, setVersionMaxReward] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const [title, setTitle] = useState('')
  const [groupName, setGroupName] = useState('Settimana 1')
  const [settings, setSettings] = useState<GamificationSettings>(
    DEFAULT_GAMIFICATION_SETTINGS,
  )
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const {
    pendingCount,
    evaluatingId,
    resettingId,
    allEvaluations,
    handleEvaluate,
    handleApproveVersion,
    handleReset,
  } = usePendingEvaluations()

  const {
    stuckExercises,
    loading: stuckLoading,
    forcingId,
    handleForceComplete,
  } = useStuckExercises(levels, allEvaluations)

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

  const visibleAdminTabs = useMemo(
    () =>
      (['esercizi', 'obiettivi', 'valutazioni', 'economia'] as AdminTab[]).filter(
        (tab) => {
          if (tab === 'obiettivi') {
            return SHOW_GAMIFICATION
          }
          if (tab === 'economia') {
            return SHOW_GAMIFICATION || IS_DEMO_MODE
          }
          return true
        },
      ),
    [],
  )

  useEffect(() => {
    if (!visibleAdminTabs.includes(activeTab)) {
      setActiveTab(
        IS_DEMO_MODE && visibleAdminTabs.includes('economia')
          ? 'economia'
          : 'esercizi',
      )
    }
  }, [activeTab, visibleAdminTabs])

  useEffect(() => {
    setCompDrafts(
      Object.fromEntries(
        levels.map((level) => [
          level.id,
          {
            coefficient: isSentenceLevel(level)
              ? String(level.analysis.coefficiente ?? 1)
              : '1',
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

    const level = levels.find((item) => item.id === levelId)
    const coefficient = Number(draft.coefficient)
    const customMaxReward = draft.customMaxReward.trim()
      ? Number(draft.customMaxReward)
      : null

    if (
      level &&
      isSentenceLevel(level) &&
      (!Number.isFinite(coefficient) || coefficient < 0)
    ) {
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
        ...(level && isSentenceLevel(level) ? { coefficient } : {}),
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

  const buildLevelTitle = (analysis: LatinAnalysis) =>
    analysis.frase_originale.length > 48
      ? `${analysis.frase_originale.slice(0, 48)}…`
      : analysis.frase_originale

  const handleLoad = (
    analysis: LatinAnalysis,
    remaining: LatinAnalysis[] = [],
  ) => {
    setPendingVersion(null)
    setPendingAnalysis(analysis)
    setPendingBatchQueue(remaining)
    setTitle(buildLevelTitle(analysis))

    if (remaining.length > 0) {
      showSuccess(
        `Caricate ${remaining.length + 1} frasi. Salva questa per passare alla successiva.`,
      )
    }
  }

  const handleCreateTypeChange = (next: CreateContentType) => {
    setCreateType(next)
    setPendingAnalysis(null)
    setPendingBatchQueue([])
    setPendingVersion(null)
    setTitle('')
    setVersionJsonText('')
    setVersionMaxReward('')
  }

  const handleLoadVersion = () => {
    try {
      const customMaxReward = versionMaxReward.trim()
        ? Number(versionMaxReward)
        : undefined

      if (
        customMaxReward !== undefined &&
        (!Number.isFinite(customMaxReward) || customMaxReward < 0)
      ) {
        showError('Compenso massimo non valido.')
        return
      }

      const version = parseVersionExerciseJson(versionJsonText, {
        customMaxReward,
      })
      setPendingAnalysis(null)
      setPendingVersion(version)
      setTitle(version.titolo)
      showSuccess('JSON versione validato. Controlla e salva.')
    } catch (error) {
      const message =
        error instanceof VersionJsonLoadError
          ? error.message
          : 'Errore: Il file JSON non ha il formato corretto per la versione'
      showError(message)
    }
  }

  const handleCopyAiPrompt = async () => {
    const prompt =
      createType === 'sentence' ? SENTENCE_AI_PROMPT : VERSION_AI_PROMPT

    try {
      await navigator.clipboard.writeText(prompt)
      setPromptCopied(true)
      window.setTimeout(() => setPromptCopied(false), 2000)
    } catch (error) {
      console.error('[AdminDashboard] handleCopyAiPrompt failed:', error)
      showError('Impossibile copiare il prompt negli appunti.')
    }
  }

  const handleSave = async () => {
    if (!pendingAnalysis || !title.trim() || !groupName.trim()) return

    try {
      await addLevel(title, pendingAnalysis, groupName)

      if (pendingBatchQueue.length > 0) {
        const [next, ...rest] = pendingBatchQueue
        setPendingBatchQueue(rest)
        setPendingAnalysis(next)
        setTitle(buildLevelTitle(next))
        showSuccess(
          rest.length > 0
            ? `Esercizio salvato. Prossima frase (${rest.length} rimanenti).`
            : 'Esercizio salvato. Ultima frase in coda.',
        )
        return
      }

      setPendingAnalysis(null)
      setTitle('')
      showSuccess('Esercizio salvato con successo!')
    } catch {
      showError('Errore durante il salvataggio. Riprova.')
    }
  }

  const handleSaveVersion = async () => {
    if (!pendingVersion || !groupName.trim()) return

    const customMaxReward = versionMaxReward.trim()
      ? Number(versionMaxReward)
      : undefined

    if (
      customMaxReward !== undefined &&
      (!Number.isFinite(customMaxReward) || customMaxReward < 0)
    ) {
      showError('Compenso massimo non valido.')
      return
    }

    try {
      const versionToSave = normalizeVersionExerciseCompensi(
        {
          ...pendingVersion,
          titolo: title.trim() || pendingVersion.titolo,
        },
        customMaxReward,
      )
      await addVersionLevel(versionToSave, groupName, customMaxReward)
      setPendingVersion(null)
      setVersionJsonText('')
      setVersionMaxReward('')
      setTitle('')
      showSuccess('Versione salvata con successo!')
    } catch {
      showError('Errore durante il salvataggio della versione. Riprova.')
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
    if (IS_DEMO_MODE) {
      setDemoRole('student')
    } else {
      clearTutorAuthentication()
    }
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
            {SHOW_GAMIFICATION
              ? 'Gestisci esercizi, premi shop, obiettivi settimanali, valutazioni ed economia studente.'
              : IS_DEMO_MODE
                ? 'Gestisci esercizi, valutazioni e registro voti degli studenti.'
                : 'Gestisci esercizi e valutazioni degli studenti.'}
          </p>
          {!IS_DEMO_MODE && (
            <button
              type="button"
              onClick={handleExitToStudent}
              className="mt-5 w-full rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Esci e torna alla Modalità Studente
            </button>
          )}
        </div>
      }
    >
      <GlassCard className="mb-8 !p-2">
        <div className="flex flex-wrap gap-2">
          {visibleAdminTabs.map((tab) => (
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
          <div className="space-y-8">
            <StuckExercisesPanel
              exercises={stuckExercises}
              loading={stuckLoading}
              forcingId={forcingId}
              onForceComplete={handleForceComplete}
            />

            <TutorDashboard
              evaluations={allEvaluations}
              evaluatingId={evaluatingId}
              resettingId={resettingId}
              onEvaluate={handleEvaluate}
              onApproveVersion={handleApproveVersion}
              onReset={handleReset}
            />
          </div>
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
            <GlassCard>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Nuovo contenuto
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">
                Tipo di esercizio
              </h2>
              <div className="mt-4 flex gap-2">
                {(
                  [
                    { id: 'sentence', label: 'Frase Singola' },
                    { id: 'version', label: 'Versione' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleCreateTypeChange(option.id)}
                    className={[
                      'flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                      createType === option.id
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </GlassCard>

            {createType === 'sentence' ? (
              <GlassCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Import JSON
                    </p>
                    <h2 className="mt-1 text-base font-medium text-slate-700">
                      Carica le frasi singole
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Incolla un oggetto singolo o un array di analisi generate
                      con un&apos;AI esterna.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAiPrompt}
                    className={[
                      'inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors',
                      promptCopied
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {promptCopied ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      <Bot className="h-4 w-4" aria-hidden />
                    )}
                    {promptCopied ? 'Copiato!' : 'Copia Prompt per AI'}
                  </button>
                </div>
                <div className="mt-6">
                  <JsonLoader onLoadComplete={handleLoad} onError={showError} />
                </div>
              </GlassCard>
            ) : (
              <GlassCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Import JSON
                    </p>
                    <h2 className="mt-1 text-base font-medium text-slate-700">
                      Incolla il JSON della versione
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Deve includere titolo, autore, introduzione e l&apos;array
                      segmenti. Puoi generarlo con un&apos;AI esterna.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAiPrompt}
                    className={[
                      'inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors',
                      promptCopied
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {promptCopied ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      <Bot className="h-4 w-4" aria-hidden />
                    )}
                    {promptCopied ? 'Copiato!' : 'Copia Prompt per AI'}
                  </button>
                </div>
                <textarea
                  value={versionJsonText}
                  onChange={(event) => setVersionJsonText(event.target.value)}
                  rows={14}
                  placeholder={VERSION_JSON_PLACEHOLDER}
                  className="mt-4 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleLoadVersion}
                  disabled={!versionJsonText.trim()}
                  className="mt-4 w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Carica Versione
                </button>
              </GlassCard>
            )}

            {pendingAnalysis && createType === 'sentence' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Salva come livello
                  </h2>
                  {pendingBatchQueue.length > 0 && (
                    <p className="mt-2 text-sm font-medium text-indigo-600">
                      Frase in coda: {pendingBatchQueue.length + 1} totali (
                      {pendingBatchQueue.length} rimanenti dopo il salvataggio)
                    </p>
                  )}
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
                    placeholder="Es. Settimana 1: Gallia"
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

            {pendingVersion && createType === 'version' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-800">
                      Anteprima versione
                    </h2>
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                      {pendingVersion.segmenti.length} segmenti
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {pendingVersion.autore}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {pendingVersion.introduzione}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {pendingVersion.segmenti.slice(0, 3).map((segment) => (
                      <li
                        key={segment.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 font-serif text-sm text-slate-700"
                      >
                        {getVersionSegmentLatinText(segment)}
                      </li>
                    ))}
                    {pendingVersion.segmenti.length > 3 ? (
                      <li className="text-xs text-slate-500">
                        …e altri {pendingVersion.segmenti.length - 3} segmenti
                      </li>
                    ) : null}
                  </ul>

                  <label
                    htmlFor="version-title"
                    className="mt-4 block text-sm font-medium text-slate-700"
                  >
                    Titolo
                  </label>
                  <input
                    id="version-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                  />

                  <label
                    htmlFor="version-group-name"
                    className="mt-4 block text-sm font-medium text-slate-700"
                  >
                    Settimana / Mondo
                  </label>
                  <input
                    id="version-group-name"
                    type="text"
                    list="existing-groups-version"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="Es. Settimana 1: Gallia"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                  />
                  <datalist id="existing-groups-version">
                    {existingGroupNames.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>

                  <label
                    htmlFor="version-max-reward"
                    className="mt-4 block text-sm font-medium text-slate-700"
                  >
                    Compenso max suggerito (Sesterzi)
                  </label>
                  <input
                    id="version-max-reward"
                    type="number"
                    min={0}
                    value={versionMaxReward}
                    onChange={(event) => setVersionMaxReward(event.target.value)}
                    placeholder="Opzionale"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={handleSaveVersion}
                    disabled={!title.trim() || !groupName.trim() || saving}
                    className="mt-4 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {saving ? 'Salvataggio...' : 'Salva Versione'}
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
                  {groupedSavedLevels.map((group) => (
                      <section
                        key={group.groupName}
                        className="rounded-xl border border-slate-200 bg-white/60 p-4"
                      >
                        <div className="mb-4">
                          <h3 className="font-serif text-lg font-semibold text-slate-800">
                            {group.groupName}
                          </h3>
                        </div>

                        <ul className="space-y-4">
                          {group.levels.map((level) => {
                            const draft = compDrafts[level.id] ?? {
                              coefficient: isSentenceLevel(level)
                                ? String(level.analysis.coefficiente ?? 1)
                                : '1',
                              customMaxReward:
                                level.customMaxReward !== undefined
                                  ? String(level.customMaxReward)
                                  : '',
                            }
                            const previewMax = isSentenceLevel(level)
                              ? calculateMaxSesterziReward(
                                  level.analysis,
                                  draft.customMaxReward.trim()
                                    ? Number(draft.customMaxReward)
                                    : level.customMaxReward,
                                )
                              : draft.customMaxReward.trim()
                                ? Number(draft.customMaxReward)
                                : (level.customMaxReward ?? 0)
                            const segmentCount = isVersionLevel(level)
                              ? level.version.segmenti.length
                              : null

                            return (
                              <li
                                key={level.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-sm font-medium text-slate-800">
                                        {level.title}
                                      </p>
                                      <span
                                        className={[
                                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                          isVersionLevel(level)
                                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-200 bg-white text-slate-500',
                                        ].join(' ')}
                                      >
                                        {isVersionLevel(level)
                                          ? 'Versione'
                                          : 'Frase'}
                                      </span>
                                      {segmentCount !== null ? (
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                          {segmentCount} segmenti
                                        </span>
                                      ) : null}
                                    </div>
                                    {isVersionLevel(level) ? (
                                      <p className="mt-1 text-xs font-medium text-slate-500">
                                        {level.version.autore}
                                      </p>
                                    ) : null}
                                    <p className="truncate font-serif text-xs italic text-slate-500">
                                      {getLevelPreviewText(level)}
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-amber-800">
                                      Valore max stimato:{' '}
                                      {previewMax.toLocaleString('it-IT')} Sesterzi
                                    </p>
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
                                  {isSentenceLevel(level) ? (
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
                                  ) : null}
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
                    ))}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </main>
    </AppLayout>
  )
}
