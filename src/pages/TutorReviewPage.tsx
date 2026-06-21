import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TutorDashboard } from '../components/TutorDashboard'
import type {
  EvaluationStatus,
  PendingTranslation,
} from '../types/evaluation'
import { AppLayout } from '../components/layout/AppLayout'
import { showError, showSuccess } from '../lib/toast'
import { clearTutorAuthentication } from '../services/tutorAuthService'
import {
  subscribeToPendingEvaluations,
  updateEvaluationStatus,
} from '../services/firebaseEvaluations'

const STATUS_SUCCESS_LABELS: Record<
  Exclude<EvaluationStatus, 'in_attesa'>,
  string
> = {
  verde: 'Traduzione segnata come corretta.',
  giallo: 'Traduzione segnata come parziale.',
  rosso: 'Traduzione segnata come errata.',
}

export function TutorReviewPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingTranslation[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToPendingEvaluations(setPending)
    return unsubscribe
  }, [])

  const handleEvaluate = useCallback(
    async (
      id: string,
      status: EvaluationStatus,
      bonusScore: number,
      mechanicalScore: number,
    ) => {
      if (status === 'in_attesa') return

      const totalScore = mechanicalScore + bonusScore

      try {
        await updateEvaluationStatus(id, status, bonusScore, totalScore)
        showSuccess(
          `${STATUS_SUCCESS_LABELS[status]} Voto finale: ${totalScore}/100.`,
        )
      } catch (error) {
        console.error('[TutorReviewPage] handleEvaluate failed:', error)
        showError('Impossibile salvare la valutazione. Riprova.')
      }
    },
    [],
  )

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
            onClick={handleExitToStudent}
            className="mt-5 w-full rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
          >
            Esci e torna alla Modalità Studente
          </button>
        </div>
      }
    >
      <TutorDashboard
        pendingTranslations={pending}
        onEvaluate={handleEvaluate}
      />
    </AppLayout>
  )
}
