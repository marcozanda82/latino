import type {
  Complemento,
  Step1Verbo,
  Step2AnalisiVerbo,
  Step3Soggetto,
  TranslationValue,
} from './index'
import type { ExerciseDraftData } from './exerciseDraft'
import type { VerbCategory } from '../utils/verbAnalysis'

export type ExerciseType = 'sentence' | 'version'

export type ProposizioneTipo = 'principale' | 'coordinata' | 'subordinata'

/** Analisi logica a 5 step di una singola proposizione (versioni). */
export interface Proposizione {
  id: string | number
  testo_proposizione: string
  tipo_proposizione: ProposizioneTipo
  parole_array: string[]
  step1_verbo: Step1Verbo
  step2_analisi_verbo: Step2AnalisiVerbo
  step3_soggetto: Step3Soggetto
  step4_nucleo_tradotto: TranslationValue
  step5_complementi: Complemento[]
}

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
  /** Analisi del periodo: una o più proposizioni con schema a 5 step ciascuna. */
  proposizioni: Proposizione[]
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
  /** Indice 0-based del primo segmento non completato (persistito per resume). */
  currentSegmentIndex?: number
  segments: Record<number, VersionSegmentProgress>
  bellaCopia?: string
  /** Stato dell'intero esercizio (documento padre versionProgress). */
  status?: VersionExerciseProgressStatus
  submittedAt?: string
  completedAt?: string
  updatedAt?: string
}

export function getVersionSegmentLatinText(segment: VersionSegment): string {
  return segment.proposizioni
    .map((proposizione) => proposizione.testo_proposizione.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value))
}

function isProposizioneTipo(value: unknown): value is ProposizioneTipo {
  return (
    value === 'principale' ||
    value === 'coordinata' ||
    value === 'subordinata'
  )
}

function isProposizioneShape(value: unknown): value is Proposizione {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>
  const step1 = item.step1_verbo as Record<string, unknown> | undefined
  const step2 = item.step2_analisi_verbo as Record<string, unknown> | undefined
  const step3 = item.step3_soggetto as Record<string, unknown> | undefined

  return (
    (typeof item.id === 'string' || typeof item.id === 'number') &&
    typeof item.testo_proposizione === 'string' &&
    item.testo_proposizione.trim().length > 0 &&
    isProposizioneTipo(item.tipo_proposizione) &&
    Array.isArray(item.parole_array) &&
    item.parole_array.every((word) => typeof word === 'string') &&
    typeof step1 === 'object' &&
    step1 !== null &&
    typeof step1.parola_corretta === 'string' &&
    typeof step1.spiegazione_errore === 'string' &&
    typeof step2 === 'object' &&
    step2 !== null &&
    typeof step2.modo === 'string' &&
    typeof step2.tempo === 'string' &&
    typeof step2.forma === 'string' &&
    typeof step3 === 'object' &&
    step3 !== null &&
    Array.isArray(step3.parole_corrette) &&
    step3.parole_corrette.every((word) => typeof word === 'string') &&
    typeof step3.sottinteso === 'boolean' &&
    (typeof item.step4_nucleo_tradotto === 'string' ||
      (Array.isArray(item.step4_nucleo_tradotto) &&
        item.step4_nucleo_tradotto.length > 0 &&
        item.step4_nucleo_tradotto.every(
          (translation) => typeof translation === 'string',
        ))) &&
    Array.isArray(item.step5_complementi)
  )
}

function isVersionSegmentShape(value: unknown): value is VersionSegment {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'number' &&
    (item.note === undefined || typeof item.note === 'string') &&
    isOptionalNumber(item.difficolta_percentuale) &&
    isOptionalNumber(item.compenso_assegnato) &&
    Array.isArray(item.proposizioni) &&
    item.proposizioni.length > 0 &&
    item.proposizioni.every(isProposizioneShape)
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
