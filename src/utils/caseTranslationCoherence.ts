import {
  CASE_CHIP_LABELS,
  normalizeCase,
  type LatinCase,
} from './caseAnalysis'
import { isConjunctionWord, isInvariableWord, normalizeLatinToken } from './grammatica'
import { normalizeString } from './textNormalization'

export interface CaseTranslationCoherenceIssue {
  message: string
  suggestedCase: LatinCase
  severity: 'warning'
}

const CONJUNCTION_CASES = new Set([
  'congiunzione',
  'subordinata',
  'indeclinabile',
])

const PREPOSITION_CASES = new Set(['ablativo', 'accusativo', 'locativo'])

interface PolysemousRule {
  conjunctionHints: string[]
  prepositionHints: string[]
  conjunctionCases: LatinCase[]
  prepositionCases: LatinCase[]
}

const POLYSEMOUS_RULES: Record<string, PolysemousRule> = {
  cum: {
    conjunctionHints: ['quando', 'poiche', 'siccome', 'mentre', 'allorche'],
    prepositionHints: ['con', 'insieme a', 'assiem'],
    conjunctionCases: ['subordinata', 'congiunzione'],
    prepositionCases: ['ablativo'],
  },
  dum: {
    conjunctionHints: ['mentre', 'finché', 'finche', 'fintanto', 'fino a quando'],
    prepositionHints: [],
    conjunctionCases: ['subordinata', 'congiunzione', 'indeclinabile'],
    prepositionCases: ['ablativo'],
  },
}

const CONJUNCTION_TRANSLATION_HINTS = [
  'e',
  'ed',
  'ma',
  'oppure',
  'o',
  'perche',
  'che',
  'quando',
  'se',
  'dunque',
  'infatti',
  'anche',
  'tuttavia',
  'cosi',
  'affinche',
  'mentre',
  'finché',
  'finche',
  'non',
  'ne',
  'neanche',
  'neppure',
]

function translationMatchesHint(normalized: string, hints: string[]): boolean {
  if (!normalized) return false

  return hints.some((hint) => {
    const normalizedHint = normalizeString(hint)
    if (!normalizedHint) return false
    if (normalized === normalizedHint) return true
    if (normalized.startsWith(`${normalizedHint} `)) return true
    return normalized.split(' ')[0] === normalizedHint
  })
}

function detectTranslationRole(
  latinWord: string,
  normalizedTranslation: string,
): 'conjunction' | 'preposition' | 'unknown' {
  const rule = POLYSEMOUS_RULES[latinWord]
  if (rule) {
    if (translationMatchesHint(normalizedTranslation, rule.prepositionHints)) {
      return 'preposition'
    }
    if (translationMatchesHint(normalizedTranslation, rule.conjunctionHints)) {
      return 'conjunction'
    }
    return 'unknown'
  }

  if (
    isConjunctionWord(latinWord) &&
    translationMatchesHint(normalizedTranslation, CONJUNCTION_TRANSLATION_HINTS)
  ) {
    return 'conjunction'
  }

  return 'unknown'
}

function isConjunctionCase(selectedCase: string): boolean {
  return CONJUNCTION_CASES.has(normalizeCase(selectedCase))
}

function isPrepositionCase(selectedCase: string): boolean {
  return PREPOSITION_CASES.has(normalizeCase(selectedCase))
}

function formatCaseLabel(caseValue: LatinCase): string {
  return CASE_CHIP_LABELS[caseValue]
}

function getTranslationSnippet(normalizedTranslation: string): string {
  return normalizedTranslation.split(' ').slice(0, 2).join(' ')
}

function buildPolysemousIssue(
  latinWord: string,
  selectedCase: string,
  role: 'conjunction' | 'preposition',
  rule: PolysemousRule,
  normalizedTranslation: string,
): CaseTranslationCoherenceIssue | null {
  const selectedLabel = formatCaseLabel(normalizeCase(selectedCase) as LatinCase)
  const snippet = getTranslationSnippet(normalizedTranslation)

  if (role === 'preposition' && isConjunctionCase(selectedCase)) {
    const suggested = rule.prepositionCases[0]
    return {
      severity: 'warning',
      suggestedCase: suggested,
      message: `Attenzione: se traduci «${latinWord}» con «${snippet}», stai pensando alla preposizione con ablativo. La categoria corretta è ${formatCaseLabel(suggested)}, non ${selectedLabel}.`,
    }
  }

  if (role === 'conjunction' && isPrepositionCase(selectedCase)) {
    const suggested = rule.conjunctionCases[0]
    return {
      severity: 'warning',
      suggestedCase: suggested,
      message: `Attenzione: se traduci «${latinWord}» con «${snippet}», è una congiunzione temporale. Scegli ${formatCaseLabel(suggested)} o Congiunzione, non ${selectedLabel}.`,
    }
  }

  return null
}

function buildConjunctionWordIssue(
  latinWord: string,
  selectedCase: string,
): CaseTranslationCoherenceIssue | null {
  if (isConjunctionCase(selectedCase)) return null

  const selectedLabel = formatCaseLabel(normalizeCase(selectedCase) as LatinCase)

  return {
    severity: 'warning',
    suggestedCase: 'congiunzione',
    message: `Attenzione: «${latinWord}» è una congiunzione. Se la traduci con «e», «ma» o simili, la categoria corretta è Congiunzione, non ${selectedLabel}.`,
  }
}

export function getCaseTranslationCoherenceIssue(
  parole: string[],
  selectedCase: string | null | undefined,
  userTranslation: string,
): CaseTranslationCoherenceIssue | null {
  if (!selectedCase || !userTranslation.trim()) return null
  if (parole.length !== 1) return null

  const latinWord = normalizeLatinToken(parole[0])
  if (!latinWord || !isInvariableWord(latinWord)) return null

  const normalizedTranslation = normalizeString(userTranslation)
  if (normalizedTranslation.length < 2) return null

  const role = detectTranslationRole(latinWord, normalizedTranslation)
  const polysemousRule = POLYSEMOUS_RULES[latinWord]

  if (polysemousRule && role !== 'unknown') {
    return buildPolysemousIssue(
      latinWord,
      selectedCase,
      role,
      polysemousRule,
      normalizedTranslation,
    )
  }

  if (role === 'conjunction' && isConjunctionWord(latinWord)) {
    return buildConjunctionWordIssue(latinWord, selectedCase)
  }

  return null
}
