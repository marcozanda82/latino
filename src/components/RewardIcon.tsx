import type { ShopReward } from '../types/reward'
import { getRewardIconNode } from '../utils/rewardIcons'

interface RewardIconProps {
  reward: ShopReward
  size?: 'sm' | 'md'
}

export function RewardIcon({ reward, size = 'md' }: RewardIconProps) {
  const boxClass = size === 'sm' ? 'h-12 w-12' : 'h-14 w-14'
  const imageClass =
    size === 'sm'
      ? 'h-12 w-12 rounded-lg'
      : 'h-14 w-14 rounded-2xl'

  if (reward.imageUrl) {
    return (
      <img
        src={reward.imageUrl}
        alt=""
        className={`${imageClass} shrink-0 border border-amber-200/80 object-cover`}
      />
    )
  }

  return (
    <span
      className={`flex ${boxClass} shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50`}
      aria-hidden
    >
      {getRewardIconNode(reward)}
    </span>
  )
}
