import type { Complemento, LatinAnalysis, TranslationValue } from '../types'
import { isValidCase } from './caseAnalysis'
import { getDefaultCaseForInvariableWord, isInvariableWord } from './grammatica'
import { getPrimaryTranslation } from './textNormalization'
import { isPunctuation, withoutPunctuation } from './stringUtils'
import { getVerbParoleFromCorretta } from './verbAnalysis'

function isTranslationValue(value: unknown): value is TranslationValue {
  if (typeof value === 'string') return true
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string')
  )
}

export function buildFullTranslation(analysis: LatinAnalysis): string {
  const parts = [
    getPrimaryTranslation(analysis.step4_nucleo_tradotto),
    ...analysis.step5_complementi.map((item) =>
      getPrimaryTranslation(item.traduzione),
    ),
  ].filter(Boolean)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** Complemento formato solo da segni di punteggiatura (es. `{ parole: ["."] }`). */
export function isPunctuationOnlyComplement(complemento: Complemento): boolean {
  return (
    complemento.parole.length > 0 &&
    complemento.parole.every((word) => isPunctuation(word))
  )
}

function buildInvariableComplement(word: string, traduzione: TranslationValue): Complemento {
  return {
    parole: [word],
    caso: getDefaultCaseForInvariableWord(word),
    traduzione,
  }
}

/** Separa le parole invariabili inglobate erroneamente in blocchi misti. */
export function expandInvariableComplementi(
  complementi: Complemento[],
): Complemento[] {
  const expanded: Complemento[] = []

  for (const complemento of complementi) {
    if (isPunctuationOnlyComplement(complemento)) continue

    const hasInvariable = complemento.parole.some((word) => isInvariableWord(word))
    if (!hasInvariable) {
      expanded.push(complemento)
      continue
    }

    const hasVariable = complemento.parole.some(
      (word) => !isInvariableWord(word) && !isPunctuation(word),
    )

    if (!hasVariable) {
      for (const word of complemento.parole) {
        if (isPunctuation(word)) continue
        expanded.push(
          buildInvariableComplement(
            word,
            complemento.parole.length === 1
              ? complemento.traduzione
              : word,
          ),
        )
      }
      continue
    }

    let variableBuffer: string[] = []

    const flushVariableBuffer = () => {
      if (variableBuffer.length === 0) return
      expanded.push({
        parole: [...variableBuffer],
        caso: complemento.caso,
        traduzione: complemento.traduzione,
      })
      variableBuffer = []
    }

    for (const word of complemento.parole) {
      if (isPunctuation(word)) continue

      if (isInvariableWord(word)) {
        flushVariableBuffer()
        expanded.push(buildInvariableComplement(word, word))
        continue
      }

      variableBuffer.push(word)
    }

    flushVariableBuffer()
  }

  return expanded
}

/** Complementi che lo studente deve classificare nello Step 5. */
export function getInteractiveComplementi(
  complementi: Complemento[],
): Complemento[] {
  return expandInvariableComplementi(complementi).filter(
    (complemento) => !isPunctuationOnlyComplement(complemento),
  )
}

/** Parole della frase rilevanti per la selezione interattiva (es. Step 3). */
export function getInteractiveParoleArray(paroleArray: string[]): string[] {
  return withoutPunctuation(paroleArray)
}

/** Parole rimanenti dopo verbo e soggetto, escluse la punteggiatura. */
export function getRemainingInteractiveWords(analysis: LatinAnalysis): string[] {
  const verbParts = getVerbParoleFromCorretta(
    analysis.step1_verbo.parola_corretta,
  )
  const subjectParts = analysis.step3_soggetto.sottinteso
    ? []
    : analysis.step3_soggetto.parole_corrette

  return withoutPunctuation(
    analysis.parole_array.filter(
      (word) => !verbParts.includes(word) && !subjectParts.includes(word),
    ),
  )
}

function sortedWords(words: string[]): string[] {
  return [...words].sort()
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = sortedWords(a)
  const sortedB = sortedWords(b)
  return sortedA.every((word, index) => word === sortedB[index])
}

function getNucleusWords(analysis: LatinAnalysis): string[] {
  const words = getVerbParoleFromCorretta(analysis.step1_verbo.parola_corretta)
  if (!analysis.step3_soggetto.sottinteso) {
    words.push(...analysis.step3_soggetto.parole_corrette)
  }
  return words
}

function validateComplementStructure(complementi: unknown): complementi is Complemento[] {
  if (!Array.isArray(complementi)) return false

  return complementi.every((item) => {
    if (!item || typeof item !== 'object') return false
    const comp = item as Record<string, unknown>
    return (
      Array.isArray(comp.parole) &&
      comp.parole.length > 0 &&
      comp.parole.every((word) => typeof word === 'string') &&
      typeof comp.caso === 'string' &&
      isTranslationValue(comp.traduzione) &&
      isValidCase(comp.caso)
    )
  })
}

export function validateComplementsCoherence(
  analysis: LatinAnalysis,
): string | null {
  const nucleusWords = getNucleusWords(analysis)
  const complementWords: string[] = []

  for (const complemento of analysis.step5_complementi) {
    for (const word of complemento.parole) {
      if (!analysis.parole_array.includes(word)) {
        return `La parola "${word}" in step5_complementi non compare in parole_array.`
      }

      if (nucleusWords.includes(word)) {
        return `La parola "${word}" è già usata nel nucleo (verbo o soggetto).`
      }

      complementWords.push(word)
    }
  }

  const remainingWords = analysis.parole_array.filter(
    (word) => !nucleusWords.includes(word),
  )

  if (!arraysEqual(complementWords, remainingWords)) {
    return 'step5_complementi deve coprire esattamente le parole rimanenti della frase.'
  }

  return null
}

export { validateComplementStructure }
