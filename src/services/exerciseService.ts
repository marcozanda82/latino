import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { LatinAnalysis } from '../types'
import type { ExerciseType, VersionExercise } from '../types/version'
import { getVersionSegmentLatinText, isVersionExercise } from '../types/version'

export interface BaseLevel {
  id: string
  title: string
  groupName: string
  createdAt: string
  /** Compenso massimo fisso in Sesterzi (sovrascrive la formula) */
  customMaxReward?: number
}

/** Esercizio classico a 5 step (analisi logica). */
export interface SentenceLevel extends BaseLevel {
  type: 'sentence'
  analysis: LatinAnalysis
}

/** Esercizio Versione (traduzione per segmenti + bella copia). */
export interface VersionLevel extends BaseLevel {
  type: 'version'
  version: VersionExercise
}

export type Level = SentenceLevel | VersionLevel

const LEVELS_COLLECTION = 'levels'

export function isSentenceLevel(level: Level): level is SentenceLevel {
  return level.type === 'sentence'
}

export function isVersionLevel(level: Level): level is VersionLevel {
  return level.type === 'version'
}

export function getLevelPreviewText(level: Level): string {
  if (isVersionLevel(level)) {
    const firstSegment = level.version.segmenti[0]
      ? getVersionSegmentLatinText(level.version.segmenti[0]).trim()
      : undefined
    if (firstSegment) {
      return firstSegment.length > 120
        ? `${firstSegment.slice(0, 120)}…`
        : firstSegment
    }
    return level.version.introduzione || level.title
  }

  return level.analysis.frase_originale
}

function normalizeGroupName(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Generale'
}

function normalizeCustomMaxReward(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function resolveExerciseType(data: Record<string, unknown>): ExerciseType {
  const rawType = data.type ?? data.tipo
  if (rawType === 'version') return 'version'
  if (rawType === 'sentence') return 'sentence'
  if (isVersionExercise(data.version)) return 'version'
  if (isVersionExercise(data)) return 'version'
  return 'sentence'
}

function mapDocToLevel(id: string, data: Record<string, unknown>): Level | null {
  const customMaxReward = normalizeCustomMaxReward(data.customMaxReward)
  const base = {
    id,
    title: typeof data.title === 'string' ? data.title : 'Senza titolo',
    groupName: normalizeGroupName(data.groupName),
    createdAt:
      typeof data.createdAt === 'string'
        ? data.createdAt
        : new Date().toISOString(),
    customMaxReward,
  }

  const type = resolveExerciseType(data)

  if (type === 'version') {
    const versionPayload = isVersionExercise(data.version)
      ? data.version
      : isVersionExercise(data)
        ? data
        : null

    if (!versionPayload) {
      console.error(
        '[exerciseService] Documento versione ignorato: payload non valido.',
        { id },
      )
      return null
    }

    return {
      ...base,
      title:
        typeof data.title === 'string' && data.title.trim()
          ? data.title
          : versionPayload.titolo,
      type: 'version',
      version: versionPayload,
    }
  }

  if (!data.analysis || typeof data.analysis !== 'object') {
    console.error(
      '[exerciseService] Documento sentence ignorato: analysis mancante.',
      { id },
    )
    return null
  }

  return {
    ...base,
    type: 'sentence',
    analysis: data.analysis as LatinAnalysis,
  }
}

function mapDocsToLevels(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): Level[] {
  return docs
    .map((docSnap) => mapDocToLevel(docSnap.id, docSnap.data()))
    .filter((level): level is Level => level !== null)
}

export function subscribeToLevels(
  callback: (levels: Level[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, LEVELS_COLLECTION),
    (snapshot) => {
      callback(mapDocsToLevels(snapshot.docs))
    },
    (error) => {
      console.error('[exerciseService] subscribeToLevels failed:', error)
      onError?.(error)
      callback([])
    },
  )
}

export async function fetchLevels(): Promise<Level[]> {
  try {
    const snapshot = await getDocs(collection(db, LEVELS_COLLECTION))
    return mapDocsToLevels(snapshot.docs)
  } catch (error) {
    console.error('[exerciseService] fetchLevels failed:', error)
    return []
  }
}

export async function fetchLevelById(id: string): Promise<Level | null> {
  try {
    const docSnap = await getDoc(doc(db, LEVELS_COLLECTION, id))
    if (!docSnap.exists()) return null
    return mapDocToLevel(docSnap.id, docSnap.data())
  } catch (error) {
    console.error('[exerciseService] fetchLevelById failed:', error)
    return null
  }
}

export async function createLevel(
  title: string,
  analysis: LatinAnalysis,
  groupName: string,
): Promise<SentenceLevel> {
  try {
    const createdAt = new Date().toISOString()
    const normalizedGroupName = groupName.trim() || 'Generale'
    const docRef = await addDoc(collection(db, LEVELS_COLLECTION), {
      title: title.trim(),
      groupName: normalizedGroupName,
      type: 'sentence',
      analysis,
      createdAt,
    })

    return {
      id: docRef.id,
      title: title.trim(),
      groupName: normalizedGroupName,
      type: 'sentence',
      analysis,
      createdAt,
    }
  } catch (error) {
    console.error('[exerciseService] createLevel failed:', error)
    throw error
  }
}

export async function createVersionLevel(
  version: VersionExercise,
  groupName: string,
  customMaxReward?: number,
): Promise<VersionLevel> {
  try {
    const createdAt = new Date().toISOString()
    const normalizedGroupName = groupName.trim() || 'Generale'
    const payload: Record<string, unknown> = {
      title: version.titolo.trim(),
      groupName: normalizedGroupName,
      type: 'version',
      version,
      createdAt,
    }

    if (
      typeof customMaxReward === 'number' &&
      Number.isFinite(customMaxReward) &&
      customMaxReward >= 0
    ) {
      payload.customMaxReward = Math.round(customMaxReward)
    }

    const docRef = await addDoc(collection(db, LEVELS_COLLECTION), payload)

    return {
      id: docRef.id,
      title: version.titolo.trim(),
      groupName: normalizedGroupName,
      type: 'version',
      version,
      createdAt,
      customMaxReward:
        typeof customMaxReward === 'number' && Number.isFinite(customMaxReward)
          ? Math.round(customMaxReward)
          : undefined,
    }
  } catch (error) {
    console.error('[exerciseService] createVersionLevel failed:', error)
    throw error
  }
}

export async function deleteLevel(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LEVELS_COLLECTION, id))
  } catch (error) {
    console.error('[exerciseService] deleteLevel failed:', error)
    throw error
  }
}

