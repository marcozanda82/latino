import {
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import type {
  StudentTransaction,
  TransactionStatus,
} from '../types/transaction'
import {
  getStudentDocRef,
  getStudentTransactionDocRef,
  getStudentTransactionsCollectionRef,
} from './studentFinancePaths'

function normalizeStatus(value: unknown): TransactionStatus {
  return value === 'reverted' ? 'reverted' : 'active'
}

function mapDocToTransaction(
  id: string,
  data: Record<string, unknown>,
): StudentTransaction | null {
  const amount = typeof data.amount === 'number' ? data.amount : Number(data.amount)
  const type =
    data.type === 'earn' ||
    data.type === 'spend' ||
    data.type === 'manual_bonus'
      ? data.type
      : null
  const description =
    typeof data.description === 'string'
      ? data.description.trim()
      : typeof data.reason === 'string'
        ? data.reason.trim()
        : ''

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
    status: normalizeStatus(data.status),
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

export async function revertTransaction(
  transactionId: string,
  amount: number,
): Promise<void> {
  if (!transactionId.trim()) {
    throw new Error('ID transazione mancante.')
  }

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Importo transazione non valido.')
  }

  const txRef = getStudentTransactionDocRef(transactionId)
  const snapshot = await getDoc(txRef)

  if (!snapshot.exists()) {
    throw new Error('Transazione non trovata.')
  }

  const storedAmount =
    typeof snapshot.data()?.amount === 'number'
      ? snapshot.data()?.amount
      : Number(snapshot.data()?.amount)

  if (!Number.isFinite(storedAmount) || storedAmount === 0) {
    throw new Error('Importo transazione non valido.')
  }

  if (snapshot.data()?.status === 'reverted') {
    throw new Error('Transazione già annullata.')
  }

  if (storedAmount !== amount) {
    throw new Error('Importo transazione non coerente.')
  }

  const batch = writeBatch(db)
  batch.update(getStudentDocRef(), {
    balance: increment(-amount),
  })
  batch.update(txRef, {
    status: 'reverted' satisfies TransactionStatus,
  })

  await batch.commit()
}
