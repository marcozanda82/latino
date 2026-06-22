import { useCallback, useEffect, useState } from 'react'
import { showError, showSuccess } from '../lib/toast'
import {
  resetEvaluation,
  subscribeToAllEvaluations,
  subscribeToPendingEvaluations,
  updateEvaluationStatus,
} from '../services/firebaseEvaluations'
import type { EvaluationStatus, PendingTranslation } from '../types/evaluation'

const STATUS_SUCCESS_LABELS: Record<
  Exclude<EvaluationStatus, 'in_attesa'>,
  string
> = {
  approved: 'Traduzione auto-convalidata.',
  verde: 'Traduzione segnata come corretta.',
  giallo: 'Traduzione segnata come parziale.',
  rosso: 'Traduzione segnata come errata.',
}

export function usePendingEvaluations() {
  const [allEvaluations, setAllEvaluations] = useState<PendingTranslation[]>([])
  const [pending, setPending] = useState<PendingTranslation[]>([])
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribeAll = subscribeToAllEvaluations(setAllEvaluations)
    const unsubscribePending = subscribeToPendingEvaluations(setPending)
    return () => {
      unsubscribeAll()
      unsubscribePending()
    }
  }, [])

  const handleEvaluate = useCallback(
    async (
      id: string,
      status: EvaluationStatus,
      bonusScore: number,
      mechanicalScore: number,
    ) => {
      if (status === 'in_attesa' || evaluatingId || resettingId) return

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
    [evaluatingId, resettingId],
  )

  const handleReset = useCallback(
    async (id: string, reverseReward: boolean) => {
      if (evaluatingId || resettingId) return

      setResettingId(id)

      try {
        await resetEvaluation(id, { reverseReward })
        showSuccess(
          reverseReward
            ? 'Esercizio sbloccato e Sesterzi stornati.'
            : 'Esercizio sbloccato. Lo studente può rifarlo dalla Home.',
        )
      } catch (error) {
        console.error('[usePendingEvaluations] handleReset failed:', error)
        showError('Impossibile sbloccare l\'esercizio. Riprova.')
      } finally {
        setResettingId(null)
      }
    },
    [evaluatingId, resettingId],
  )

  return {
    allEvaluations,
    pending,
    pendingCount: pending.length,
    evaluatingId,
    resettingId,
    handleEvaluate,
    handleReset,
  }
}
