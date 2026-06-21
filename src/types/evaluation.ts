import type { Timestamp } from 'firebase/firestore'

export type EvaluationStatus = 'in_attesa' | 'verde' | 'giallo' | 'rosso'

export interface PendingTranslation {
  id: string
  fraseOriginale: string
  traduzioneAttesa: string
  traduzioneStudente: string
  status: EvaluationStatus
  mechanicalScore: number
  bonusScore?: number
  totalScore?: number
  createdAt?: Timestamp
}
