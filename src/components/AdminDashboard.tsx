import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { getExistingGroupNames } from '../utils/levelGroups'
import type { LatinAnalysis } from '../types'

type AdminTab = 'esercizi' | 'obiettivi'

const TAB_LABELS: Record<AdminTab, string> = {
  esercizi: 'Esercizi',
  obiettivi: 'Obiettivi',
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const { levels, loading, saving, addLevel, removeLevel } = useExercises()
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

  const existingGroupNames = useMemo(
    () => getExistingGroupNames(levels),
    [levels],
  )

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .finally(() => setSettingsLoading(false))
  }, [])

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
            Gestisci esercizi, settimane e obiettivi motivazionali.
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
        <div className="flex gap-2">
          {(['esercizi', 'obiettivi'] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </GlassCard>

      <main className="space-y-8">
        {activeTab === 'obiettivi' && (
          <GlassCard>
            <h2 className="text-lg font-semibold text-slate-800">
              Obiettivi settimanali
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Configura il traguardo e il premio mostrati allo studente.
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
                    {settingsSaving ? 'Salvataggio...' : 'Salva Obiettivi'}
                  </button>
                </div>
            )}
          </GlassCard>
        )}

        {activeTab === 'esercizi' && (
          <>
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
                <ul className="mt-5 space-y-4">
                    {levels.map((level) => (
                      <li
                        key={level.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {level.title}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {level.groupName}
                          </p>
                          <p className="truncate font-serif text-xs italic text-slate-500">
                            {level.analysis.frase_originale}
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
                      </li>
                    ))}
                </ul>
              )}
            </GlassCard>
          </>
        )}
      </main>
    </AppLayout>
  )
}
