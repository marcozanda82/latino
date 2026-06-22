import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteExerciseDraft,
  fetchExerciseDraft,
  saveExerciseDraft,
} from '../services/draftService'
import { getStudentUserId } from '../services/studentService'
import type { ExerciseDraftData } from '../types/exerciseDraft'

const SAVE_DEBOUNCE_MS = 400

export function useExerciseDraft(
  exerciseId: string | undefined,
  fraseOriginale: string,
) {
  const [draftReady, setDraftReady] = useState(!exerciseId)
  const [loadedDraft, setLoadedDraft] = useState<ExerciseDraftData | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!exerciseId) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    fetchExerciseDraft(exerciseId).then((draft) => {
      if (cancelled) return
      if (draft && draft.fraseOriginale === fraseOriginale) {
        setLoadedDraft(draft)
      }
      setDraftReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [exerciseId, fraseOriginale])

  const persistDraft = useCallback(
    (draft: ExerciseDraftData) => {
      if (!exerciseId) return

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = window.setTimeout(() => {
        void saveExerciseDraft(exerciseId, draft)
      }, SAVE_DEBOUNCE_MS)
    },
    [exerciseId],
  )

  const clearDraft = useCallback(async () => {
    if (!exerciseId) return
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await deleteExerciseDraft(exerciseId)
    setLoadedDraft(null)
  }, [exerciseId])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const buildDraftPayload = useCallback(
    (state: Omit<ExerciseDraftData, 'userId' | 'exerciseId' | 'fraseOriginale'>) =>
      ({
        userId: getStudentUserId(),
        exerciseId: exerciseId ?? '',
        fraseOriginale,
        ...state,
      }) satisfies ExerciseDraftData,
    [exerciseId, fraseOriginale],
  )

  return {
    draftReady,
    loadedDraft,
    persistDraft,
    clearDraft,
    buildDraftPayload,
  }
}
