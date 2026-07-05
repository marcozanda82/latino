import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { LatinAnalysis } from '../types'

export interface Level {
  id: string
  title: string
  groupName: string
  analysis: LatinAnalysis
  createdAt: string
  /** Compenso massimo fisso in Sesterzi (sovrascrive la formula) */
  customMaxReward?: number
  /** Blocco esercizio controllato dal Tutor (default true sui nuovi) */
  isLocked?: boolean
}

const LEVELS_COLLECTION = 'levels'

/** Retrocompatibilità: solo `true` (booleano) blocca; false/assente/stringhe → sbloccato. */
export function isLevelLockedByTutor(level: Pick<Level, 'isLocked'>): boolean {
  return level.isLocked === true
}

function parseIsLocked(value: unknown): boolean {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return false
}

function mapDocToLevel(id: string, data: Record<string, unknown>): Level {
  const customMaxReward =
    typeof data.customMaxReward === 'number' &&
    Number.isFinite(data.customMaxReward)
      ? data.customMaxReward
      : undefined

  return {
    id,
    title: data.title as string,
    groupName:
      typeof data.groupName === 'string' && data.groupName.trim()
        ? data.groupName.trim()
        : 'Generale',
    analysis: data.analysis as LatinAnalysis,
    createdAt: data.createdAt as string,
    customMaxReward,
    isLocked: parseIsLocked(data.isLocked),
  }
}

export function subscribeToLevels(
  callback: (levels: Level[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, LEVELS_COLLECTION),
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnap) =>
          mapDocToLevel(docSnap.id, docSnap.data()),
        ),
      )
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
    return snapshot.docs.map((docSnap) =>
      mapDocToLevel(docSnap.id, docSnap.data()),
    )
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
): Promise<Level> {
  try {
    const createdAt = new Date().toISOString()
    const normalizedGroupName = groupName.trim() || 'Generale'
    const docRef = await addDoc(collection(db, LEVELS_COLLECTION), {
      title: title.trim(),
      groupName: normalizedGroupName,
      analysis,
      createdAt,
      isLocked: true,
    })

    return {
      id: docRef.id,
      title: title.trim(),
      groupName: normalizedGroupName,
      analysis,
      createdAt,
      isLocked: true,
    }
  } catch (error) {
    console.error('[exerciseService] createLevel failed:', error)
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
  const analysis = data.analysis as LatinAnalysis
  const updates: Record<string, unknown> = {}

  if (compensation.coefficient !== undefined) {
    if (!Number.isFinite(compensation.coefficient) || compensation.coefficient < 0) {
      throw new Error('Coefficiente non valido.')
    }

    updates.analysis = {
      ...analysis,
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

export async function updateLevelLock(
  id: string,
  isLocked: boolean,
): Promise<void> {
  const levelRef = doc(db, LEVELS_COLLECTION, id)
  const snapshot = await getDoc(levelRef)

  if (!snapshot.exists()) {
    throw new Error('Esercizio non trovato.')
  }

  const locked = isLocked === true

  await updateDoc(levelRef, { isLocked: locked })
}

export async function updateGroupLock(
  levelIds: string[],
  isLocked: boolean,
): Promise<void> {
  if (levelIds.length === 0) return

  const locked = isLocked === true
  const batch = writeBatch(db)

  for (const id of levelIds) {
    batch.update(doc(db, LEVELS_COLLECTION, id), { isLocked: locked })
  }

  await batch.commit()
}
