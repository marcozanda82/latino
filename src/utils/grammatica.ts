/** Parole latine invariabili più comuni (confronto in lowercase). */
export const INVARIABLE_WORDS = [
  'quoque',
  'et',
  'sed',
  'non',
  'nam',
  'enim',
  'autem',
  'etiam',
  'ita',
  'sic',
  'tam',
  'tamen',
  'igitur',
  'itaque',
  'vero',
  'at',
  'atque',
  'ac',
  'cum',
  'dum',
  'si',
  'nisi',
] as const

const INVARIABLE_WORD_SET = new Set<string>(INVARIABLE_WORDS)

export function normalizeLatinToken(token: string): string {
  return token.toLowerCase().trim()
}

export function isInvariableWord(word: string): boolean {
  const normalized = normalizeLatinToken(word)
  if (!normalized) return false
  return INVARIABLE_WORD_SET.has(normalized)
}

/** Override Step 5: parola invariabile singola classificata come indeclinabile. */
export function isIndeclinableShieldMatch(
  parole: string[],
  selectedCase: string,
): boolean {
  if (normalizeLatinToken(selectedCase) !== 'indeclinabile') return false
  if (parole.length !== 1) return false
  return isInvariableWord(parole[0])
}
