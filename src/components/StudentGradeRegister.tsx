import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import { useExerciseGradeEntries } from '../hooks/useExerciseGradeEntries'
import { formatSchoolGrade } from '../utils/grades'
import { formatTransactionTimestamp } from '../utils/transactionDisplay'

export function StudentGradeRegister() {
  const { gradeEntries, averageGrade, loading, error } =
    useExerciseGradeEntries()

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
          Il Mio Registro
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Elenco dei tuoi esercizi completati con voto in decimi.
        </p>
      </div>

      {averageGrade !== null ? (
        <GlassCard className="border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white/90 !p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
            Media Voti
          </p>
          <p className="mt-3 font-serif text-5xl font-bold tabular-nums text-sky-900 sm:text-6xl">
            {formatSchoolGrade(averageGrade)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Calcolata su {gradeEntries.length}{' '}
            {gradeEntries.length === 1 ? 'esercizio' : 'esercizi'} completati
          </p>
        </GlassCard>
      ) : null}

      {error ? (
        <GlassCard className="border-rose-200 bg-rose-50/80 py-8 text-center">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </GlassCard>
      ) : null}

      {loading ? (
        <LevelCardsSkeleton count={4} />
      ) : gradeEntries.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-sm text-slate-600">
            Nessuna valutazione registrata.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Completa un esercizio per vedere qui il tuo voto.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden !p-0">
          <ul className="divide-y divide-slate-100">
            {gradeEntries.map((entry) => (
              <li
                key={entry.transactionId}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto_auto]"
              >
                <p className="text-xs font-medium tabular-nums text-slate-500 sm:pt-0.5">
                  {formatTransactionTimestamp(entry.timestamp)}
                </p>

                <p className="text-sm font-medium text-slate-800">
                  {entry.title}
                </p>

                <p className="text-lg font-bold tabular-nums text-sky-800 sm:text-right">
                  {formatSchoolGrade(entry.grade)}
                </p>

                {entry.levelId ? (
                  <Link
                    to={`/play/${entry.levelId}?mode=review`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50 sm:justify-self-end"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    Vedi Dettaglio
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400 sm:text-right">—</span>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </section>
  )
}
