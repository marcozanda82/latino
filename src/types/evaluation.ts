import type { Timestamp } from 'firebase/firestore'
import type {
  ExerciseType,
  VersionSegmentStepAnswers,
  VersionSegmentSubmission,
} from './version'

export type EvaluationStatus =
  | 'in_attesa'
  | 'approved'
  | 'verde'
  | 'giallo'
  | 'rosso'

export type { VersionSegmentSubmission } from './version'

export interface PendingTranslation {
  id: string
  /** ID del livello Firestore collegato all'esercizio */
  levelId?: string
  /** Tipologia esercizio: frase a 5 step o versione */
  exerciseType?: ExerciseType
  /** Metadati versione (se exerciseType === 'version') */
  titolo?: string
  autore?: string
  fraseOriginale: string
  traduzioneAttesa: string
  traduzioneStudente: string
  status: EvaluationStatus
  mechanicalScore: number
  /** Sesterzi guadagnati dallo studente al completamento */
  reward?: number
  /** Suggerimento di premio (es. customMaxReward del livello), non ancora accreditato */
  suggestedReward?: number
  bonusScore?: number
  totalScore?: number
  autoApproved?: boolean
  /** Resa in italiano fluida (bella copia), opzionale */
  freeTranslation?: string
  /** Traduzioni per segmento (solo moduli versione) */
  segmentTranslations?: VersionSegmentSubmission[]
  /** Risposte step-by-step (frasi singole, modalità review) */
  stepAnswers?: VersionSegmentStepAnswers
  /** Feedback del tutor (versioni e, in futuro, frasi) */
  tutorNotes?: string
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
