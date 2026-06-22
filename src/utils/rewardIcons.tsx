import { Apple, Gift, Hamburger, Pizza, Waves } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ShopReward } from '../types/reward'

export const rewardIconMap: Record<string, ReactNode> = {
  'Frutta Realistica': <Apple className="h-8 w-8 text-red-500" />,
  'Giornata al Mare': <Waves className="h-8 w-8 text-blue-500" />,
  Pizza: <Pizza className="h-8 w-8 text-orange-500" />,
  "Menu McDonald's": <Hamburger className="h-8 w-8 text-yellow-600" />,
}

export const rewardIconMapByKey: Record<string, ReactNode> = {
  apple: rewardIconMap['Frutta Realistica'],
  waves: rewardIconMap['Giornata al Mare'],
  pizza: rewardIconMap.Pizza,
  burger: rewardIconMap["Menu McDonald's"],
  hamburger: rewardIconMap["Menu McDonald's"],
  gift: <Gift className="h-8 w-8 text-amber-600" />,
}

export function inferRewardIconKey(name: string): string {
  const normalized = name.trim()
  if (normalized === 'Frutta Realistica') return 'apple'
  if (normalized === 'Giornata al Mare') return 'waves'
  if (normalized === 'Pizza') return 'pizza'
  if (normalized === "Menu McDonald's") return 'burger'
  return 'gift'
}

export function getRewardIconNode(reward: ShopReward): ReactNode {
  if (reward.icon && rewardIconMapByKey[reward.icon]) {
    return rewardIconMapByKey[reward.icon]
  }

  return rewardIconMap[reward.name] ?? rewardIconMapByKey.gift
}
