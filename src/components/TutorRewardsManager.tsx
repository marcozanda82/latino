import { useEffect, useState } from 'react'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import { RewardIcon } from './RewardIcon'
import { showError, showSuccess } from '../lib/toast'
import { useStudentBalance } from '../hooks/useStudentBalance'
import { useRewards } from '../hooks/useRewards'
import {
  createReward,
  deleteReward,
  seedDefaultRewardsIfEmpty,
  setRewardActive,
  updateRewardCost,
} from '../services/rewardsService'

export function TutorRewardsManager() {
  const { balance } = useStudentBalance()
  const { rewards, loading } = useRewards()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    void seedDefaultRewardsIfEmpty()
  }, [])

  useEffect(() => {
    setCostDrafts((current) => {
      const next = { ...current }
      rewards.forEach((reward) => {
        if (next[reward.id] === undefined) {
          next[reward.id] = String(reward.cost)
        }
      })
      return next
    })
  }, [rewards])

  const handleCreate = async () => {
    const cost = Number(newCost)
    if (!newName.trim() || !Number.isFinite(cost) || cost < 0) {
      showError('Inserisci un nome e un costo valido.')
      return
    }

    setCreating(true)
    try {
      await createReward(newName, cost, newImageUrl)
      setNewName('')
      setNewCost('')
      setNewImageUrl('')
      setShowAddForm(false)
      showSuccess('Premio aggiunto allo shop.')
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'Impossibile aggiungere il premio.',
      )
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    setBusyId(id)
    try {
      await setRewardActive(id, !active)
    } catch {
      showError('Impossibile aggiornare lo stato del premio.')
    } finally {
      setBusyId(null)
    }
  }

  const handleCostBlur = async (id: string) => {
    const reward = rewards.find((item) => item.id === id)
    const draft = costDrafts[id]
    if (!reward || draft === undefined) return

    const cost = Number(draft)
    if (!Number.isFinite(cost) || cost < 0) {
      setCostDrafts((current) => ({ ...current, [id]: String(reward.cost) }))
      showError('Costo non valido.')
      return
    }

    if (cost === reward.cost) return

    setBusyId(id)
    try {
      await updateRewardCost(id, cost)
      showSuccess('Costo aggiornato.')
    } catch {
      setCostDrafts((current) => ({ ...current, [id]: String(reward.cost) }))
      showError('Impossibile aggiornare il costo.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Eliminare il premio "${name}"?`)) return

    setBusyId(id)
    try {
      await deleteReward(id)
      showSuccess('Premio eliminato.')
    } catch {
      showError('Impossibile eliminare il premio.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-6">
      <GlassCard className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/90">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
          Saldo studente (Elisa)
        </p>
        <p className="mt-3 font-serif text-4xl font-bold tabular-nums text-amber-900">
          {balance.toLocaleString('it-IT')} Sesterzi
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Usa questo saldo come riferimento quando imposti i costi dei premi
          nello shop.
        </p>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Gestione premi shop
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              I premi attivi compaiono subito nel negozio dello studente. Puoi
              modificarne il costo in tempo reale.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((open) => !open)}
            className="min-h-11 cursor-pointer rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-slate-700"
          >
            {showAddForm ? 'Annulla' : 'Aggiungi nuovo premio'}
          </button>
        </div>

        {showAddForm ? (
          <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="reward-name"
                className="block text-sm font-medium text-slate-700"
              >
                Nome premio
              </label>
              <input
                id="reward-name"
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Es. Pizza, Giornata al mare..."
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label
                htmlFor="reward-cost"
                className="block text-sm font-medium text-slate-700"
              >
                Costo (Sesterzi)
              </label>
              <input
                id="reward-cost"
                type="number"
                min={0}
                value={newCost}
                onChange={(event) => setNewCost(event.target.value)}
                placeholder="Es. 3000"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label
                htmlFor="reward-image"
                className="block text-sm font-medium text-slate-700"
              >
                URL immagine (opzionale)
              </label>
              <input
                id="reward-image"
                type="url"
                value={newImageUrl}
                onChange={(event) => setNewImageUrl(event.target.value)}
                placeholder="https://..."
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="min-h-11 cursor-pointer rounded-lg bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? 'Salvataggio…' : 'Salva premio'}
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6">
            <LevelCardsSkeleton count={2} />
          </div>
        ) : rewards.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            Nessun premio configurato. Aggiungine uno per popolare lo shop.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {rewards.map((reward) => {
              const isBusy = busyId === reward.id
              const isAffordable = balance >= reward.cost

              return (
                <li
                  key={reward.id}
                  className={[
                    'rounded-xl border px-4 py-4',
                    reward.active
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-100 bg-slate-50 opacity-80',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-800">
                          {reward.name}
                        </p>
                        <span
                          className={[
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            reward.active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600',
                          ].join(' ')}
                        >
                          {reward.active ? 'Attivo' : 'Disattivo'}
                        </span>
                        <span
                          className={[
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            isAffordable
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-700',
                          ].join(' ')}
                        >
                          {isAffordable ? 'Raggiungibile' : 'Troppo costoso'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div>
                          <label
                            htmlFor={`reward-cost-${reward.id}`}
                            className="block text-xs font-medium text-slate-500"
                          >
                            Costo Sesterzi
                          </label>
                          <input
                            id={`reward-cost-${reward.id}`}
                            type="number"
                            min={0}
                            value={costDrafts[reward.id] ?? String(reward.cost)}
                            disabled={isBusy}
                            onChange={(event) =>
                              setCostDrafts((current) => ({
                                ...current,
                                [reward.id]: event.target.value,
                              }))
                            }
                            onBlur={() => handleCostBlur(reward.id)}
                            className="mt-1 w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
                          />
                        </div>
                        <RewardIcon reward={reward} size="sm" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleToggleActive(reward.id, reward.active)
                        }
                        className="min-h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors can-hover:hover:bg-slate-50 disabled:opacity-50"
                      >
                        {reward.active ? 'Disattiva' : 'Attiva'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(reward.id, reward.name)}
                        className="min-h-10 cursor-pointer rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition-colors can-hover:hover:bg-rose-50 disabled:opacity-50"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </GlassCard>
    </section>
  )
}
