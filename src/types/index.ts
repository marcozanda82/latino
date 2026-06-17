export type StepId = 'verb' | 'subject' | 'object' | 'translation'

export interface Step1Verbo {
  parola_corretta: string
  spiegazione_errore: string
}

export interface Step2AnalisiVerbo {
  modo: string
  tempo: string
  persona: string
  numero: string
  forma: string
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

export type TileStatus = 'idle' | 'dragging' | 'error' | 'placed'

export interface DropZoneConfig {
  id: string
  label: string
  stepId: StepId
}
