import {
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import type { StudentTransaction } from '../types/transaction'
import { getStudentTransactionsCollectionRef } from './studentFinancePaths'

function mapDocToTransaction(
  id: string,
  data: Record<string, unknown>,
): StudentTransaction | null {
  const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount)
  const description =
    typeof data.description === 'string' ? data.description.trim() : ''
  const type = data.type === 'earn' || data.type === 'spend' ? data.type : null

  if (!Number.isFinite(amount) || amount === 0 || !description || !type) {
    console.warn('[transactionService] Documento transazione ignorato:', {
      id,
      amount: data.amount,
      type: data.type,
      description: data.description,
    })
    return null
  }

  return {
    id,
    amount,
    description,
    type,
    timestamp: data.timestamp as Timestamp | undefined,
  }
}

function mapAndSortTransactions(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): StudentTransaction[] {
  return docs
    .map((docSnap) => mapDocToTransaction(docSnap.id, docSnap.data()))
    .filter((item): item is StudentTransaction => item !== null)
    .sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() ?? 0
      const bTime = b.timestamp?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

export function subscribeToTransactions(
  callback: (transactions: StudentTransaction[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const collectionRef = getStudentTransactionsCollectionRef()
  const transactionsQuery = query(
    collectionRef,
    orderBy('timestamp', 'desc'),
  )

  let fallbackUnsubscribe: (() => void) | null = null

  const unsubscribe = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      console.log(
        '[transactionService] Transazioni caricate:',
        snapshot.docs.length,
      )
      callback(mapAndSortTransactions(snapshot.docs))
    },
    (error) => {
      console.error(
        '[transactionService] subscribeToTransactions (ordered) failed:',
        error,
      )
      onError?.(error)

      fallbackUnsubscribe = onSnapshot(
        collectionRef,
        (snapshot) => {
          console.log(
            '[transactionService] Transazioni caricate (fallback):',
            snapshot.docs.length,
          )
          callback(mapAndSortTransactions(snapshot.docs))
        },
        (fallbackError) => {
          console.error(
            '[transactionService] subscribeToTransactions (fallback) failed:',
            fallbackError,
          )
          onError?.(fallbackError)
          callback([])
        },
      )
    },
  )

  return () => {
    unsubscribe()
    fallbackUnsubscribe?.()
  }
}
