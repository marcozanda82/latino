import { motion } from 'framer-motion'
import type { GamificationSettings } from '../services/settingsService'
import { GlassCard } from './ui/GlassCard'

interface WeeklyGoalTrackerProps {
  completedCount: number
  settings: GamificationSettings
}

export function WeeklyGoalTracker({
  completedCount,
  settings,
}: WeeklyGoalTrackerProps) {
  const weeklyTarget = Math.max(1, settings.weeklyTarget)
  const isGoalReached = completedCount >= weeklyTarget
  const progressPercent = Math.min((completedCount / weeklyTarget) * 100, 100)

  return (
    <GlassCard className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Obiettivo settimanale
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-800">
            La barra della settimana
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Completa {weeklyTarget} frasi in 7 giorni per sbloccare:{' '}
            <span className="font-medium text-slate-800">
              {settings.currentReward}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
          {completedCount}/{weeklyTarget}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2.5">
        {Array.from({ length: weeklyTarget }, (_, index) => {
          const isFilled = index < completedCount
          return (
            <div
              key={index}
              className={[
                'h-3 flex-1 rounded-full transition-colors duration-300',
                isFilled ? 'bg-emerald-500' : 'bg-slate-200',
              ].join(' ')}
            />
          )
        })}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        />
      </div>

      {isGoalReached && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mt-5 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-5 py-4 text-center"
        >
          <motion.p
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-sm font-semibold text-amber-900"
          >
            🎉 Hai sbloccato: {settings.currentReward}!
          </motion.p>
        </motion.div>
      )}
    </GlassCard>
  )
}
