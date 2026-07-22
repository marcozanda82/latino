import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { VersionProgress } from '../types/version'
import { getStudentUserId } from '../services/studentService'
import {
  getVersionProgress,
  reconcileVersionProgress,
  saveVersionProgress,
} from '../services/versionProgressService'

interface UseVersionProgressResult {
  progress: VersionProgress | null
  setProgress: Dispatch<SetStateAction<VersionProgress | null>>
  loading: boolean
  error: string | null
  userId: string
  persistProgress: (next: VersionProgress) => Promise<void>
}

export function useVersionProgress(
  levelId: string | undefined,
  segmentIds: number[],
): UseVersionProgressResult {
  const userId = getStudentUserId()
  const [progress, setProgress] = useState<VersionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const segmentKey = [...segmentIds].sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!levelId) {
      setProgress(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const resolvedLevelId = levelId

    async function loadProgress() {
      setLoading(true)
      setError(null)

      try {
        const stored = await getVersionProgress(userId, resolvedLevelId)
        if (cancelled) return

        const reconciled = reconcileVersionProgress(
          stored,
          resolvedLevelId,
          userId,
          segmentIds,
        )
        setProgress(reconciled)

        if (!stored) {
          await saveVersionProgress(userId, resolvedLevelId, reconciled)
        }
      } catch (loadError) {
        console.error('[useVersionProgress] load failed:', loadError)
        if (!cancelled) {
          setError('Impossibile caricare i progressi della versione.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProgress()

    return () => {
      cancelled = true
    }
  }, [levelId, userId, segmentKey])

  const persistProgress = useCallback(
    async (next: VersionProgress) => {
      if (!levelId) return
      setProgress(next)
      await saveVersionProgress(userId, levelId, next)
    },
    [levelId, userId],
  )

  return {
    progress,
    setProgress,
    loading,
    error,
    userId,
    persistProgress,
  }
}
