import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const USERS_COLLECTION = 'users'
export const DEFAULT_STUDENT_ID = 'default'

export function getStudentUserId(): string {
  return DEFAULT_STUDENT_ID
}

/** Percorso Firestore usato sia in lettura che in scrittura del saldo. */
export function getStudentBalanceDocPath(): string {
  return `${USERS_COLLECTION}/${getStudentUserId()}`
}

export interface StudentProfile {
  balance: number
}

function getStudentDocRef() {
  return doc(db, USERS_COLLECTION, DEFAULT_STUDENT_ID)
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

  console.log('[studentService] subscribeToStudentBalance — lettura da:', docPath)

  return onSnapshot(
    studentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        console.log(
          '[studentService] subscribeToStudentBalance — documento assente, creazione profilo:',
          docPath,
        )
        void ensureStudentProfile().catch((error) => {
          console.error(
            '[studentService] ensureStudentProfile failed during subscribe:',
            { docPath, error },
          )
        })
        callback(0)
        return
      }

      const balance = normalizeBalance(snapshot.data()?.balance)
      console.log('[studentService] subscribeToStudentBalance — saldo letto:', {
        docPath,
        balance,
      })
      callback(balance)
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

export async function addSesterzi(amount: number): Promise<void> {
  const userId = getStudentUserId()
  const docPath = getStudentBalanceDocPath()

  console.log('[studentService] addSesterzi — preparazione incremento:', {
    userId,
    docPath,
    amount,
  })

  if (!Number.isFinite(amount) || amount <= 0) {
    console.warn(
      '[studentService] addSesterzi — importo non valido, incremento saltato:',
      amount,
    )
    return
  }

  try {
    await ensureStudentProfile()

    console.log('[studentService] addSesterzi — updateDoc increment su:', docPath)

    await updateDoc(getStudentDocRef(), {
      balance: increment(amount),
    })

    console.log('Saldo aggiornato con successo per:', userId, 'Valore:', amount)
  } catch (error) {
    console.error('[studentService] addSesterzi failed:', {
      userId,
      docPath,
      amount,
      error,
    })
    throw error
  }
}

export async function purchaseReward(cost: number): Promise<void> {
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error('Costo premio non valido.')
  }

  const studentRef = getStudentDocRef()

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(studentRef)

    if (!snapshot.exists()) {
      transaction.set(studentRef, { balance: 0 })
      throw new Error('Saldo insufficiente.')
    }

    const balance = normalizeBalance(snapshot.data()?.balance)

    if (balance < cost) {
      throw new Error('Saldo insufficiente.')
    }

    transaction.update(studentRef, {
      balance: increment(-cost),
    })
  })
}
