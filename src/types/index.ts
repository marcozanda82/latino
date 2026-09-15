export type StepId = 'verb' | 'subject' | 'object' | 'translation'

export interface Step1Verbo {
  parola_corretta: string
  spiegazione_errore: string
}

export type VerbForm = 'attiva' | 'passiva'

export interface Step2AnalisiVerbo {
  modo: string
  tempo: string
  /** Non applicabile per infinito e participio. */
  persona?: string | null
  /** Non applicabile per infinito e participio. */
  numero?: string | null
  forma: VerbForm
}

export interface Step3Soggetto {
  parole_corrette: string[]
  sottinteso: boolean
}

export type TranslationValue = string | string[]

export interface Complemento {
  parole: string[]
  caso: string
  traduzione: TranslationValue
}

export interface LatinAnalysis {
  frase_originale: string
  parole_array: string[]
  /** Moltiplicatore ricompensa Sesterzi (default 1.0) */
  coefficiente?: number
  step1_verbo: Step1Verbo
  step2_analisi_verbo: Step2AnalisiVerbo
  step3_soggetto: Step3Soggetto
  step4_nucleo_tradotto: TranslationValue
  step5_complementi: Complemento[]
}

export interface TileData {
  id: string
  word: string
  index: number
}

export type TileStatus = 'idle' | 'error' | 'placed'

export interface DropZoneConfig {
  id: string
  label: string
  stepId: StepId
}

export type {
  ExerciseType,
  Proposizione,
  ProposizioneTipo,
  VersionExercise,
  VersionSegment,
  VersionProgress,
  VersionSegmentProgress,
  VersionSegmentProgressStatus,
  VersionSegmentSubmission,
  VersionSegmentStepAnswers,
} from './version'

export { getVersionSegmentLatinText, isVersionExercise } from './version'
