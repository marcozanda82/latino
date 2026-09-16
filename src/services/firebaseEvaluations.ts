import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
import type {
  VersionSegmentStepAnswers,
  VersionSegmentSubmission,
} from '../types/version'

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

function normalizeEvaluationStepAnswers(
  value: unknown,
): VersionSegmentStepAnswers | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Record<string, unknown>
  if (
    (data.step1PlacedTileId !== null &&
      typeof data.step1PlacedTileId !== 'string') ||
    !data.step2SelectedAnswers ||
    typeof data.step2SelectedAnswers !== 'object' ||
    !Array.isArray(data.step3PlacedTileIds) ||
    typeof data.step3ImplicitSuccess !== 'boolean' ||
    typeof data.studentCoreTranslation !== 'string' ||
    !Array.isArray(data.studentComplementTranslations)
  ) {
    return undefined
  }

  return {
    step1PlacedTileId:
      typeof data.step1PlacedTileId === 'string' ? data.step1PlacedTileId : null,
    step2SelectedAnswers:
      data.step2SelectedAnswers as VersionSegmentStepAnswers['step2SelectedAnswers'],
    step3PlacedTileIds: data.step3PlacedTileIds.filter(
      (id): id is string => typeof id === 'string',
    ),
    step3ImplicitSuccess: data.step3ImplicitSuccess,
    studentCoreTranslation: data.studentCoreTranslation,
    studentComplementTranslations: data.studentComplementTranslations.filter(
      (item): item is string => typeof item === 'string',
    ),
  }
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
    exerciseType:
      data.exerciseType === 'version' || data.exerciseType === 'sentence'
        ? data.exerciseType
        : undefined,
    titolo: typeof data.titolo === 'string' ? data.titolo : undefined,
    autore: typeof data.autore === 'string' ? data.autore : undefined,
    fraseOriginale: data.fraseOriginale,
    traduzioneAttesa: data.traduzioneAttesa,
    traduzioneStudente: data.traduzioneStudente,
    mechanicalScore,
    bonusScore:
      typeof data.bonusScore === 'number' ? data.bonusScore : undefined,
    reward: typeof data.reward === 'number' ? data.reward : undefined,
    suggestedReward:
      typeof data.suggestedReward === 'number'
        ? data.suggestedReward
        : undefined,
    totalScore:
      typeof data.totalScore === 'number' ? data.totalScore : undefined,
    autoApproved: data.autoApproved === true,
    freeTranslation:
      typeof data.freeTranslation === 'string' &&
      data.freeTranslation.trim()
        ? data.freeTranslation.trim()
        : undefined,
    segmentTranslations: Array.isArray(data.segmentTranslations)
      ? data.segmentTranslations
          .map((item) => {
            if (!item || typeof item !== 'object') return null
            const segment = item as Record<string, unknown>
            const traduzioneSegmento =
              typeof segment.traduzioneSegmento === 'string'
                ? segment.traduzioneSegmento
                : typeof segment.traduzione === 'string'
                  ? segment.traduzione
                  : null

            if (
              typeof segment.id !== 'number' ||
              typeof segment.latino !== 'string' ||
              !traduzioneSegmento
            ) {
              return null
            }

            const submission: VersionSegmentSubmission = {
              id: segment.id,
              latino: segment.latino,
              traduzioneSegmento,
              mechanicalScore:
                typeof segment.mechanicalScore === 'number'
                  ? segment.mechanicalScore
                  : 0,
            }

            if (typeof segment.compensoAssegnato === 'number') {
              submission.compensoAssegnato = segment.compensoAssegnato
            }
            if (typeof segment.traduzione === 'string') {
              submission.traduzione = segment.traduzione
            }
            if (typeof segment.xpScore === 'number') {
              submission.xpScore = segment.xpScore
            }
            if (typeof segment.traduzioneAttesa === 'string') {
              submission.traduzioneAttesa = segment.traduzioneAttesa
            }
            if (typeof segment.accuracyScore === 'number') {
              submission.accuracyScore = segment.accuracyScore
            }
            if (segment.stepAnswers && typeof segment.stepAnswers === 'object') {
              submission.stepAnswers =
                segment.stepAnswers as VersionSegmentSubmission['stepAnswers']
            }

            return submission
          })
          .filter(
            (item): item is VersionSegmentSubmission => item !== null,
          )
      : undefined,
    tutorNotes:
      typeof data.tutorNotes === 'string' && data.tutorNotes.trim()
        ? data.tutorNotes.trim()
        : undefined,
    stepAnswers: normalizeEvaluationStepAnswers(data.stepAnswers),
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
      ...(data.freeTranslation?.trim()
        ? { freeTranslation: data.freeTranslation.trim() }
        : {}),
      ...(data.stepAnswers ? { stepAnswers: data.stepAnswers } : {}),
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

