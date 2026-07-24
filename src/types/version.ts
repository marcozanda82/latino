import type { LatinAnalysis } from './index'
import type { ExerciseDraftData } from './exerciseDraft'
import type { VerbCategory } from '../utils/verbAnalysis'

export type ExerciseType = 'sentence' | 'version'

export type VersionSegmentProgressStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed'

/** Stato globale dell'esercizio versione lato studente. */
export type VersionExerciseProgressStatus =
  | 'in_progress'
  | 'pending_evaluation'

/** Risposte dello studente ai singoli step (persistenza e review tutor). */
export interface VersionSegmentStepAnswers {
  step1PlacedTileId: string | null
  step2SelectedAnswers: Partial<Record<VerbCategory, string>>
  step3PlacedTileIds: string[]
  step3ImplicitSuccess: boolean
  studentCoreTranslation: string
  studentComplementTranslations: string[]
}

/**
 * Payload di un segmento completato, inviato con la consegna versione.
 * Include punteggio meccanico e dettaglio step per la review del tutor.
 */
export interface VersionSegmentSubmission {
  id: number
  /** Copia difensiva del latino di riferimento (da analisi.frase_originale). */
  latino: string
  /** Traduzione fluida assemblata dallo studente (nucleo + complementi). */
  traduzioneSegmento: string
  mechanicalScore: number
  /** Quota Sesterzi massima del segmento al momento della consegna. */
  compensoAssegnato?: number
  /** XP interno opzionale (non mostrato nel flusso versione). */
  xpScore?: number
  /** Traduzione attesa (buildFullTranslation(analisi)). */
  traduzioneAttesa?: string
  /** Punteggio AI aderenza, se aiFeedbackEnabled. */
  accuracyScore?: number
  /** Dettaglio risposte per step — obbligatorio nel nuovo flusso analitico. */
  stepAnswers?: VersionSegmentStepAnswers
  /**
   * @deprecated Legacy del flusso textarea — usato finché VersionTranslator non migra.
   * Preferire traduzioneSegmento.
   */
  traduzione?: string
}

export interface VersionSegment {
  id: number
  note?: string
  /** Quota di difficoltà sul totale (0–100), generata dall'AI */
  difficolta_percentuale?: number
  /** Sesterzi assegnati a questo segmento in base alla difficoltà */
  compenso_assegnato?: number
  /** Analisi logica a 5 step — stesso schema delle Frasi Singole. */
  analisi: LatinAnalysis
}

/** Payload JSON di una Versione latina. */
export interface VersionExercise {
  titolo: string
  tipo: 'version'
  autore: string
  introduzione: string
  segmenti: VersionSegment[]
}

/** Stato globale lato studente per una versione in corso (persistenza Firestore/localStorage). */
export interface VersionSegmentProgress {
  status: VersionSegmentProgressStatus
  mechanicalScore?: number
  traduzioneSegmento?: string
  xpScore?: number
  stepAnswers?: VersionSegmentStepAnswers
  draft?: ExerciseDraftData
}

export interface VersionProgress {
  levelId: string
  userId?: string
  activeSegmentId: number | null
  segments: Record<number, VersionSegmentProgress>
  bellaCopia?: string
  /** Stato dell'intero esercizio (documento padre versionProgress). */
  status?: VersionExerciseProgressStatus
  submittedAt?: string
  completedAt?: string
  updatedAt?: string
}

export function getVersionSegmentLatinText(segment: VersionSegment): string {
  return segment.analisi.frase_originale
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value))
}

function isVersionSegmentShape(value: unknown): value is VersionSegment {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    (item.note === undefined || typeof item.note === 'string') &&
    isOptionalNumber(item.difficolta_percentuale) &&
    isOptionalNumber(item.compenso_assegnato) &&
    typeof item.analisi === 'object' &&
    item.analisi !== null
  )
}

export function isVersionExercise(value: unknown): value is VersionExercise {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    data.tipo === 'version' &&
    typeof data.titolo === 'string' &&
    typeof data.autore === 'string' &&
    typeof data.introduzione === 'string' &&
    Array.isArray(data.segmenti) &&
    data.segmenti.every(isVersionSegmentShape)
  )
}
