import { useEffect, useRef, useState } from 'react'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import { alignLegacyBalanceTransaction } from '../services/studentService'
import { useStudentBalance } from '../hooks/useStudentBalance'
import { useStudentTransactions } from '../hooks/useStudentTransactions'

function formatTimestamp(value?: { toDate?: () => Date }): string {
  if (!value?.toDate) return '—'
  return value.toDate().toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StudentBankStatement() {
  const { balance, loading: balanceLoading } = useStudentBalance()
  const { transactions, loading: transactionsLoading, error } =
    useStudentTransactions()
  const [aligningLegacy, setAligningLegacy] = useState(false)
  const alignAttemptedRef = useRef(false)

  const loading = balanceLoading || transactionsLoading || aligningLegacy

  useEffect(() => {
    if (balanceLoading || transactionsLoading || alignAttemptedRef.current) {
      return
    }

    if (balance <= 0 || transactions.length > 0 || error) {
      return
    }

    alignAttemptedRef.current = true
    setAligningLegacy(true)

    void alignLegacyBalanceTransaction(balance)
      .catch((alignError) => {
        console.error(
          '[StudentBankStatement] alignLegacyBalanceTransaction failed:',
          alignError,
        )
        alignAttemptedRef.current = false
      })
      .finally(() => {
        setAligningLegacy(false)
      })
  }, [balance, balanceLoading, transactions.length, transactionsLoading, error])

  return (
    <section className="space-y-8">
      <GlassCard className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white/90 !p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
          Saldo attuale
        </p>
        <p className="mt-3 font-serif text-4xl font-bold tabular-nums text-amber-900 sm:text-5xl">
          {balance.toLocaleString('it-IT')} Sesterzi
        </p>
      </GlassCard>

      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
          Estratto conto
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Cronologia di guadagni e spese in Sesterzi, ordine dal più recente.
        </p>
      </div>

      {error ? (
        <GlassCard className="border-rose-200 bg-rose-50/80 py-8 text-center">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </GlassCard>
      ) : null}

      {loading ? (
        <LevelCardsSkeleton count={3} />
      ) : transactions.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-sm text-slate-600">
            Nessuna transazione registrata.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            I guadagni dalle traduzioni e gli acquisti nel negozio compariranno
            qui.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden !p-0">
          <ul className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isEarn = tx.amount >= 0

              return (
                <li
                  key={tx.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <p className="text-xs font-medium tabular-nums text-slate-500">
                    {formatTimestamp(tx.timestamp)}
                  </p>
                  <p className="min-w-0 text-sm font-medium text-slate-800">
                    {tx.description}
                  </p>
                  <p
                    className={[
                      'text-sm font-bold tabular-nums sm:text-right',
                      isEarn ? 'text-emerald-700' : 'text-rose-700',
                    ].join(' ')}
                  >
                    {isEarn ? '+' : '−'}
                    {Math.abs(tx.amount).toLocaleString('it-IT')} Sesterzi
                  </p>
                </li>
              )
            })}
          </ul>
        </GlassCard>
      )}
    </section>
  )
}
