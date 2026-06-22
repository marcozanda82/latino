import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
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
}

const LEVELS_COLLECTION = 'levels'

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
  }
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
    })

    return {
      id: docRef.id,
      title: title.trim(),
      groupName: normalizedGroupName,
      analysis,
      createdAt,
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
