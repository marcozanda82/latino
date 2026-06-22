import { useCallback, useEffect, useState } from 'react'
import { showError, showSuccess } from '../lib/toast'
import {
  subscribeToPendingEvaluations,
  updateEvaluationStatus,
} from '../services/firebaseEvaluations'
import type { EvaluationStatus, PendingTranslation } from '../types/evaluation'

const STATUS_SUCCESS_LABELS: Record<
  Exclude<EvaluationStatus, 'in_attesa'>,
  string
> = {
  verde: 'Traduzione segnata come corretta.',
  giallo: 'Traduzione segnata come parziale.',
  rosso: 'Traduzione segnata come errata.',
}

export function usePendingEvaluations() {
  const [pending, setPending] = useState<PendingTranslation[]>([])
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToPendingEvaluations((frasi) => {
      console.log('[TUTOR DEBUG] Frasi caricate nel dashboard:', frasi)
      setPending(frasi)
    })
    return unsubscribe
  }, [])

  const handleEvaluate = useCallback(
    async (
      id: string,
      status: EvaluationStatus,
      bonusScore: number,
      mechanicalScore: number,
    ) => {
      if (status === 'in_attesa' || evaluatingId) return

      const totalScore = mechanicalScore + bonusScore

      setEvaluatingId(id)

      try {
        await updateEvaluationStatus(id, status, bonusScore, totalScore)
        showSuccess(
          `${STATUS_SUCCESS_LABELS[status]} Voto finale: ${totalScore}/100.`,
        )
      } catch (error) {
        console.error('[usePendingEvaluations] handleEvaluate failed:', error)
        showError('Impossibile salvare la valutazione. Riprova.')
      } finally {
        setEvaluatingId(null)
      }
    },
    [evaluatingId],
  )

  return {
    pending,
    pendingCount: pending.length,
    evaluatingId,
    handleEvaluate,
  }
}
