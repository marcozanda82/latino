import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import type {
  EvaluationStatus,
  PendingTranslation,
} from '../types/evaluation'
import { ARCHIVE_STATUSES, isArchivedEvaluation } from '../types/evaluation'
import { db } from '../config/firebase'
import { creditSesterzi, reverseSesterziCredit } from './studentService'
import { matchesTranslation } from '../utils/textNormalization'
import type { TranslationValue } from '../types'

const EVALUATIONS_COLLECTION = 'evaluations'
const PENDING_STATUS: EvaluationStatus = 'in_attesa'
const APPROVED_STATUS: EvaluationStatus = 'approved'
const MECHANICAL_SCORE_PERFECT = 60

function normalizeStatus(value: unknown): EvaluationStatus | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'in_attesa' ||
    normalized === 'approved' ||
    normalized === 'convalidata' ||
    normalized === 'verde' ||
    normalized === 'giallo' ||
    normalized === 'rosso'
  ) {
    return normalized === 'convalidata' ? 'approved' : normalized
  }
  return null
}

function normalizeMechanicalScore(value: unknown): number | null {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? score : null
}

function mapDocToPendingTranslation(
  id: string,
  data: Record<string, unknown>,
): PendingTranslation | null {
  const status = normalizeStatus(data.status)
  const mechanicalScore = normalizeMechanicalScore(data.mechanicalScore)

  if (
    typeof data.fraseOriginale !== 'string' ||
    typeof data.traduzioneAttesa !== 'string' ||
    typeof data.traduzioneStudente !== 'string' ||
    !status ||
    mechanicalScore === null
  ) {
    console.error(
      '[firebaseEvaluations] Documento ignorato: campi mancanti o non validi.',
      { id, status: data.status },
    )
    return null
  }

  return {
    id,
    levelId: typeof data.levelId === 'string' ? data.levelId : undefined,
    fraseOriginale: data.fraseOriginale,
    traduzioneAttesa: data.traduzioneAttesa,
    traduzioneStudente: data.traduzioneStudente,
    mechanicalScore,
    bonusScore:
      typeof data.bonusScore === 'number' ? data.bonusScore : undefined,
    reward: typeof data.reward === 'number' ? data.reward : undefined,
    totalScore:
      typeof data.totalScore === 'number' ? data.totalScore : undefined,
    autoApproved: data.autoApproved === true,
    status,
    createdAt: data.createdAt as Timestamp | undefined,
  }
}

export interface SubmitTranslationOptions {
  autoApproved?: boolean
}

export function canAutoApproveTranslation(
  studentTranslation: string,
  expectedTranslation: string | TranslationValue,
  mechanicalScore: number,
): boolean {
  if (mechanicalScore < MECHANICAL_SCORE_PERFECT) return false

  if (typeof expectedTranslation === 'string') {
    return matchesTranslation(studentTranslation, expectedTranslation)
  }

  return matchesTranslation(studentTranslation, expectedTranslation)
}

export async function submitTranslationForReview(
  data: Omit<PendingTranslation, 'id' | 'status' | 'autoApproved'> & {
    autoApproved?: boolean
  },
): Promise<{ id: string; autoApproved: boolean }> {
  try {
    const autoApproved = data.autoApproved === true
    const status: EvaluationStatus = autoApproved
      ? APPROVED_STATUS
      : PENDING_STATUS
    const reward = data.reward ?? 0

    const docRef = await addDoc(collection(db, EVALUATIONS_COLLECTION), {
      ...(data.levelId ? { levelId: data.levelId } : {}),
      fraseOriginale: data.fraseOriginale,
      traduzioneAttesa: data.traduzioneAttesa,
      traduzioneStudente: data.traduzioneStudente,
      mechanicalScore: data.mechanicalScore,
      reward,
      status,
      autoApproved,
      bonusScore: autoApproved ? 40 : null,
      totalScore: autoApproved ? 100 : null,
      createdAt: serverTimestamp(),
    })

    if (typeof reward === 'number' && reward > 0) {
      const description = autoApproved
        ? 'Ricompensa per traduzione completata (Auto-convalidata)'
        : 'Ricompensa per traduzione completata'

      await creditSesterzi(reward, description)
    }

    return { id: docRef.id, autoApproved }
  } catch (error) {
    console.error(
      '[firebaseEvaluations] submitTranslationForReview failed:',
      error,
    )
    throw error
  }
}

