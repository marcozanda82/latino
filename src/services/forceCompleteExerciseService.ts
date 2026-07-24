import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ExerciseDraftData } from '../types/exerciseDraft'
import type { ExerciseType } from '../types/version'
import {
  getVersionSegmentLatinText,
  type VersionSegmentSubmission,
} from '../types/version'
import {
  isSentenceLevel,
  isVersionLevel,
  type Level,
} from './exerciseService'
import {
  fetchExerciseDraftForUser,
  markDraftPendingEvaluation,
} from './draftService'
import {
  submitTranslationForReview,
  submitVersionForReview,
} from './firebaseEvaluations'
import { getStudentUserId } from './studentService'
import { buildFullTranslation } from '../utils/complements'
import {
  finalizeVersionProgress,
  getVersionProgress,
  isVersionExerciseSubmitted,
  listVersionProgressForUser,
} from './versionProgressService'

const DRAFTS_COLLECTION = 'drafts'

export type StuckExerciseType = ExerciseType

export interface StuckExercise {
  exerciseId: string
  type: StuckExerciseType
  title: string
  preview: string
  progressLabel: string
}

function buildSentencePreview(draft: ExerciseDraftData): string {
  return draft.studentCoreTranslation.trim() || draft.fraseOriginale
}

function buildSentenceProgressLabel(draft: ExerciseDraftData): string {
  if (draft.step5Complete) return 'Analisi completata (non consegnata)'
  return `Step ${draft.currentStep}/5 · analisi meccanica ${draft.mechanicalScore}/60`
}

function buildVersionProgressLabel(
  completedCount: number,
  total: number,
  hasActiveSegment: boolean,
): string {
  if (completedCount >= total) return 'Tutti i segmenti completati (non consegnata)'
  if (hasActiveSegment) {
    return `${completedCount}/${total} segmenti · segmento attivo`
  }
  return `${completedCount}/${total} segmenti completati`
}

