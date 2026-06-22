import { useNavigate } from 'react-router-dom'
import { TutorDashboard } from '../components/TutorDashboard'
import { AppLayout } from '../components/layout/AppLayout'
import { usePendingEvaluations } from '../hooks/usePendingEvaluations'
import { clearTutorAuthentication } from '../services/tutorAuthService'

export function TutorReviewPage() {
  const navigate = useNavigate()
  const {
    allEvaluations,
    evaluatingId,
    resettingId,
    handleEvaluate,
    handleReset,
  } = usePendingEvaluations()

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
            Valutazione traduzioni
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Confronta le traduzioni degli studenti con quelle attese dagli
            esercizi e assegna un giudizio.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors can-hover:hover:bg-slate-50 sm:mr-3 sm:w-auto"
          >
            Torna alla plancia
          </button>
          <button
            type="button"
            onClick={handleExitToStudent}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors can-hover:hover:bg-slate-50 sm:mt-4 sm:w-auto"
          >
            Esci e torna alla Modalità Studente
          </button>
        </div>
      }
    >
      <TutorDashboard
        evaluations={allEvaluations}
        evaluatingId={evaluatingId}
        resettingId={resettingId}
        onEvaluate={handleEvaluate}
        onReset={handleReset}
      />
    </AppLayout>
  )
}
