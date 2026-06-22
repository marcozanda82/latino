export interface ShopReward {
  id: string
  name: string
  cost: number
  imageUrl?: string
  /** Chiave icona Lucide (es. apple, pizza, burger) */
  icon?: string
  active: boolean
}
