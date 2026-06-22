import { collection, doc } from 'firebase/firestore'
import { db } from '../config/firebase'

export const USERS_COLLECTION = 'users'
export const DEFAULT_STUDENT_ID = 'default'
export const TRANSACTIONS_SUBCOLLECTION = 'transactions'

export function getStudentUserId(): string {
  return DEFAULT_STUDENT_ID
}

export function getStudentBalanceDocPath(): string {
  return `${USERS_COLLECTION}/${getStudentUserId()}`
}

export function getStudentDocRef() {
  return doc(db, USERS_COLLECTION, DEFAULT_STUDENT_ID)
}

export function getStudentTransactionsCollectionRef() {
  return collection(
    db,
    USERS_COLLECTION,
    DEFAULT_STUDENT_ID,
    TRANSACTIONS_SUBCOLLECTION,
  )
}

export function createStudentTransactionDocRef() {
  return doc(getStudentTransactionsCollectionRef())
}
