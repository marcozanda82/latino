import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import {
  createStudentTransactionDocRef,
  getStudentBalanceDocPath,
  getStudentDocRef,
  getStudentTransactionsCollectionRef,
  getStudentUserId,
} from './studentFinancePaths'

export const LEGACY_BALANCE_ALIGNMENT_ID = 'legacy-balance-alignment'
export const LEGACY_BALANCE_DESCRIPTION = 'Saldo precedente (Allineamento)'

export {
  DEFAULT_STUDENT_ID,
  getStudentBalanceDocPath,
  getStudentUserId,
} from './studentFinancePaths'

export interface StudentProfile {
  balance: number
}

function normalizeBalance(value: unknown): number {
  const balance = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(balance) ? balance : 0
}

export async function ensureStudentProfile(): Promise<StudentProfile> {
  const studentRef = getStudentDocRef()
  const snapshot = await getDoc(studentRef)

  if (!snapshot.exists()) {
    await setDoc(studentRef, { balance: 0 })
    return { balance: 0 }
  }

  const balance = normalizeBalance(snapshot.data()?.balance)
  if (snapshot.data()?.balance === undefined) {
    await setDoc(studentRef, { balance: 0 }, { merge: true })
    return { balance: 0 }
  }

  return { balance }
}

export function subscribeToStudentBalance(
  callback: (balance: number) => void,
): () => void {
  const studentRef = getStudentDocRef()
  const docPath = getStudentBalanceDocPath()

  return onSnapshot(
    studentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        void ensureStudentProfile().catch((error) => {
          console.error(
            '[studentService] ensureStudentProfile failed during subscribe:',
            { docPath, error },
          )
        })
        callback(0)
        return
      }

      callback(normalizeBalance(snapshot.data()?.balance))
    },
    (error) => {
      console.error('[studentService] subscribeToStudentBalance failed:', {
        docPath,
        error,
      })
      callback(0)
    },
  )
}

export async function alignLegacyBalanceTransaction(
  balance: number,
): Promise<boolean> {
  if (!Number.isFinite(balance) || balance <= 0) {
    return false
  }

  const legacyRef = doc(
    getStudentTransactionsCollectionRef(),
    LEGACY_BALANCE_ALIGNMENT_ID,
  )
  const existing = await getDoc(legacyRef)

  if (existing.exists()) {
    return false
  }

  await setDoc(legacyRef, {
    amount: balance,
    type: 'earn',
    description: LEGACY_BALANCE_DESCRIPTION,
    timestamp: serverTimestamp(),
  })

  console.log('[studentService] alignLegacyBalanceTransaction OK:', {
    balance,
    path: `${getStudentBalanceDocPath()}/transactions/${LEGACY_BALANCE_ALIGNMENT_ID}`,
  })

  return true
}

async function commitEarnTransaction(
  amount: number,
  description: string,
): Promise<void> {
  await ensureStudentProfile()

  const studentRef = getStudentDocRef()
  const txRef = createStudentTransactionDocRef()
  const batch = writeBatch(db)

  batch.update(studentRef, {
    balance: increment(amount),
  })
  batch.set(txRef, {
    amount,
    type: 'earn',
    description: description.trim(),
    timestamp: serverTimestamp(),
  })

  await batch.commit()
}

export async function creditSesterzi(
  amount: number,
  description: string,
): Promise<void> {
  const userId = getStudentUserId()

  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn('[studentService] creditSesterzi — importo non valido:', amount)
    return
  }

  const trimmedDescription =
    description.trim() || 'Ricompensa per traduzione completata'

  try {
    await commitEarnTransaction(amount, trimmedDescription)

    console.log('[studentService] creditSesterzi OK:', {
      userId,
      amount,
      path: `${getStudentBalanceDocPath()}/transactions`,
    })
  } catch (error) {
    console.error('[studentService] creditSesterzi failed:', {
      userId,
      amount,
      error,
    })
    throw error
  }
}

export async function addSesterzi(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn('[studentService] addSesterzi — importo non valido:', amount)
    return
  }

  try {
    await commitEarnTransaction(amount, 'Traduzione completata')
  } catch (error) {
    console.error('[studentService] addSesterzi failed:', { amount, error })
    throw error
  }
}

export async function debitSesterzi(
  amount: number,
  description: string,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Importo non valido.')
  }

  const trimmedDescription = description.trim()
  if (!trimmedDescription) {
    throw new Error('Descrizione transazione mancante.')
  }

  const studentRef = getStudentDocRef()

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(studentRef)

    if (!snapshot.exists()) {
      throw new Error('Saldo insufficiente.')
    }

    const balance = normalizeBalance(snapshot.data()?.balance)

    if (balance < amount) {
      throw new Error('Saldo insufficiente.')
    }

    transaction.update(studentRef, {
      balance: increment(-amount),
    })

    transaction.set(createStudentTransactionDocRef(), {
      amount: -amount,
      type: 'spend',
      description: trimmedDescription,
      timestamp: serverTimestamp(),
    })
  })
}

export async function reverseSesterziCredit(
  amount: number,
  description: string,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Importo rettifica non valido.')
  }

  const studentRef = getStudentDocRef()

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(studentRef)

    if (!snapshot.exists()) {
      throw new Error('Profilo studente non trovato.')
    }

    transaction.update(studentRef, {
      balance: increment(-amount),
    })

    transaction.set(createStudentTransactionDocRef(), {
      amount: -amount,
      type: 'earn',
      description: description.trim(),
      timestamp: serverTimestamp(),
    })
  })
}

export async function purchaseReward(
  cost: number,
  rewardName: string,
): Promise<void> {
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error('Costo premio non valido.')
  }

  await debitSesterzi(cost, `Acquisto premio: ${rewardName}`)
}

export { getStudentTransactionsCollectionRef } from './studentFinancePaths'
