import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ExerciseDraftData } from '../types/exerciseDraft'
import { getStudentUserId } from './studentService'

const DRAFTS_COLLECTION = 'drafts'

export function buildDraftDocId(userId: string, exerciseId: string): string {
  return `${userId}_${exerciseId}`
}

function getDraftDocRef(exerciseId: string) {
  const userId = getStudentUserId()
  return doc(
    db,
    DRAFTS_COLLECTION,
    buildDraftDocId(userId, exerciseId),
  )
}

function normalizeDraftData(
  exerciseId: string,
  data: Record<string, unknown>,
): ExerciseDraftData | null {
  const userId = getStudentUserId()

  if (
    typeof data.fraseOriginale !== 'string' ||
    typeof data.currentStep !== 'number' ||
    typeof data.step1Complete !== 'boolean' ||
    typeof data.step2Complete !== 'boolean' ||
    typeof data.step3Complete !== 'boolean' ||
    typeof data.step4Complete !== 'boolean' ||
    typeof data.step5Complete !== 'boolean' ||
    typeof data.score !== 'number' ||
    typeof data.mechanicalScore !== 'number' ||
    typeof data.studentCoreTranslation !== 'string' ||
    !Array.isArray(data.studentComplementTranslations) ||
    !data.studentComplementTranslations.every((item) => typeof item === 'string')
  ) {
    return null
  }

  return {
    userId: typeof data.userId === 'string' ? data.userId : userId,
    exerciseId: typeof data.exerciseId === 'string' ? data.exerciseId : exerciseId,
    fraseOriginale: data.fraseOriginale,
    currentStep: data.currentStep as ExerciseDraftData['currentStep'],
    step1Complete: data.step1Complete,
    step2Complete: data.step2Complete,
    step3Complete: data.step3Complete,
    step4Complete: data.step4Complete,
    step5Complete: data.step5Complete,
    score: data.score,
    mechanicalScore: data.mechanicalScore,
    studentCoreTranslation: data.studentCoreTranslation,
    studentComplementTranslations: data.studentComplementTranslations,
    step1PlacedTileId:
      typeof data.step1PlacedTileId === 'string' ? data.step1PlacedTileId : null,
    step2Completed:
      data.step2Completed && typeof data.step2Completed === 'object'
        ? (data.step2Completed as Record<string, boolean>)
        : null,
    step2SelectedAnswers:
      data.step2SelectedAnswers && typeof data.step2SelectedAnswers === 'object'
        ? (data.step2SelectedAnswers as Record<string, string>)
        : null,
    step3PlacedTileIds: Array.isArray(data.step3PlacedTileIds)
      ? data.step3PlacedTileIds.filter((id): id is string => typeof id === 'string')
      : [],
    step3ImplicitSuccess:
      typeof data.step3ImplicitSuccess === 'boolean'
        ? data.step3ImplicitSuccess
        : false,
    step5CurrentIndex:
      typeof data.step5CurrentIndex === 'number' ? data.step5CurrentIndex : 0,
    step5CaseLocked:
      typeof data.step5CaseLocked === 'boolean' ? data.step5CaseLocked : false,
    step5SelectedCase:
      typeof data.step5SelectedCase === 'string' ? data.step5SelectedCase : null,
  }
}

export async function fetchExerciseDraft(
  exerciseId: string,
): Promise<ExerciseDraftData | null> {
  if (!exerciseId.trim()) return null

  try {
    const snapshot = await getDoc(getDraftDocRef(exerciseId))
    if (!snapshot.exists()) return null
    return normalizeDraftData(exerciseId, snapshot.data())
  } catch (error) {
    console.error('[draftService] fetchExerciseDraft failed:', error)
    return null
  }
}

export async function saveExerciseDraft(
  exerciseId: string,
  draft: ExerciseDraftData,
): Promise<void> {
  if (!exerciseId.trim()) return

  try {
    await setDoc(getDraftDocRef(exerciseId), {
      ...draft,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('[draftService] saveExerciseDraft failed:', error)
  }
}

export async function deleteExerciseDraft(exerciseId: string): Promise<void> {
  if (!exerciseId.trim()) return

  try {
    await deleteDoc(getDraftDocRef(exerciseId))
  } catch (error) {
    console.error('[draftService] deleteExerciseDraft failed:', error)
  }
}
