import { motion } from 'framer-motion'

interface ScoreBadgeProps {
  score: number
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <motion.div
      layout
      className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 shadow-sm"
      aria-label={`Punteggio: ${score} XP`}
    >
      <span className="text-lg" aria-hidden>
        🏆
      </span>
      <span className="text-sm font-semibold tabular-nums text-amber-900">
        {score} XP
      </span>
    </motion.div>
  )
}
