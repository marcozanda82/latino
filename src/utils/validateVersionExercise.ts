import type { VersionExercise, VersionSegment } from '../types/version'
import { isVersionExercise } from '../types/version'
import {
  isLatinAnalysis,
  validateLatinAnalysisCoherence,
} from './validateLatinAnalysis'

export const VERSION_JSON_LOAD_ERROR =
  'Errore: Il file JSON non ha il formato corretto per la versione'

export class VersionJsonLoadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VersionJsonLoadError'
  }
}

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : trimmed
}

function normalizeVersionPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const data = value as Record<string, unknown>

  // Accetta type: 'version' come alias di tipo: 'version'
  if (data.tipo === undefined && data.type === 'version') {
    return { ...data, tipo: 'version' }
  }

  return data
}

function validateSegmentAnalisi(analisi: unknown, segmentId: number) {
  if (!isLatinAnalysis(analisi)) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (segmento ${segmentId}: analisi non valida).`,
    )
  }

  const coherenceError = validateLatinAnalysisCoherence(analisi)
  if (coherenceError) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (segmento ${segmentId}: ${coherenceError}).`,
    )
  }

  return analisi
}

function normalizeSegment(segment: VersionSegment): VersionSegment {
  const analisi = validateSegmentAnalisi(segment.analisi, segment.id)

  return {
    id: segment.id,
    analisi,
    note: segment.note?.trim() ? segment.note.trim() : '',
    ...(typeof segment.difficolta_percentuale === 'number'
      ? { difficolta_percentuale: segment.difficolta_percentuale }
      : {}),
    ...(typeof segment.compenso_assegnato === 'number'
      ? { compenso_assegnato: segment.compenso_assegnato }
      : {}),
  }
}

export function parseVersionExerciseJson(raw: string): VersionExercise {
  if (!raw.trim()) {
    throw new VersionJsonLoadError(
      'Incolla o carica un file JSON della versione prima di procedere.',
    )
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(extractJsonContent(raw))
  } catch {
    throw new VersionJsonLoadError('Errore: sintassi JSON non valida.')
  }

  const normalized = normalizeVersionPayload(parsed)

  if (!isVersionExercise(normalized)) {
    throw new VersionJsonLoadError(VERSION_JSON_LOAD_ERROR)
  }

  if (normalized.segmenti.length === 0) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (serve almeno un segmento).`,
    )
  }

  if (!normalized.titolo.trim()) {
    throw new VersionJsonLoadError(
      `${VERSION_JSON_LOAD_ERROR} (titolo mancante).`,
    )
  }

  return {
    ...normalized,
    titolo: normalized.titolo.trim(),
    autore: normalized.autore.trim(),
    introduzione: normalized.introduzione.trim(),
    segmenti: normalized.segmenti.map(normalizeSegment),
  }
}
