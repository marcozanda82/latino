import type { Level } from '../services/exerciseService'
import type { LevelProgress } from '../services/progressService'

export interface LevelGroup {
  groupName: string
  levels: Level[]
}

const DEFAULT_GROUP_NAME = 'Generale'

export function getLevelGroupName(level: Level): string {
  return level.groupName?.trim() || DEFAULT_GROUP_NAME
}

export function groupLevelsByName(levels: Level[]): LevelGroup[] {
  const groups = new Map<string, Level[]>()

  for (const level of levels) {
    const groupName = getLevelGroupName(level)
    const existing = groups.get(groupName) ?? []
    groups.set(groupName, [...existing, level])
  }

  return Array.from(groups.entries())
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'it'))
    .map(([groupName, groupLevels]) => ({
      groupName,
      levels: groupLevels.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
}

export function isGroupUnlocked(
  groupIndex: number,
  groups: LevelGroup[],
  progress: LevelProgress,
): boolean {
  if (groupIndex === 0) return true

  const previousGroup = groups[groupIndex - 1]
  if (previousGroup.levels.length === 0) return true

  return previousGroup.levels.every((level) => progress[level.id] !== undefined)
}

export function isLevelUnlockedByEvaluation(
  globalIndex: number,
  orderedLevels: Level[],
  evaluationsByFrase: Record<string, unknown>,
  groupName: string,
): boolean {
  if (groupName.includes('Settimana 1')) return true

  if (globalIndex === 0) return true

  const previousLevel = orderedLevels[globalIndex - 1]
  if (!previousLevel) return false

  return (
    evaluationsByFrase[previousLevel.analysis.frase_originale] !== undefined
  )
}

export function getExistingGroupNames(levels: Level[]): string[] {
  const names = new Set<string>()
  for (const level of levels) {
    names.add(getLevelGroupName(level))
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'it'))
}
