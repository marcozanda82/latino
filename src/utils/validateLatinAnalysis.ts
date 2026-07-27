import type { LatinAnalysis, TranslationValue } from '../types'
import {
  validateComplementStructure,
  validateComplementsCoherence,
} from './complements'
import { isValidForm, isValidModo, isIndefiniteMode, verbMatchesParoleArray } from './verbAnalysis'

function isTranslationValue(value: unknown): value is TranslationValue {
  if (typeof value === 'string') return true
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string')
  )
}

export const JSON_LOAD_ERROR =
  'Errore: Il file JSON non ha il formato corretto per l\'esercizio'

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : trimmed
}

function isValidStep2AnalisiVerbo(step2: Record<string, unknown>): boolean {
  if (typeof step2.modo !== 'string' || !isValidModo(step2.modo)) return false
  if (typeof step2.tempo !== 'string' || !step2.tempo.trim()) return false
  if (typeof step2.forma !== 'string' || !isValidForm(step2.forma)) return false

  const indefinite = isIndefiniteMode(step2.modo)

  if (!indefinite) {
    if (typeof step2.persona !== 'string' || !step2.persona.trim()) return false
    if (typeof step2.numero !== 'string' || !step2.numero.trim()) return false
    return true
  }

  const personaValid =
    step2.persona === undefined ||
    step2.persona === null ||
    typeof step2.persona === 'string'
  const numeroValid =
    step2.numero === undefined ||
    step2.numero === null ||
    typeof step2.numero === 'string'

  return personaValid && numeroValid
}

export function isLatinAnalysis(value: unknown): value is LatinAnalysis {
  if (!value || typeof value !== 'object') return false

  const data = value as Record<string, unknown>
  const step1 = data.step1_verbo as Record<string, unknown> | undefined
  const step2 = data.step2_analisi_verbo as Record<string, unknown> | undefined
  const step3 = data.step3_soggetto as Record<string, unknown> | undefined

  return (
    typeof data.frase_originale === 'string' &&
    Array.isArray(data.parole_array) &&
    data.parole_array.every((word) => typeof word === 'string') &&
    typeof step1 === 'object' &&
    step1 !== null &&
    typeof step1.parola_corretta === 'string' &&
    typeof step1.spiegazione_errore === 'string' &&
    typeof step2 === 'object' &&
    step2 !== null &&
    isValidStep2AnalisiVerbo(step2) &&
    typeof step3 === 'object' &&
    step3 !== null &&
    Array.isArray(step3.parole_corrette) &&
    step3.parole_corrette.every((word) => typeof word === 'string') &&
    typeof step3.sottinteso === 'boolean' &&
    isTranslationValue(data.step4_nucleo_tradotto) &&
    validateComplementStructure(data.step5_complementi) &&
    (data.coefficiente === undefined ||
      (typeof data.coefficiente === 'number' &&
        Number.isFinite(data.coefficiente)))
  )
}

export function validateLatinAnalysisCoherence(
  analysis: LatinAnalysis,
): string | null {
  if (!verbMatchesParoleArray(analysis.step1_verbo.parola_corretta, analysis.parole_array)) {
    return 'Il verbo indicato non compare tra le parole della frase.'
  }

  for (const word of analysis.step3_soggetto.parole_corrette) {
    if (!analysis.parole_array.includes(word)) {
      return 'Una parola del soggetto non compare tra le parole della frase.'
    }
  }

  if (
    analysis.step3_soggetto.sottinteso &&
    analysis.step3_soggetto.parole_corrette.length > 0
  ) {
    return 'Se il soggetto è sottinteso, parole_corrette deve essere un array vuoto.'
  }

  if (
    !analysis.step3_soggetto.sottinteso &&
    analysis.step3_soggetto.parole_corrette.length === 0
  ) {
    return 'Il soggetto non è sottinteso: indica almeno una parola in parole_corrette.'
  }

  return validateComplementsCoherence(analysis)
}

export class JsonLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonLoadError'
  }
}

function validateParsedLatinAnalysis(parsed: unknown, index?: number): LatinAnalysis {
  const label =
    index !== undefined ? `Frase ${index + 1}: ` : ''

  if (!isLatinAnalysis(parsed)) {
    throw new JsonLoadError(`${label}${JSON_LOAD_ERROR}`)
  }

  const coherenceError = validateLatinAnalysisCoherence(parsed)
  if (coherenceError) {
    throw new JsonLoadError(`${label}${JSON_LOAD_ERROR} (${coherenceError})`)
  }

  return parsed
}

export function parseLatinAnalysisBatchJson(raw: string): LatinAnalysis[] {
  if (!raw.trim()) {
    throw new JsonLoadError('Incolla o carica un file JSON prima di procedere.')
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(extractJsonContent(raw))
  } catch {
    throw new JsonLoadError('Errore: sintassi JSON non valida.')
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]
  if (items.length === 0) {
    throw new JsonLoadError('Il JSON non contiene frasi da importare.')
  }

  return items.map((item, index) => validateParsedLatinAnalysis(item, index))
}

export function parseLatinAnalysisJson(raw: string): LatinAnalysis {
  const analyses = parseLatinAnalysisBatchJson(raw)
  return analyses[0]
}
