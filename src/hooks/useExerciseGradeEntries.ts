import { useEffect, useMemo, useState } from 'react'
import { useExercises } from '../context/ExerciseContext'
import { useStudentTransactions } from './useStudentTransactions'
import { subscribeToStudentEvaluations } from '../services/firebaseEvaluations'
import type { PendingTranslation } from '../types/evaluation'
import { buildExerciseGradeEntries } from '../utils/exerciseTransactions'
import { calculateAverageSchoolGrade } from '../utils/grades'

export function useExerciseGradeEntries() {
  const { levels } = useExercises()
  const { transactions, loading: transactionsLoading, error } =
    useStudentTransactions()
  const [evaluations, setEvaluations] = useState<PendingTranslation[]>([])

  useEffect(() => {
    return subscribeToStudentEvaluations(setEvaluations)
  }, [])

  const gradeEntries = useMemo(
    () => buildExerciseGradeEntries(transactions, levels, evaluations),
    [transactions, levels, evaluations],
  )

  const averageGrade = useMemo(
    () => calculateAverageSchoolGrade(gradeEntries.map((entry) => entry.grade)),
    [gradeEntries],
  )

  return {
    gradeEntries,
    averageGrade,
    loading: transactionsLoading,
    error,
  }
}
