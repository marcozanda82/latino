import { doc, getDoc, serverTimestamp, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ExerciseDraftData } from '../types/exerciseDraft'
import type {
  VersionExerciseProgressStatus,
  VersionProgress,
  VersionSegmentProgress,
  VersionSegmentProgressStatus,
  VersionSegmentStepAnswers,
} from '../types/version'
import { USERS_COLLECTION } from './studentFinancePaths'

const VERSION_PROGRESS_SUBCOLLECTION = 'versionProgress'

function getVersionProgressDocRef(userId: string, levelId: string) {
  return doc(
    db,
    USERS_COLLECTION,
    userId,
    VERSION_PROGRESS_SUBCOLLECTION,
    levelId,
  )
}

const VALID_STATUSES: VersionSegmentProgressStatus[] = [
  'locked',
  'available',
  'in_progress',
  'completed',
]

const VALID_EXERCISE_STATUSES: VersionExerciseProgressStatus[] = [
  'in_progress',
  'pending_evaluation',
]

function isValidExerciseStatus(
  value: unknown,
): value is VersionExerciseProgressStatus {
  return (
    typeof value === 'string' &&
    VALID_EXERCISE_STATUSES.includes(value as VersionExerciseProgressStatus)
  )
}

function normalizeTimestampField(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return undefined
}

function isValidStatus(value: unknown): value is VersionSegmentProgressStatus {
  return (
    typeof value === 'string' &&
    VALID_STATUSES.includes(value as VersionSegmentProgressStatus)
  )
}

function normalizeStepAnswers(value: unknown): VersionSegmentStepAnswers | undefined {
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
    step2SelectedAnswers: data.step2SelectedAnswers as VersionSegmentStepAnswers['step2SelectedAnswers'],
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

function normalizeDraft(value: unknown): ExerciseDraftData | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Record<string, unknown>
  if (
    typeof data.fraseOriginale !== 'string' ||
    typeof data.currentStep !== 'number'
  ) {
    return undefined
  }
  return value as ExerciseDraftData
}

function normalizeSegmentProgress(value: unknown): VersionSegmentProgress | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (!isValidStatus(data.status)) return null

  return {
    status: data.status,
    ...(typeof data.mechanicalScore === 'number'
      ? { mechanicalScore: data.mechanicalScore }
      : {}),
    ...(typeof data.traduzioneSegmento === 'string'
      ? { traduzioneSegmento: data.traduzioneSegmento }
      : {}),
    ...(typeof data.xpScore === 'number' ? { xpScore: data.xpScore } : {}),
    ...(normalizeStepAnswers(data.stepAnswers)
      ? { stepAnswers: normalizeStepAnswers(data.stepAnswers) }
      : {}),
    ...(normalizeDraft(data.draft) ? { draft: normalizeDraft(data.draft) } : {}),
  }
}

function normalizeSegments(
  raw: unknown,
): Record<number, VersionSegmentProgress> {
  if (!raw || typeof raw !== 'object') return {}

  const result: Record<number, VersionSegmentProgress> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(key)
    if (!Number.isFinite(id)) continue
    const segment = normalizeSegmentProgress(value)
    if (segment) result[id] = segment
  }
  return result
}

function normalizeVersionProgress(
  levelId: string,
  raw: Record<string, unknown>,
): VersionProgress | null {
  if (typeof raw.levelId === 'string' && raw.levelId !== levelId) return null

  const segments = normalizeSegments(raw.segments)
  if (Object.keys(segments).length === 0) return null

  return {
    levelId,
    userId: typeof raw.userId === 'string' ? raw.userId : undefined,
    activeSegmentId:
      typeof raw.activeSegmentId === 'number' ? raw.activeSegmentId : null,
    segments,
    bellaCopia:
      typeof raw.bellaCopia === 'string' ? raw.bellaCopia : undefined,
    status: isValidExerciseStatus(raw.status) ? raw.status : undefined,
    submittedAt:
      typeof raw.submittedAt === 'string' ? raw.submittedAt : undefined,
    completedAt: normalizeTimestampField(raw.completedAt),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  }
}

export function createInitialVersionProgress(
  levelId: string,
  userId: string,
  segmentIds: number[],
): VersionProgress {
  const sortedIds = [...segmentIds].sort((a, b) => a - b)
  const segments: Record<number, VersionSegmentProgress> = {}

  sortedIds.forEach((id, index) => {
    segments[id] = {
      status: index === 0 ? 'available' : 'locked',
    }
  })

  return {
    levelId,
    userId,
    activeSegmentId: null,
    segments,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  }
}

