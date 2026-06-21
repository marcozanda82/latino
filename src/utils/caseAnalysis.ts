export const VALID_CASES = [
  'nominativo',
  'genitivo',
  'dativo',
  'accusativo',
  'vocativo',
  'ablativo',
  'locativo',
  'indeclinabile',
  'subordinata',
] as const

export type LatinCase = (typeof VALID_CASES)[number]

export const CASE_CHIP_LABELS: Record<LatinCase, string> = {
  nominativo: 'Nominativo',
  genitivo: 'Genitivo',
  dativo: 'Dativo',
  accusativo: 'Accusativo',
  vocativo: 'Vocativo',
  ablativo: 'Ablativo',
  locativo: 'Locativo',
  indeclinabile: 'Indeclinabile',
  subordinata: 'Subordinata',
}

export const CASE_CHIP_VARIANTS: Partial<
  Record<LatinCase, 'default' | 'subordinate'>
> = {
  subordinata: 'subordinate',
}

export const CASE_ERROR_TOAST =
  'Caso errato. Ripensa alla funzione sintattica di questo blocco.'

function baseNormalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function normalizeCase(value: string): string {
  return baseNormalize(value)
}

export function isCaseCorrect(selected: string, expected: string): boolean {
  return normalizeCase(selected) === normalizeCase(expected)
}

export function isValidCase(value: string): value is LatinCase {
  return VALID_CASES.includes(normalizeCase(value) as LatinCase)
}
