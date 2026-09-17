import type { Complemento, TranslationValue } from '../types'
import { isPunctuation } from './stringUtils'

const INVARIABLE_ITALIAN: Record<string, string> = {
  et: 'e',
  atque: 'e',
  ac: 'e',
  sed: 'ma',
  aut: 'oppure',
  vel: 'oppure',
  nec: 'e non',
  neque: 'e non',
  non: 'non',
  nam: 'infatti',
  enim: 'infatti',
  autem: 'invece',
  etiam: 'anche',
  ita: 'così',
  sic: 'così',
  tam: 'così',
  tamen: 'tuttavia',
  igitur: 'dunque',
  itaque: 'dunque',
  vero: 'invece',
  at: 'ma',
  dum: 'finché',
  si: 'se',
  nisi: 'se non',
  quoque: 'anche',
  que: 'e',
  ut: 'affinché',
  ne: 'affinché non',
  quod: 'che',
  quia: 'perché',
  quoniam: 'poiché',
  ubi: 'dove',
  unde: 'da dove',
  quo: 'dove',
  me: 'mi',
  te: 'ti',
  se: 'sé',
  nos: 'ci',
  vos: 'vi',
  eum: 'lo',
  eam: 'la',
  eos: 'li',
  eas: 'le',
  mihi: 'a me',
  tibi: 'a te',
  sibi: 'a sé',
  nobis: 'a noi',
  vobis: 'a voi',
}

function normalizeToken(value: string): string {
  return value.toLowerCase().trim()
}

function isPunctuationOnly(parole: string[]): boolean {
  return parole.length > 0 && parole.every((word) => isPunctuation(word))
}

export function isTranslationEcho(
  parole: string[],
  traduzione: TranslationValue,
): boolean {
  if (isPunctuationOnly(parole)) return false

  const variants = Array.isArray(traduzione) ? traduzione : [traduzione]
  const latinJoined = parole.join(' ')

  return variants.some((variant) => {
    const normalizedVariant = normalizeToken(String(variant))
    if (normalizedVariant === normalizeToken(latinJoined)) return true
    if (parole.length === 1 && normalizedVariant === normalizeToken(parole[0])) {
      return true
    }
    return false
  })
}

export function resolveItalianTranslation(
  parole: string[],
  caso?: string,
  tipoProposizione?: string,
): string | null {
  if (parole.length !== 1) return null

  const word = normalizeToken(parole[0])
  const normalizedCase = caso ? normalizeToken(caso) : ''

  if (word === 'cum') {
    if (normalizedCase === 'ablativo') return 'con'
    if (normalizedCase === 'subordinata' || tipoProposizione === 'subordinata') {
      return 'quando'
    }
    return 'quando'
  }

  return INVARIABLE_ITALIAN[word] ?? null
}

export function fixTranslationEcho(
  parole: string[],
  traduzione: TranslationValue,
  caso?: string,
  tipoProposizione?: string,
): TranslationValue {
  if (!isTranslationEcho(parole, traduzione)) return traduzione

  const suggested = resolveItalianTranslation(parole, caso, tipoProposizione)
  if (!suggested) return traduzione

  return Array.isArray(traduzione)
    ? traduzione.map(() => suggested)
    : suggested
}

export function fixComplementiTranslationEcho(
  complementi: Complemento[],
  tipoProposizione?: string,
): Complemento[] {
  return complementi.map((complemento) => ({
    ...complemento,
    traduzione: fixTranslationEcho(
      complemento.parole,
      complemento.traduzione,
      complemento.caso,
      tipoProposizione,
    ),
  }))
}
