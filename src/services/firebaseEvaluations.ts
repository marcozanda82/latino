import {
  addDoc,
  collection,
  doc,
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
import { db } from '../config/firebase'

const EVALUATIONS_COLLECTION = 'evaluations'
const PENDING_STATUS: EvaluationStatus = 'in_attesa'

function normalizeStatus(value: unknown): EvaluationStatus | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'in_attesa' ||
    normalized === 'verde' ||
    normalized === 'giallo' ||
    normalized === 'rosso'
  ) {
    return normalized
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
    fraseOriginale: data.fraseOriginale,
    traduzioneAttesa: data.traduzioneAttesa,
    traduzioneStudente: data.traduzioneStudente,
    mechanicalScore,
    bonusScore:
      typeof data.bonusScore === 'number' ? data.bonusScore : undefined,
    totalScore:
      typeof data.totalScore === 'number' ? data.totalScore : undefined,
    status,
    createdAt: data.createdAt as Timestamp | undefined,
  }
}

export async function submitTranslationForReview(
  data: Omit<PendingTranslation, 'id' | 'status'>,
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, EVALUATIONS_COLLECTION), {
      fraseOriginale: data.fraseOriginale,
      traduzioneAttesa: data.traduzioneAttesa,
      traduzioneStudente: data.traduzioneStudente,
      mechanicalScore: data.mechanicalScore,
      status: PENDING_STATUS,
      createdAt: serverTimestamp(),
    })

    return docRef.id
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
