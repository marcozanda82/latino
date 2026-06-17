import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LatinAnalysis } from '../types'
import {
  createLevel,
  deleteLevel,
  fetchLevels,
  type Level,
} from '../services/exerciseService'

interface ExerciseContextValue {
  levels: Level[]
  loading: boolean
  saving: boolean
  refreshLevels: () => Promise<void>
  addLevel: (
    title: string,
    analysis: LatinAnalysis,
    groupName: string,
  ) => Promise<Level>
  removeLevel: (id: string) => Promise<void>
}

const ExerciseContext = createContext<ExerciseContextValue | null>(null)

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refreshLevels = useCallback(async () => {
    const data = await fetchLevels()
    setLevels(data)
  }, [])

  useEffect(() => {
    refreshLevels().finally(() => setLoading(false))
  }, [refreshLevels])

  const addLevel = useCallback(
    async (title: string, analysis: LatinAnalysis, groupName: string) => {
      setSaving(true)
      try {
        const level = await createLevel(title, analysis, groupName)
        await refreshLevels()
        return level
      } finally {
        setSaving(false)
      }
    },
    [refreshLevels],
  )

  const removeLevel = useCallback(
    async (id: string) => {
      setSaving(true)
      try {
        await deleteLevel(id)
        await refreshLevels()
      } finally {
        setSaving(false)
      }
    },
    [refreshLevels],
  )

  const value = useMemo(
    () => ({
      levels,
      loading,
      saving,
      refreshLevels,
      addLevel,
      removeLevel,
    }),
    [levels, loading, saving, refreshLevels, addLevel, removeLevel],
  )

  return (
    <ExerciseContext.Provider value={value}>
      {children}
    </ExerciseContext.Provider>
  )
}

export function useExercises() {
  const context = useContext(ExerciseContext)
  if (!context) {
    throw new Error('useExercises deve essere usato dentro ExerciseProvider')
  }
  return context
}
