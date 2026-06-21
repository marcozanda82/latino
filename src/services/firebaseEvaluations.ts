import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import type {
  EvaluationStatus,
  PendingTranslation,
} from '../components/TutorDashboard'
import { db } from '../config/firebase'

const EVALUATIONS_COLLECTION = 'evaluations'

function mapDocToPendingTranslation(
  id: string,
  data: Record<string, unknown>,
): PendingTranslation | null {
  if (
    typeof data.fraseOriginale !== 'string' ||
    typeof data.traduzioneAttesa !== 'string' ||
    typeof data.traduzioneStudente !== 'string' ||
    typeof data.status !== 'string'
  ) {
    console.error(
      '[firebaseEvaluations] Documento ignorato: campi mancanti o non validi.',
      { id },
    )
    return null
  }

  return {
    id,
    fraseOriginale: data.fraseOriginale,
    traduzioneAttesa: data.traduzioneAttesa,
    traduzioneStudente: data.traduzioneStudente,
    status: data.status as EvaluationStatus,
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
      status: 'in_attesa',
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
    where('status', '==', 'in_attesa'),
    orderBy('createdAt', 'asc'),
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
        '[firebaseEvaluations] subscribeToPendingEvaluations failed:',
        error,
      )
      callback([])
    },
  )
}

export async function updateEvaluationStatus(
  id: string,
  newStatus: EvaluationStatus,
): Promise<void> {
  try {
    await updateDoc(doc(db, EVALUATIONS_COLLECTION, id), {
      status: newStatus,
    })
  } catch (error) {
    console.error('[firebaseEvaluations] updateEvaluationStatus failed:', error)
    throw error
  }
}
