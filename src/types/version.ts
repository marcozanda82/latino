export type ExerciseType = 'sentence' | 'version'

export interface VersionSegment {
  id: number
  latino: string
  note?: string
}

/** Payload JSON di una Versione latina (modulo indipendente dall'analisi a 5 step). */
export interface VersionExercise {
  titolo: string
  tipo: 'version'
  autore: string
  introduzione: string
  segmenti: VersionSegment[]
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
    data.segmenti.every((segment) => {
      if (!segment || typeof segment !== 'object') return false
      const item = segment as Record<string, unknown>
      return (
        typeof item.id === 'number' &&
        typeof item.latino === 'string' &&
        (item.note === undefined || typeof item.note === 'string')
      )
    })
  )
}
