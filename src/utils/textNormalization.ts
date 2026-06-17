import type { TranslationValue } from '../types'

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function toTranslationVariants(value: TranslationValue): string[] {
  return Array.isArray(value) ? value : [value]
}

export function getPrimaryTranslation(value: TranslationValue): string {
  return Array.isArray(value) ? value[0] : value
}

export function matchesTranslation(
  userInput: string,
  reference: TranslationValue,
): boolean {
  const normalizedInput = normalizeString(userInput)
  return toTranslationVariants(reference).some(
    (variant) => normalizeString(variant) === normalizedInput,
  )
}
