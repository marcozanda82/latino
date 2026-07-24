import { Wand2 } from 'lucide-react'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import type { StuckExercise } from '../services/forceCompleteExerciseService'

interface StuckExercisesPanelProps {
  exercises: StuckExercise[]
  loading: boolean
  forcingId: string | null
  onForceComplete: (item: StuckExercise) => void
}

export function StuckExercisesPanel({
  exercises,
  loading,
  forcingId,
  onForceComplete,
}: StuckExercisesPanelProps) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
          Recupero esercizi
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-800">
          Esercizi in corso bloccati
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Esercizi avviati dallo studente ma non consegnati. Usa il force
          complete per inviarli subito in valutazione.
        </p>
      </div>

      {loading ? (
        <LevelCardsSkeleton count={2} />
      ) : exercises.length === 0 ? (
        <GlassCard className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 text-center">
          <p className="text-sm font-medium text-emerald-800">
            Nessun esercizio bloccato in corso.
          </p>
        </GlassCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {exercises.map((item) => {
            const isForcing = forcingId === item.exerciseId

            return (
              <li key={`${item.type}-${item.exerciseId}`}>
                <GlassCard className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            'rounded-full border px-2.5 py-1 text-xs font-semibold',
                            item.type === 'version'
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-white text-slate-600',
                          ].join(' ')}
                        >
                          {item.type === 'version' ? 'Versione' : 'Frase'}
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          In corso
                        </span>
                      </div>

                      <p className="mt-3 text-base font-semibold text-slate-800">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.progressLabel}
                      </p>
                      <p className="mt-3 line-clamp-2 font-serif text-sm italic text-slate-600">
                        {item.preview}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onForceComplete(item)}
                      disabled={forcingId !== null}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-violet-300 bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors can-hover:hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Wand2 className="h-4 w-4" aria-hidden />
                      {isForcing ? 'Forzatura…' : 'Forza Completamento'}
                    </button>
                  </div>
                </GlassCard>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
