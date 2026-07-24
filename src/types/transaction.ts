import type { Timestamp } from 'firebase/firestore'

export type TransactionType = 'earn' | 'spend' | 'manual_bonus'

export type TransactionStatus = 'active' | 'reverted'

export interface StudentTransaction {
  id: string
  amount: number
  description: string
  type: TransactionType
  status: TransactionStatus
  timestamp?: Timestamp
}

export function isTransactionReverted(
  transaction: Pick<StudentTransaction, 'status'>,
): boolean {
  return transaction.status === 'reverted'
}

export function getTransactionStatusLabel(
  transaction: Pick<StudentTransaction, 'status'>,
): string {
  return isTransactionReverted(transaction) ? 'Annullata' : 'Attiva'
}
