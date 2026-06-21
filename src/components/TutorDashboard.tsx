import { motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'

type EvaluationStatus = 'in_attesa' | 'verde' | 'giallo' | 'rosso'

interface PendingTranslation {
  id: string
  fraseOriginale: string
  traduzioneAttesa: string
  traduzioneStudente: string
  status: EvaluationStatus
}

interface TutorDashboardProps {
  pendingTranslations: PendingTranslation[]
  onEvaluate: (id: string, status: EvaluationStatus) => void
}

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  in_attesa: 'In attesa',
  verde: 'Corretta',
  giallo: 'Parziale',
  rosso: 'Errata',
}

const STATUS_STYLES: Record<
  EvaluationStatus,
  { badge: string; border: string }
> = {
  in_attesa: {
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    border: 'border-slate-200',
  },
  verde: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
  },
  giallo: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    border: 'border-amber-200',
  },
  rosso: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    border: 'border-rose-200',
  },
}

const EVALUATION_ACTIONS: Array<{
  status: Exclude<EvaluationStatus, 'in_attesa'>
  label: string
  className: string
}> = [
  {
    status: 'verde',
    label: 'Corretta',
    className:
      'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600',
  },
  {
    status: 'giallo',
    label: 'Parziale',
    className:
      'border-amber-400 bg-amber-400 text-white hover:bg-amber-500',
  },
  {
    status: 'rosso',
    label: 'Errata',
    className: 'border-rose-500 bg-rose-500 text-white hover:bg-rose-600',
  },
]

export function TutorDashboard({
  pendingTranslations,
  onEvaluate,
}: TutorDashboardProps) {
  const awaitingCount = pendingTranslations.filter(
    (item) => item.status === 'in_attesa',
  ).length

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Valutazioni
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-800">
          Traduzioni degli studenti
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Confronta la traduzione inserita dallo studente con quella attesa
          dall&apos;esercizio e assegna un giudizio.
        </p>
        {pendingTranslations.length > 0 && (
          <p className="mt-3 text-sm font-medium text-slate-600">
            {awaitingCount > 0
              ? `${awaitingCount} traduzione${awaitingCount === 1 ? '' : 'i'} da valutare`
              : 'Tutte le traduzioni sono state valutate.'}
          </p>
        )}
      </div>

      {pendingTranslations.length === 0 ? (
        <GlassCard className="rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nessuna traduzione in attesa di valutazione.
          </p>
        </GlassCard>
      ) : (
        <ul className="flex flex-col gap-4">
          {pendingTranslations.map((item, index) => {
            const styles = STATUS_STYLES[item.status]
            const isPending = item.status === 'in_attesa'

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 26,
                  delay: index * 0.04,
                }}
              >
                <GlassCard
                  as="article"
                  className={`rounded-xl border p-6 ${styles.border}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Frase latina
                      </p>
                      <p className="mt-1 text-base font-medium text-slate-800">
                        {item.fraseOriginale}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Traduzione attesa
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {item.traduzioneAttesa}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Traduzione studente
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {item.traduzioneStudente}
                      </p>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {EVALUATION_ACTIONS.map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          onClick={() => onEvaluate(item.id, action.status)}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${action.className}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">
                      Valutazione registrata:{' '}
                      <span className="font-medium text-slate-700">
                        {STATUS_LABELS[item.status]}
                      </span>
                    </p>
                  )}
                </GlassCard>
              </motion.li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export type { EvaluationStatus, PendingTranslation, TutorDashboardProps }
