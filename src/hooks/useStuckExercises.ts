import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Level } from '../services/exerciseService'
import {
  forceCompleteExercise,
  listStuckExercises,
  type StuckExercise,
} from '../services/forceCompleteExerciseService'
import type { PendingTranslation } from '../types/evaluation'
import { getSubmittedLevelIds } from '../utils/studentEvaluations'
import { showError, showSuccess } from '../lib/toast'

export function useStuckExercises(
  levels: Level[],
  evaluations: PendingTranslation[],
) {
  const [stuckExercises, setStuckExercises] = useState<StuckExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [forcingId, setForcingId] = useState<string | null>(null)

  const submittedLevelIds = useMemo(
    () => getSubmittedLevelIds(evaluations, levels),
    [evaluations, levels],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listStuckExercises(levels, submittedLevelIds)
      setStuckExercises(items)
    } catch (error) {
      console.error('[useStuckExercises] refresh failed:', error)
      setStuckExercises([])
    } finally {
      setLoading(false)
    }
  }, [levels, submittedLevelIds])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleForceComplete = useCallback(
    async (item: StuckExercise) => {
      const level = levels.find((entry) => entry.id === item.exerciseId)
      if (!level) {
        showError('Livello non trovato.')
        return
      }

      const confirmed = window.confirm(
        `Forzare il completamento di "${item.title}"?\n\nL'esercizio passerà in attesa di valutazione e comparirà nella coda del tutor.`,
      )
      if (!confirmed) return

      setForcingId(item.exerciseId)

      try {
        await forceCompleteExercise(item.exerciseId, item.type, level)
        showSuccess('Esercizio forzato in attesa di valutazione.')
        await refresh()
      } catch (error) {
        console.error('[useStuckExercises] force complete failed:', error)
        showError(
          error instanceof Error
            ? error.message
            : 'Impossibile forzare il completamento. Riprova.',
        )
      } finally {
        setForcingId(null)
      }
    },
    [levels, refresh],
  )

  return {
    stuckExercises,
    loading,
    forcingId,
    refresh,
    handleForceComplete,
  }
}
