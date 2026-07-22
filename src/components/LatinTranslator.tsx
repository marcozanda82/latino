import type { LatinAnalysis } from '../types'
import { SentenceExerciseFlow } from './SentenceExerciseFlow'

interface LatinTranslatorProps {
  analysis: LatinAnalysis
  levelTitle: string
  levelId?: string
  customMaxReward?: number
  onBackToLevels: () => void
}

export function LatinTranslator({
  analysis,
  levelTitle,
  levelId,
  customMaxReward,
  onBackToLevels,
}: LatinTranslatorProps) {
  return (
    <SentenceExerciseFlow
      mode="standalone"
      analysis={analysis}
      title={levelTitle}
      levelId={levelId}
      customMaxReward={customMaxReward}
      onBackToLevels={onBackToLevels}
    />
  )
}
