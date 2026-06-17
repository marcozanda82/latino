const STORAGE_KEY = 'latin_app_progress'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface LevelProgressEntry {
  bestScore: number
  completedAt: string
}

export type LevelProgress = Record<string, LevelProgressEntry>

function parseEntry(value: unknown): LevelProgressEntry | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { bestScore: value, completedAt: '' }
  }

  if (!value || typeof value !== 'object') return null

  const entry = value as Record<string, unknown>
  if (
    typeof entry.bestScore === 'number' &&
    Number.isFinite(entry.bestScore) &&
    typeof entry.completedAt === 'string'
  ) {
    return {
      bestScore: entry.bestScore,
      completedAt: entry.completedAt,
    }
  }

  return null
}

function readProgress(): LevelProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const progress: LevelProgress = {}
    for (const [levelId, value] of Object.entries(parsed)) {
      const entry = parseEntry(value)
      if (entry) progress[levelId] = entry
    }

    return progress
  } catch (error) {
    console.error('[progressService] readProgress failed:', error)
    return {}
  }
}

function writeProgress(progress: LevelProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('[progressService] writeProgress failed:', error)
  }
}

export function getCompletedLevels(): LevelProgress {
  return readProgress()
}

export function getWeeklyCompletionCount(): number {
  const progress = readProgress()
  const cutoff = Date.now() - SEVEN_DAYS_MS

  return Object.values(progress).filter((entry) => {
    if (!entry.completedAt) return false
    const completedAt = new Date(entry.completedAt).getTime()
    return Number.isFinite(completedAt) && completedAt >= cutoff
  }).length
}

export function saveLevelScore(levelId: string, score: number): void {
  try {
    const progress = readProgress()
    const current = progress[levelId]
    const now = new Date().toISOString()

    if (!current || score > current.bestScore) {
      progress[levelId] = { bestScore: score, completedAt: now }
    } else {
      progress[levelId] = { ...current, completedAt: now }
    }

    writeProgress(progress)
  } catch (error) {
    console.error('[progressService] saveLevelScore failed:', error)
  }
}
