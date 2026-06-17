import type { Complemento, LatinAnalysis, TranslationValue } from '../types'
import { isValidCase } from './caseAnalysis'
import { getPrimaryTranslation } from './textNormalization'

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
  const words = [analysis.step1_verbo.parola_corretta]
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
