import { useEffect, useState } from 'react'
import { subscribeToRewards } from '../services/rewardsService'
import type { ShopReward } from '../types/reward'

interface UseRewardsOptions {
  activeOnly?: boolean
}

export function useRewards(options: UseRewardsOptions = {}) {
  const { activeOnly = false } = options
  const [rewards, setRewards] = useState<ShopReward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    const unsubscribe = subscribeToRewards((nextRewards) => {
      setRewards(nextRewards)
      setLoading(false)
    }, { activeOnly })

    return unsubscribe
  }, [activeOnly])

  return { rewards, loading }
}
