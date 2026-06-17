import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

export interface GamificationSettings {
  weeklyTarget: number
  currentReward: string
}

const SETTINGS_DOC_ID = 'gamification'

export const DEFAULT_GAMIFICATION_SETTINGS: GamificationSettings = {
  weeklyTarget: 5,
  currentReward: 'Ricompensa Weekend',
}

function parseSettings(data: Record<string, unknown>): GamificationSettings {
  return {
    weeklyTarget:
      typeof data.weeklyTarget === 'number' && data.weeklyTarget > 0
        ? data.weeklyTarget
        : DEFAULT_GAMIFICATION_SETTINGS.weeklyTarget,
    currentReward:
      typeof data.currentReward === 'string' && data.currentReward.trim()
        ? data.currentReward.trim()
        : DEFAULT_GAMIFICATION_SETTINGS.currentReward,
  }
}

export async function getSettings(): Promise<GamificationSettings> {
  try {
    const docSnap = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID))
    if (!docSnap.exists()) return DEFAULT_GAMIFICATION_SETTINGS
    return parseSettings(docSnap.data())
  } catch (error) {
    console.error('[settingsService] getSettings failed:', error)
    return DEFAULT_GAMIFICATION_SETTINGS
  }
}

export async function updateSettings(
  settings: GamificationSettings,
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'settings', SETTINGS_DOC_ID),
      {
        weeklyTarget: settings.weeklyTarget,
        currentReward: settings.currentReward.trim(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error('[settingsService] updateSettings failed:', error)
    throw error
  }
}
