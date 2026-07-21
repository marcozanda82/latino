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
import type { VersionExercise } from '../types/version'
import {
  createLevel,
  createVersionLevel,
  deleteLevel,
  fetchLevels,
  subscribeToLevels,
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
  addVersionLevel: (
    version: VersionExercise,
    groupName: string,
    customMaxReward?: number,
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
    setLoading(true)

    const unsubscribe = subscribeToLevels(
      (data) => {
        setLevels(data)
        setLoading(false)
      },
      (error) => {
        console.error('[ExerciseContext] subscribeToLevels failed:', error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  const addLevel = useCallback(
    async (title: string, analysis: LatinAnalysis, groupName: string) => {
      setSaving(true)
      try {
        const level = await createLevel(title, analysis, groupName)
        return level
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const addVersionLevel = useCallback(
    async (
      version: VersionExercise,
      groupName: string,
      customMaxReward?: number,
    ) => {
      setSaving(true)
      try {
        return await createVersionLevel(version, groupName, customMaxReward)
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const removeLevel = useCallback(async (id: string) => {
    setSaving(true)
    try {
      await deleteLevel(id)
    } finally {
      setSaving(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      levels,
      loading,
      saving,
      refreshLevels,
      addLevel,
      addVersionLevel,
      removeLevel,
    }),
    [
      levels,
      loading,
      saving,
      refreshLevels,
      addLevel,
      addVersionLevel,
      removeLevel,
    ],
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