function buildDefaultBellaCopiaFromProgress(
  level: Level,
  segments: VersionSegmentSubmission[],
): string {
  if (!isVersionLevel(level)) return ''

  const fromSegments = segments
    .map((segment) => segment.traduzioneSegmento.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return fromSegments || '(Bella copia non disponibile — completamento forzato dal tutor)'
}

function buildStudentTranslationFromDraft(draft: ExerciseDraftData): string {
  return [draft.studentCoreTranslation, ...draft.studentComplementTranslations]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function listDraftDocumentsForUser(userId: string) {
  const prefix = `${userId}_`
  const snapshot = await getDocs(collection(db, DRAFTS_COLLECTION))

  return snapshot.docs.filter((docSnap) => docSnap.id.startsWith(prefix))
}

export async function listStuckExercises(
  levels: Level[],
  submittedLevelIds: Set<string>,
  userId: string = getStudentUserId(),
): Promise<StuckExercise[]> {
  if (!userId.trim()) return []

  const levelById = Object.fromEntries(levels.map((level) => [level.id, level]))
  const stuck: StuckExercise[] = []

  const draftDocs = await listDraftDocumentsForUser(userId)
  for (const docSnap of draftDocs) {
    const exerciseId = docSnap.id.slice(`${userId}_`.length)
    const level = levelById[exerciseId]
    if (!level || !isSentenceLevel(level)) continue
    if (submittedLevelIds.has(exerciseId)) continue

    const data = docSnap.data()
    if (data.status === 'pending_evaluation') continue

    const draft = await fetchExerciseDraftForUser(userId, exerciseId)
    if (!draft) continue

    stuck.push({
      exerciseId,
      type: 'sentence',
      title: level.title,
      preview: buildSentencePreview(draft),
      progressLabel: buildSentenceProgressLabel(draft),
    })
  }

  const versionProgressList = await listVersionProgressForUser(userId)
  for (const progress of versionProgressList) {
    const level = levelById[progress.levelId]
    if (!level || !isVersionLevel(level)) continue
    if (submittedLevelIds.has(progress.levelId)) continue
    if (isVersionExerciseSubmitted(progress)) continue

    const segmentIds = level.version.segmenti.map((segment) => segment.id)
    const completedCount = segmentIds.filter(
      (id) => progress.segments[id]?.status === 'completed',
    ).length
    const hasActivity =
      completedCount > 0 ||
      progress.activeSegmentId !== null ||
      segmentIds.some((id) => {
        const status = progress.segments[id]?.status
        return status === 'in_progress' || status === 'available'
      })

    if (!hasActivity) continue

    const firstLatin = level.version.segmenti[0]
      ? getVersionSegmentLatinText(level.version.segmenti[0])
      : level.title

    stuck.push({
      exerciseId: progress.levelId,
      type: 'version',
      title: level.title,
      preview: firstLatin,
      progressLabel: buildVersionProgressLabel(
        completedCount,
        segmentIds.length,
        progress.activeSegmentId !== null,
      ),
    })
  }

  return stuck.sort((a, b) => a.title.localeCompare(b.title, 'it'))
}

export async function forceCompleteExercise(
  exerciseId: string,
  type: StuckExerciseType,
  level: Level,
  userId: string = getStudentUserId(),
): Promise<void> {
  if (!exerciseId.trim() || !userId.trim()) {
    throw new Error('Esercizio o utente non valido.')
  }

  if (type === 'sentence') {
    if (!isSentenceLevel(level) || level.id !== exerciseId) {
      throw new Error('Livello frase non trovato.')
    }

    const draft = await fetchExerciseDraftForUser(userId, exerciseId)
    const studentTranslation = draft
      ? buildStudentTranslationFromDraft(draft)
      : ''
    const mechanicalScore = draft?.mechanicalScore ?? 0

    await submitTranslationForReview({
      levelId: exerciseId,
      fraseOriginale: level.analysis.frase_originale,
      traduzioneAttesa: buildFullTranslation(level.analysis),
      traduzioneStudente:
        studentTranslation ||
        '(Traduzione non disponibile — completamento forzato dal tutor)',
      mechanicalScore,
      reward: 0,
      autoApproved: false,
    })

    await markDraftPendingEvaluation(userId, exerciseId)
    return
  }

  if (!isVersionLevel(level) || level.id !== exerciseId) {
    throw new Error('Livello versione non trovato.')
  }

  const progress = await getVersionProgress(userId, exerciseId)
  if (!progress) {
    throw new Error('Progressi versione non trovati.')
  }
  if (isVersionExerciseSubmitted(progress)) {
    throw new Error('Questa versione risulta già consegnata.')
  }

  const segmentTranslations: VersionSegmentSubmission[] =
    level.version.segmenti.map((segment) => {
      const segmentProgress = progress.segments[segment.id]
      const traduzioneSegmento =
        segmentProgress?.traduzioneSegmento?.trim() ||
        '(Segmento non completato — forzato dal tutor)'

      return {
        id: segment.id,
        latino: getVersionSegmentLatinText(segment),
        traduzioneSegmento,
        mechanicalScore: segmentProgress?.mechanicalScore ?? 0,
        compensoAssegnato: segment.compenso_assegnato,
        traduzioneAttesa: buildFullTranslation(segment.analisi),
        stepAnswers: segmentProgress?.stepAnswers,
      }
    })

  const bellaCopia =
    progress.bellaCopia?.trim() ||
    buildDefaultBellaCopiaFromProgress(level, segmentTranslations)

  await submitVersionForReview({
    levelId: exerciseId,
    titolo: level.title,
    autore: level.version.autore,
    segmentTranslations,
    bellaCopia,
    suggestedReward:
      typeof level.customMaxReward === 'number' &&
      Number.isFinite(level.customMaxReward)
        ? Math.round(level.customMaxReward)
        : undefined,
  })

  await finalizeVersionProgress(userId, exerciseId, {
    ...progress,
    bellaCopia,
    activeSegmentId: null,
  })
}
