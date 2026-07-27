/** Parole latine invariabili più comuni (confronto in lowercase). */
export const INVARIABLE_WORDS = [
  'quoque',
  'et',
  'atque',
  'ac',
  'sed',
  'aut',
  'vel',
  'nec',
  'neque',
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
  'cum',
  'dum',
  'si',
  'nisi',
] as const

/** Congiunzioni principali — sinonimia con "indeclinabile" nello Step 5. */
export const CONJUNCTION_WORDS = [
  'et',
  'atque',
  'ac',
  'sed',
  'aut',
  'vel',
  'nec',
  'neque',
  'nam',
  'enim',
  'igitur',
  'itaque',
] as const

const INVARIABLE_WORD_SET = new Set<string>(INVARIABLE_WORDS)
const CONJUNCTION_WORD_SET = new Set<string>(CONJUNCTION_WORDS)

const INVARIABLE_CLASSIFICATIONS = new Set(['indeclinabile', 'congiunzione'])

export function normalizeLatinToken(token: string): string {
  return token.toLowerCase().trim()
}

export function isInvariableWord(word: string): boolean {
  const normalized = normalizeLatinToken(word)
  if (!normalized) return false
  return INVARIABLE_WORD_SET.has(normalized)
}

export function isConjunctionWord(word: string): boolean {
  const normalized = normalizeLatinToken(word)
  if (!normalized) return false
  return CONJUNCTION_WORD_SET.has(normalized)
}

export function isInvariableClassification(value: string): boolean {
  return INVARIABLE_CLASSIFICATIONS.has(normalizeLatinToken(value))
}

/** Caso predefinito per parole invariabili scollegate dai blocchi misti. */
export function getDefaultCaseForInvariableWord(
  word: string,
): 'congiunzione' | 'indeclinabile' {
  return isConjunctionWord(word) ? 'congiunzione' : 'indeclinabile'
}

/** Override Step 5: parola invariabile singola classificata come indeclinabile/congiunzione. */
export function isInvariableShieldMatch(
  parole: string[],
  selectedCase: string,
): boolean {
  if (parole.length !== 1) return false
  if (!isInvariableWord(parole[0])) return false
  return isInvariableClassification(selectedCase)
}

/** Sinonimia indeclinabile ↔ congiunzione per parole in `INVARIABLE_WORDS`. */
export function areInvariableCasesSynonymous(
  selectedCase: string,
  expectedCase: string,
  parole: string[],
): boolean {
  if (parole.length !== 1 || !isInvariableWord(parole[0])) return false

  const selected = normalizeLatinToken(selectedCase)
  const expected = normalizeLatinToken(expectedCase)

  return (
    isInvariableClassification(selected) &&
    isInvariableClassification(expected) &&
    selected !== expected
  )
}

/** @deprecated Usa isInvariableShieldMatch */
export function isIndeclinableShieldMatch(
  parole: string[],
  selectedCase: string,
): boolean {
  return isInvariableShieldMatch(parole, selectedCase)
}
