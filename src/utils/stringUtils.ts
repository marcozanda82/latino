/** Segni di punteggiatura latini/comuni ammessi come token a sé stanti. */
const PUNCTUATION_ONLY_PATTERN = /^[\s.,;:!?—\-–"'«»()\[\]{}…]+$/u

/** True se il token è composto esclusivamente da punteggiatura (es. ".", ",", "—"). */
export function isPunctuation(token: string): boolean {
  const trimmed = token.trim()
  if (!trimmed) return false
  return PUNCTUATION_ONLY_PATTERN.test(trimmed)
}

/** Esclude i token di sola punteggiatura da un elenco di parole. */
export function withoutPunctuation(tokens: string[]): string[] {
  return tokens.filter((token) => !isPunctuation(token))
}
