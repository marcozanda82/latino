import { useEffect, useState } from 'react'
import { subscribeToTransactions } from '../services/transactionService'
import type { StudentTransaction } from '../types/transaction'

export function useStudentTransactions() {
  const [transactions, setTransactions] = useState<StudentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)

    const unsubscribe = subscribeToTransactions(
      (items) => {
        setTransactions(items)
        setLoading(false)
        setError(null)
      },
      (snapshotError) => {
        console.error('[useStudentTransactions] subscription error:', snapshotError)
        setError(
          'Impossibile caricare la cronologia. Verifica le regole Firestore per users/default/transactions.',
        )
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { transactions, loading, error }
}