export function reconcileVersionProgress(
  stored: VersionProgress | null,
  levelId: string,
  userId: string,
  segmentIds: number[],
): VersionProgress {
  const sortedIds = [...segmentIds].sort((a, b) => a - b)
  const base = createInitialVersionProgress(levelId, userId, sortedIds)

  if (!stored) return base

  const segments = { ...base.segments }

  for (const id of sortedIds) {
    if (stored.segments[id]) {
      segments[id] = stored.segments[id]
    }
  }

  for (let index = 0; index < sortedIds.length; index += 1) {
    const id = sortedIds[index]
    const previousId = index > 0 ? sortedIds[index - 1] : null

    if (
      previousId &&
      segments[previousId]?.status === 'completed' &&
      segments[id]?.status === 'locked'
    ) {
      segments[id] = { ...segments[id], status: 'available' }
    }
  }

  const activeSegmentId =
    typeof stored.activeSegmentId === 'number' &&
    sortedIds.includes(stored.activeSegmentId) &&
    segments[stored.activeSegmentId]?.status !== 'completed' &&
    segments[stored.activeSegmentId]?.status !== 'locked'
      ? stored.activeSegmentId
      : null

  return {
    levelId,
    userId,
    activeSegmentId,
    segments,
    bellaCopia: stored.bellaCopia,
    status: stored.status ?? 'in_progress',
    submittedAt: stored.submittedAt,
    completedAt: stored.completedAt,
    updatedAt: stored.updatedAt ?? new Date().toISOString(),
  }
}

export function areAllVersionSegmentsCompleted(
  segmentIds: number[],
  segments: Record<number, VersionSegmentProgress>,
): boolean {
  return (
    segmentIds.length > 0 &&
    segmentIds.every((id) => segments[id]?.status === 'completed')
  )
}

export function isVersionExerciseSubmitted(progress: VersionProgress): boolean {
  return (
    progress.status === 'pending_evaluation' || Boolean(progress.submittedAt)
  )
}

export async function finalizeVersionProgress(
  userId: string,
  levelId: string,
  progress: VersionProgress,
): Promise<VersionProgress> {
  if (!userId.trim() || !levelId.trim()) {
    throw new Error('Utente o livello non valido.')
  }

  const now = new Date().toISOString()
  const finalized: VersionProgress = {
    ...progress,
    levelId,
    userId,
    activeSegmentId: null,
    status: 'pending_evaluation',
    submittedAt: progress.submittedAt ?? now,
    completedAt: progress.completedAt ?? now,
    updatedAt: now,
  }

  await setDoc(
    getVersionProgressDocRef(userId, levelId),
    {
      ...finalized,
      completedAt: serverTimestamp(),
      savedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return finalized
}

export async function getVersionProgress(
  userId: string,
  levelId: string,
): Promise<VersionProgress | null> {
  if (!userId.trim() || !levelId.trim()) return null

  try {
    const snapshot = await getDoc(getVersionProgressDocRef(userId, levelId))
    if (!snapshot.exists()) return null

    return normalizeVersionProgress(levelId, snapshot.data())
  } catch (error) {
    console.error('[versionProgressService] getVersionProgress failed:', error)
    throw error
  }
}

export async function saveVersionProgress(
  userId: string,
  levelId: string,
  progress: VersionProgress,
): Promise<void> {
  if (!userId.trim() || !levelId.trim()) return

  try {
    await setDoc(
      getVersionProgressDocRef(userId, levelId),
      {
        ...progress,
        levelId,
        userId,
        updatedAt: new Date().toISOString(),
        savedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error('[versionProgressService] saveVersionProgress failed:', error)
    throw error
  }
}

export async function listVersionProgressForUser(
  userId: string,
): Promise<VersionProgress[]> {
  if (!userId.trim()) return []

  try {
    const snapshot = await getDocs(
      collection(
        db,
        USERS_COLLECTION,
        userId,
        VERSION_PROGRESS_SUBCOLLECTION,
      ),
    )

    return snapshot.docs
      .map((docSnap) =>
        normalizeVersionProgress(docSnap.id, docSnap.data()),
      )
      .filter((item): item is VersionProgress => item !== null)
  } catch (error) {
    console.error(
      '[versionProgressService] listVersionProgressForUser failed:',
      error,
    )
    throw error
  }
}
