import type { Timestamp } from 'firebase/firestore'

export type TransactionType = 'earn' | 'spend'

export interface StudentTransaction {
  id: string
  amount: number
  description: string
  type: TransactionType
  timestamp?: Timestamp
}
