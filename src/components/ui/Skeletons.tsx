import type { ReactNode } from 'react'
import Skeleton from 'react-loading-skeleton'
import { GlassCard } from './GlassCard'

const skeletonProps = {
  baseColor: '#e2e8f0',
  highlightColor: '#f8fafc',
}

export function WeeklyGoalSkeleton() {
  return (
    <GlassCard className="mb-8">
      <Skeleton width={160} height={12} {...skeletonProps} />
      <Skeleton width={220} height={20} className="mt-3" {...skeletonProps} />
      <Skeleton height={14} className="mt-3" {...skeletonProps} />
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height={10} containerClassName="flex-1" {...skeletonProps} />
        ))}
      </div>
    </GlassCard>
  )
}

export function LevelCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <GlassCard key={index} className="!p-6">
          <Skeleton width={90} height={12} {...skeletonProps} />
          <Skeleton height={20} className="mt-4" {...skeletonProps} />
          <Skeleton height={14} count={2} className="mt-3" {...skeletonProps} />
          <Skeleton width={120} height={12} className="mt-5" {...skeletonProps} />
        </GlassCard>
      ))}
    </div>
  )
}

export function StudentHomeSkeleton() {
  return (
    <div className="space-y-10">
      <WeeklyGoalSkeleton />
      <div>
        <Skeleton width={180} height={24} {...skeletonProps} />
        <Skeleton width={280} height={14} className="mt-3" {...skeletonProps} />
      </div>
      <LevelCardsSkeleton />
    </div>
  )
}

export function PlayLevelSkeleton() {
  return (
    <AppLayoutSkeleton>
      <GlassCard>
        <Skeleton width={140} height={12} {...skeletonProps} />
        <Skeleton width="70%" height={32} className="mt-4" {...skeletonProps} />
        <Skeleton width="90%" height={14} className="mt-3" {...skeletonProps} />
        <div className="mt-6 flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} width={40} height={6} {...skeletonProps} />
          ))}
        </div>
      </GlassCard>
      <GlassCard className="mt-8">
        <Skeleton height={180} {...skeletonProps} />
        <Skeleton height={48} className="mt-6" {...skeletonProps} />
      </GlassCard>
    </AppLayoutSkeleton>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <GlassCard>
        <Skeleton width={200} height={20} {...skeletonProps} />
        <Skeleton height={120} className="mt-5" {...skeletonProps} />
      </GlassCard>
      <GlassCard>
        <Skeleton width={160} height={18} {...skeletonProps} />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} height={56} className="mt-4" {...skeletonProps} />
        ))}
      </GlassCard>
    </div>
  )
}

function AppLayoutSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  )
}
