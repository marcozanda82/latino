import { useCallback, useState } from 'react'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import { ManualBonusModal } from './ManualBonusModal'
import { showError, showSuccess } from '../lib/toast'
import { revertTransaction } from '../services/transactionService'
import { useStudentBalance } from '../hooks/useStudentBalance'
import { useStudentTransactions } from '../hooks/useStudentTransactions'
import {
  getTransactionStatusLabel,
  isTransactionReverted,
} from '../types/transaction'
import {
  formatTransactionAmount,
  formatTransactionTimestamp,
} from '../utils/transactionDisplay'

export function TutorTransactionsManager() {
  const { balance } = useStudentBalance()
  const { transactions, loading, error } = useStudentTransactions()
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [bonusModalOpen, setBonusModalOpen] = useState(false)

  const handleBonusSuccess = useCallback(() => {
    showSuccess('Sesterzi assegnati con successo!')
  }, [])

  const handleRevert = useCallback(
    async (transactionId: string, amount: number, description: string) => {
      const confirmed = window.confirm(
        `Annullare questa transazione?\n\n${description}\n${formatTransactionAmount(amount)}\n\nIl saldo dello studente verrà aggiornato di conseguenza.`,
      )
      if (!confirmed) return

      setRevertingId(transactionId)

      try {
        await revertTransaction(transactionId, amount)
        showSuccess('Transazione annullata e saldo aggiornato.')
      } catch (revertError) {
        console.error('[TutorTransactionsManager] revert failed:', revertError)
        showError('Impossibile annullare la transazione. Riprova.')
      } finally {
        setRevertingId(null)
      }
    },
    [],
  )

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Gestione economia
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-800">
          Estratto conto studente
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Visualizza e annulla transazioni errate. Lo storno aggiorna il saldo e
          marca la voce come annullata nello storico di Elisa.
        </p>
      </div>

      <GlassCard className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/90 !p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
              Saldo attuale studente
            </p>
            <p className="mt-2 font-serif text-3xl font-bold tabular-nums text-amber-900">
              {balance.toLocaleString('it-IT')} Sesterzi
            </p>
          </div>

          <button
            type="button"
            onClick={() => setBonusModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-violet-300 bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors can-hover:hover:bg-violet-700"
          >
            🎁 Assegna Bonus Sesterzi
          </button>
        </div>
      </GlassCard>

      <ManualBonusModal
        isOpen={bonusModalOpen}
        onClose={() => setBonusModalOpen(false)}
        onSuccess={handleBonusSuccess}
      />

      {error ? (
        <GlassCard className="border-rose-200 bg-rose-50/80 py-8 text-center">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </GlassCard>
      ) : null}

      {loading ? (
        <LevelCardsSkeleton count={4} />
      ) : transactions.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-sm text-slate-600">
            Nessuna transazione registrata.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Descrizione</th>
                  <th className="px-5 py-3">Importo</th>
                  <th className="px-5 py-3">Stato</th>
                  <th className="px-5 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const reverted = isTransactionReverted(tx)
                  const isEarn = tx.amount >= 0

                  return (
                    <tr
                      key={tx.id}
                      className={reverted ? 'bg-slate-50/80 opacity-70' : ''}
                    >
                      <td className="px-5 py-4 align-top text-xs tabular-nums text-slate-500">
                        {formatTransactionTimestamp(tx.timestamp)}
                      </td>
                      <td
                        className={[
                          'px-5 py-4 align-top font-medium text-slate-800',
                          reverted ? 'line-through opacity-60' : '',
                        ].join(' ')}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {tx.type === 'manual_bonus' ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                              Bonus tutor
                            </span>
                          ) : null}
                          <span>{tx.description}</span>
                        </div>
                      </td>
                      <td
                        className={[
                          'px-5 py-4 align-top font-bold tabular-nums',
                          reverted
                            ? 'text-slate-400 line-through'
                            : isEarn
                              ? 'text-emerald-700'
                              : 'text-rose-700',
                        ].join(' ')}
                      >
                        {formatTransactionAmount(tx.amount)}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                            reverted
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-emerald-100 text-emerald-800',
                          ].join(' ')}
                        >
                          {getTransactionStatusLabel(tx)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        {!reverted ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleRevert(tx.id, tx.amount, tx.description)
                            }
                            disabled={revertingId !== null}
                            className="cursor-pointer rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors can-hover:hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {revertingId === tx.id
                              ? 'Storno…'
                              : 'Annulla transazione'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </section>
  )
}
