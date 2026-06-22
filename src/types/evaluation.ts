import type { Timestamp } from 'firebase/firestore'

export type EvaluationStatus =
  | 'in_attesa'
  | 'approved'
  | 'verde'
  | 'giallo'
  | 'rosso'

export interface PendingTranslation {
  id: string
  /** ID del livello Firestore collegato all'esercizio */
  levelId?: string
  fraseOriginale: string
  traduzioneAttesa: string
  traduzioneStudente: string
  status: EvaluationStatus
  mechanicalScore: number
  /** Sesterzi guadagnati dallo studente al completamento */
  reward?: number
  bonusScore?: number
  totalScore?: number
  autoApproved?: boolean
  createdAt?: Timestamp
}

export const ARCHIVE_STATUSES: EvaluationStatus[] = [
  'approved',
  'verde',
  'giallo',
  'rosso',
]

export function isArchivedEvaluation(status: EvaluationStatus): boolean {
  return ARCHIVE_STATUSES.includes(status)
}