export interface SubmitVersionForReviewInput {
  levelId?: string
  titolo: string
  autore: string
  segmentTranslations: VersionSegmentSubmission[]
  bellaCopia: string
  /** Premio massimo suggerito al tutor (non accreditato alla consegna) */
  suggestedReward?: number
}

export async function submitVersionForReview(
  data: SubmitVersionForReviewInput,
): Promise<{ id: string }> {
  try {
    const bellaCopia = data.bellaCopia.trim()
    if (!bellaCopia) {
      throw new Error('La bella copia non può essere vuota.')
    }

    const latinoCompleto = data.segmentTranslations
      .map((segment) => segment.latino.trim())
      .filter(Boolean)
      .join('\n\n')

    const bruttaCopia = data.segmentTranslations
      .map((segment) =>
        (segment.traduzioneSegmento ?? segment.traduzione ?? '').trim(),
      )
      .filter(Boolean)
      .join('\n\n')

    const suggestedReward =
      typeof data.suggestedReward === 'number' &&
      Number.isFinite(data.suggestedReward) &&
      data.suggestedReward >= 0
        ? Math.round(data.suggestedReward)
        : undefined

    const docRef = await addDoc(collection(db, EVALUATIONS_COLLECTION), {
      ...(data.levelId ? { levelId: data.levelId } : {}),
      exerciseType: 'version',
      fraseOriginale: latinoCompleto || data.titolo,
      traduzioneAttesa: '',
      traduzioneStudente: bruttaCopia || bellaCopia,
      freeTranslation: bellaCopia,
      segmentTranslations: data.segmentTranslations,
      titolo: data.titolo,
      autore: data.autore,
      mechanicalScore: 0,
      reward: 0,
      ...(suggestedReward !== undefined ? { suggestedReward } : {}),
      status: PENDING_STATUS,
      autoApproved: false,
      bonusScore: null,
      totalScore: null,
      createdAt: serverTimestamp(),
    })

    return { id: docRef.id }
  } catch (error) {
    console.error(
      '[firebaseEvaluations] submitVersionForReview failed:',
      error,
    )
    throw error
  }
}

export async function approveVersionEvaluation(
  id: string,
  options: {
    reward: number
    tutorNotes?: string
  },
): Promise<void> {
  if (!id.trim()) {
    throw new Error('ID valutazione mancante.')
  }

  const reward = Math.round(options.reward)
  if (!Number.isFinite(reward) || reward < 0) {
    throw new Error('Premio in Sesterzi non valido.')
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

  if (evaluation.status !== PENDING_STATUS) {
    throw new Error('Questa versione è già stata valutata.')
  }

  const tutorNotes = options.tutorNotes?.trim() || ''

  try {
    await updateDoc(evaluationRef, {
      status: APPROVED_STATUS,
      reward,
      totalScore: reward,
      bonusScore: reward,
      tutorNotes: tutorNotes || null,
    })

    if (reward > 0) {
      const title = evaluation.titolo || evaluation.fraseOriginale
      await creditSesterzi(
        reward,
        `Ricompensa tutor per versione: ${title}`,
      )
    }
  } catch (error) {
    console.error(
      '[firebaseEvaluations] approveVersionEvaluation failed:',
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

export async function getArchivedEvaluationForLevel(
  levelId: string,
): Promise<PendingTranslation | null> {
  if (!levelId.trim()) return null

  try {
    const evaluationsQuery = query(
      collection(db, EVALUATIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
    )
    const snapshot = await getDocs(evaluationsQuery)

    for (const docSnap of snapshot.docs) {
      const evaluation = mapDocToPendingTranslation(docSnap.id, docSnap.data())
      if (
        evaluation &&
        evaluation.levelId === levelId &&
        isArchivedEvaluation(evaluation.status)
      ) {
        return evaluation
      }
    }

    return null
  } catch (error) {
    console.error(
      '[firebaseEvaluations] getArchivedEvaluationForLevel failed:',
      error,
    )
    return null
  }
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