export function subscribeToPendingEvaluations(
  callback: (data: PendingTranslation[]) => void,
): () => void {
  const evaluationsQuery = query(
    collection(db, EVALUATIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    evaluationsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) =>
          mapDocToPendingTranslation(docSnap.id, docSnap.data()),
        )
        .filter((item): item is PendingTranslation => item !== null)
        .filter((item) => item.status === PENDING_STATUS)
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0
          const bTime = b.createdAt?.toMillis?.() ?? 0
          return aTime - bTime
        })

      callback(items)
    },
    (error) => {
      console.error(
        '[firebaseEvaluations] subscribeToPendingEvaluations failed:',
        error,
      )
      callback([])
    },
  )
}

export function subscribeToStudentEvaluations(
  callback: (data: PendingTranslation[]) => void,
): () => void {
  const evaluationsQuery = query(
    collection(db, EVALUATIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    evaluationsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) =>
          mapDocToPendingTranslation(docSnap.id, docSnap.data()),
        )
        .filter((item): item is PendingTranslation => item !== null)

      callback(items)
    },
    (error) => {
      console.error(
        '[firebaseEvaluations] subscribeToStudentEvaluations failed:',
        error,
      )
      callback([])
    },
  )
}

export function subscribeToArchivedEvaluations(
  callback: (data: PendingTranslation[]) => void,
): () => void {
  const evaluationsQuery = query(
    collection(db, EVALUATIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    evaluationsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) =>
          mapDocToPendingTranslation(docSnap.id, docSnap.data()),
        )
        .filter((item): item is PendingTranslation => item !== null)
        .filter((item) => isArchivedEvaluation(item.status))

      callback(items)
    },
    (error) => {
      console.error(
        '[firebaseEvaluations] subscribeToArchivedEvaluations failed:',
        error,
      )
      callback([])
    },
  )
}

export function subscribeToAllEvaluations(
  callback: (data: PendingTranslation[]) => void,
): () => void {
  return subscribeToStudentEvaluations(callback)
}

export async function resetEvaluation(
  id: string,
  options: { reverseReward: boolean },
): Promise<void> {
  if (!id.trim()) {
    throw new Error('ID valutazione mancante.')
  }

  const evaluationRef = doc(db, EVALUATIONS_COLLECTION, id)
  const snapshot = await getDoc(evaluationRef)

  if (!snapshot.exists()) {
    throw new Error('Valutazione non trovata.')
  }

  const evaluation = mapDocToPendingTranslation(id, snapshot.data())
  if (!evaluation) {
    throw new Error('Valutazione non valida.')
  }

  await deleteDoc(evaluationRef)

  if (
    options.reverseReward &&
    typeof evaluation.reward === 'number' &&
    evaluation.reward > 0
  ) {
    await reverseSesterziCredit(
      evaluation.reward,
      `Rettifica: ${evaluation.fraseOriginale}`,
    )
  }
}

export async function updateEvaluationStatus(
  id: string,
  newStatus: EvaluationStatus,
  bonusScore: number,
  totalScore: number,
): Promise<void> {
  if (!id.trim()) {
    throw new Error('ID valutazione mancante.')
  }

  try {
    await updateDoc(doc(db, EVALUATIONS_COLLECTION, id), {
      status: newStatus,
      bonusScore,
      totalScore,
    })
  } catch (error) {
    console.error('[firebaseEvaluations] updateEvaluationStatus failed:', error)
    throw error
  }
}

export { ARCHIVE_STATUSES }