export async function updateLevelCompensation(
  id: string,
  compensation: {
    coefficient?: number
    customMaxReward?: number | null
  },
): Promise<void> {
  const levelRef = doc(db, LEVELS_COLLECTION, id)
  const snapshot = await getDoc(levelRef)

  if (!snapshot.exists()) {
    throw new Error('Esercizio non trovato.')
  }

  const data = snapshot.data()
  const level = mapDocToLevel(id, data)
  if (!level) {
    throw new Error('Esercizio non valido.')
  }

  const updates: Record<string, unknown> = {}

  if (compensation.coefficient !== undefined) {
    if (!isSentenceLevel(level)) {
      throw new Error(
        'Il coefficiente si applica solo agli esercizi a frase (sentence).',
      )
    }

    if (!Number.isFinite(compensation.coefficient) || compensation.coefficient < 0) {
      throw new Error('Coefficiente non valido.')
    }

    updates.analysis = {
      ...level.analysis,
      coefficiente: compensation.coefficient,
    }
  }

  if (compensation.customMaxReward !== undefined) {
    if (
      compensation.customMaxReward !== null &&
      (!Number.isFinite(compensation.customMaxReward) ||
        compensation.customMaxReward < 0)
    ) {
      throw new Error('Compenso massimo non valido.')
    }

    updates.customMaxReward =
      compensation.customMaxReward === null
        ? null
        : Math.round(compensation.customMaxReward)
  }

  if (Object.keys(updates).length === 0) return

  await updateDoc(levelRef, updates)
}

export {
  areAllVersionSegmentsCompleted,
  createInitialVersionProgress,
  finalizeVersionProgress,
  getVersionProgress,
  isVersionExerciseSubmitted,
  reconcileVersionProgress,
  saveVersionProgress,
} from './versionProgressService'
