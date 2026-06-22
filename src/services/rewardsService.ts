import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ShopReward } from '../types/reward'
import { inferRewardIconKey } from '../utils/rewardIcons'

const REWARDS_COLLECTION = 'rewards'

const DEFAULT_REWARDS: Omit<ShopReward, 'id'>[] = [
  { name: 'Frutta Realistica', cost: 800, active: true, icon: 'apple' },
  { name: 'Giornata al Mare', cost: 2000, active: true, icon: 'waves' },
  { name: 'Pizza', cost: 3000, active: true, icon: 'pizza' },
  { name: "Menu McDonald's", cost: 4000, active: true, icon: 'burger' },
]

function normalizeCost(value: unknown): number | null {
  const cost = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(cost) && cost >= 0 ? cost : null
}

function mapDocToReward(
  id: string,
  data: Record<string, unknown>,
): ShopReward | null {
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const cost = normalizeCost(data.cost)

  if (!name || cost === null) return null

  return {
    id,
    name,
    cost,
    imageUrl:
      typeof data.imageUrl === 'string' && data.imageUrl.trim()
        ? data.imageUrl.trim()
        : undefined,
    icon:
      typeof data.icon === 'string' && data.icon.trim()
        ? data.icon.trim()
        : undefined,
    active: data.active !== false,
  }
}

export async function seedDefaultRewardsIfEmpty(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, REWARDS_COLLECTION))
    if (!snapshot.empty) return

    await Promise.all(
      DEFAULT_REWARDS.map((reward) =>
        addDoc(collection(db, REWARDS_COLLECTION), reward),
      ),
    )
  } catch (error) {
    console.error('[rewardsService] seedDefaultRewardsIfEmpty failed:', error)
  }
}

export function subscribeToRewards(
  callback: (rewards: ShopReward[]) => void,
  options?: { activeOnly?: boolean },
): () => void {
  return onSnapshot(
    collection(db, REWARDS_COLLECTION),
    (snapshot) => {
      let rewards = snapshot.docs
        .map((docSnap) => mapDocToReward(docSnap.id, docSnap.data()))
        .filter((item): item is ShopReward => item !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'it'))

      if (options?.activeOnly) {
        rewards = rewards.filter((reward) => reward.active)
      }

      callback(rewards)
    },
    (error) => {
      console.error('[rewardsService] subscribeToRewards failed:', error)
      callback([])
    },
  )
}

export async function createReward(
  name: string,
  cost: number,
  imageUrl?: string,
): Promise<void> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Nome premio obbligatorio.')
  }

  const normalizedCost = normalizeCost(cost)
  if (normalizedCost === null) {
    throw new Error('Costo non valido.')
  }

  await addDoc(collection(db, REWARDS_COLLECTION), {
    name: trimmedName,
    cost: normalizedCost,
    imageUrl: imageUrl?.trim() || null,
    icon: inferRewardIconKey(trimmedName),
    active: true,
  })
}

export async function setRewardActive(
  id: string,
  active: boolean,
): Promise<void> {
  await updateDoc(doc(db, REWARDS_COLLECTION, id), { active })
}

export async function updateRewardCost(id: string, cost: number): Promise<void> {
  const normalizedCost = normalizeCost(cost)
  if (normalizedCost === null) {
    throw new Error('Costo non valido.')
  }

  await updateDoc(doc(db, REWARDS_COLLECTION, id), { cost: normalizedCost })
}

export async function deleteReward(id: string): Promise<void> {
  await deleteDoc(doc(db, REWARDS_COLLECTION, id))
}
