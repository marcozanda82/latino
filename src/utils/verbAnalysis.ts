import type { Step2AnalisiVerbo } from '../types'

export const VALID_MODES = [
  'indicativo',
  'imperativo',
  'infinito',
  'participio',
  'congiuntivo',
] as const

export type LatinMode = (typeof VALID_MODES)[number]

export const VALID_FORMS = ['attiva', 'passiva'] as const

export type LatinForm = (typeof VALID_FORMS)[number]

export const FORM_CHIP_LABELS: Record<LatinForm, string> = {
  attiva: 'Attiva',
  passiva: 'Passiva',
}

export type VerbCategory = keyof Step2AnalisiVerbo

export const VERB_CATEGORY_ORDER: VerbCategory[] = [
  'modo',
  'persona',
  'numero',
  'tempo',
  'forma',
]

const INDEFINITE_MODE_SKIPPED_CATEGORIES: VerbCategory[] = ['persona', 'numero']

export const VERB_CATEGORY_LABELS: Record<VerbCategory, string> = {
  modo: 'Modo',
  persona: 'Persona',
  numero: 'Numero',
  tempo: 'Tempo',
  forma: 'Forma',
}

/** Indicativo: presente, imperfetto, futuro semplice, perfetto, piuccheperfetto, futuro anteriore */
export const INDICATIVE_TEMPO_OPTIONS = [
  'Presente',
  'Imperfetto',
  'Futuro Semplice',
  'Perfetto',
  'Piuccheperfetto',
  'Futuro Anteriore',
] as const

/** Congiuntivo: presente, imperfetto, perfetto, piuccheperfetto */
export const SUBJUNCTIVE_TEMPO_OPTIONS = [
  'Presente',
  'Imperfetto',
  'Perfetto',
  'Piuccheperfetto',
] as const

/** Infinito e Participio: presente, perfetto, futuro */
export const INFINITIVE_PARTICIPLE_TEMPO_OPTIONS = [
  'Presente',
  'Perfetto',
  'Futuro',
] as const

export const IMPERATIVE_TEMPO_OPTIONS = ['Presente', 'Futuro Semplice'] as const

export const VERB_CATEGORY_OPTIONS: Record<VerbCategory, readonly string[]> = {
  modo: ['Indicativo', 'Imperativo', 'Infinito', 'Participio', 'Congiuntivo'],
  persona: ['1ª', '2ª', '3ª'],
  numero: ['Singolare', 'Plurale'],
  tempo: INDICATIVE_TEMPO_OPTIONS,
  forma: Object.values(FORM_CHIP_LABELS),
}

const TEMPO_CANONICAL_ALIASES: Record<string, string> = {
  presente: 'presente',
  imperfetto: 'imperfetto',
  perfetto: 'perfetto',
  piuccheperfetto: 'piuccheperfetto',
  piucheperfetto: 'piuccheperfetto',
  piuquamperfetto: 'piuccheperfetto',
  plusquamperfectum: 'piuccheperfetto',
  plusquamperfecto: 'piuccheperfetto',
  futurosemplice: 'futurosemplice',
  futuroanteriore: 'futuroanteriore',
  futurumanteriore: 'futuroanteriore',
  futurumanterius: 'futuroanteriore',
  anteriore: 'futuroanteriore',
  futuro: 'futuro',
  futurum: 'futuro',
}

const TEMPO_CANONICAL_TO_LABEL: Record<string, string> = {
  presente: 'Presente',
  imperfetto: 'Imperfetto',
  perfetto: 'Perfetto',
  piuccheperfetto: 'Piuccheperfetto',
  futurosemplice: 'Futuro Semplice',
  futuroanteriore: 'Futuro Anteriore',
  futuro: 'Futuro',
}

const MODO_CANONICAL_TO_LABEL: Record<string, string> = {
  indicativo: 'Indicativo',
  imperativo: 'Imperativo',
  infinito: 'Infinito',
  participio: 'Participio',
  congiuntivo: 'Congiuntivo',
}

const NUMERO_CANONICAL_TO_LABEL: Record<string, string> = {
  singolare: 'Singolare',
  plurale: 'Plurale',
}

/** Normalizzazione tollerante richiesta per il matching UI ↔ JSON. */
export function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function baseNormalize(value: string): string {
  return normalizeForComparison(value)
}

function compactNormalized(value: string): string {
  return baseNormalize(value).replace(/\s+/g, '')
}

export function normalizeModo(value: string): string {
  return compactNormalized(value)
}

export function isValidModo(value: string): value is LatinMode {
  return VALID_MODES.includes(normalizeModo(value) as LatinMode)
}

export function normalizeForm(value: string): string {
  return compactNormalized(value)
}

export function isValidForm(value: string): value is LatinForm {
  return VALID_FORMS.includes(normalizeForm(value) as LatinForm)
}

export function isInfinitoMode(value: string): boolean {
  return normalizeModo(value) === 'infinito'
}

export function isIndefiniteMode(value: string): boolean {
  const normalized = normalizeModo(value)
  return normalized === 'infinito' || normalized === 'participio'
}

export function isVerbCategoryRequired(
  category: VerbCategory,
  modo?: string,
): boolean {
  if (!modo || !isIndefiniteMode(modo)) return true
  return !INDEFINITE_MODE_SKIPPED_CATEGORIES.includes(category)
}

export function canonicalizeTempo(value: string, modo?: string): string {
  const compact = compactNormalized(value)
  const normalizedModo = modo ? normalizeModo(modo) : ''

  if (TEMPO_CANONICAL_ALIASES[compact]) {
    const alias = TEMPO_CANONICAL_ALIASES[compact]
    if (alias === 'futuro') {
      if (normalizedModo === 'infinito' || normalizedModo === 'participio') {
        return 'futuro'
      }
      if (normalizedModo === 'indicativo' || normalizedModo === 'imperativo') {
        return 'futurosemplice'
      }
      return 'futuro'
    }
    return alias
  }

  if (compact === 'futurosemplice') return 'futurosemplice'
  if (compact === 'futuroanteriore') return 'futuroanteriore'

  return compact
}

export function getTempoDisplayLabel(value: string, modo?: string): string {
  const canonical = canonicalizeTempo(value, modo)
  return TEMPO_CANONICAL_TO_LABEL[canonical] ?? normalizeForComparison(value)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getTempoOptionsForModo(modo: string | undefined): string[] {
  const normalizedModo = modo ? normalizeModo(modo) : ''

  switch (normalizedModo) {
    case 'imperativo':
      return [...IMPERATIVE_TEMPO_OPTIONS]
    case 'infinito':
    case 'participio':
      return [...INFINITIVE_PARTICIPLE_TEMPO_OPTIONS]
    case 'congiuntivo':
      return [...SUBJUNCTIVE_TEMPO_OPTIONS]
    case 'indicativo':
      return [...INDICATIVE_TEMPO_OPTIONS]
    default:
      return [...INDICATIVE_TEMPO_OPTIONS]
  }
}

/** Etichetta chip UI per un valore canonico o salvato (es. `indicativo` → `Indicativo`). */
export function getVerbChipLabel(
  category: VerbCategory,
  value: string,
  modo?: string,
): string {
  return getDisplayLabelForExpected(category, value, modo)
}

function getDisplayLabelForExpected(
  category: VerbCategory,
  expected: string,
  modo?: string,
): string {
  switch (category) {
    case 'modo':
      return MODO_CANONICAL_TO_LABEL[normalizeModo(expected)] ?? expected.trim()
    case 'numero':
      return NUMERO_CANONICAL_TO_LABEL[compactNormalized(expected)] ?? expected.trim()
    case 'tempo':
      return getTempoDisplayLabel(expected, modo)
    case 'forma':
      return FORM_CHIP_LABELS[normalizeForm(expected) as LatinForm] ?? expected.trim()
    case 'persona': {
      const digit = expected.replace(/\D/g, '')
      if (digit === '1') return '1ª'
      if (digit === '2') return '2ª'
      if (digit === '3') return '3ª'
      return expected.trim()
    }
    default:
      return expected.trim()
  }
}

function mergeUniqueOptions(options: string[]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const option of options) {
    const key = compactNormalized(option)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(option)
  }

  return merged
}

function tempoOptionMatchesExpected(
  option: string,
  expected: string,
  modo?: string,
): boolean {
  if (canonicalizeTempo(option, modo) === canonicalizeTempo(expected, modo)) {
    return true
  }

  if (normalizeForComparison(option) === normalizeForComparison(expected)) {
    return true
  }

  const optionCompact = compactNormalized(option)
  const expectedCompact = compactNormalized(expected)
  if (optionCompact === expectedCompact) return true

  return (
    canonicalizeTempo(option, modo) === canonicalizeTempo(expected, modo) ||
    canonicalizeTempo(option, 'indicativo') ===
      canonicalizeTempo(expected, 'indicativo')
  )
}

function ensureExpectedOption(
  category: VerbCategory,
  options: string[],
  expected: string | null | undefined,
  modo?: string,
): string[] {
  if (!expected?.trim()) return options

  const expectedLabel = getDisplayLabelForExpected(category, expected, modo)

  const alreadyPresent = options.some((option) => {
    if (category === 'tempo') {
      return tempoOptionMatchesExpected(option, expected, modo)
    }
    if (category === 'modo') {
      return normalizeModo(option) === normalizeModo(expected)
    }
    if (category === 'forma') {
      return normalizeForm(option) === normalizeForm(expected)
    }
    if (category === 'persona') {
      return (
        normalizeVerbAnswer('persona', option) ===
        normalizeVerbAnswer('persona', expected)
      )
    }
    return compactNormalized(option) === compactNormalized(expected)
  })

  if (alreadyPresent) return options
  return [...options, expectedLabel]
}

export function getVerbCategoryOptions(
  category: VerbCategory,
  analisiVerbo: Step2AnalisiVerbo,
  selectedAnswers: Partial<Record<VerbCategory, string>>,
): string[] {
  const expected = analisiVerbo[category]
  const modo = selectedAnswers.modo ?? analisiVerbo.modo

  if (category === 'tempo') {
    const options = getTempoOptionsForModo(modo)
    return ensureExpectedOption(
      category,
      mergeUniqueOptions(options),
      expected,
      modo,
    )
  }

  return ensureExpectedOption(
    category,
    mergeUniqueOptions([...VERB_CATEGORY_OPTIONS[category]]),
    expected,
    modo,
  )
}

export function getRequiredVerbCategories(
  _completed: Record<VerbCategory, boolean>,
  selectedAnswers: Partial<Record<VerbCategory, string>>,
  expectedModo?: string,
): VerbCategory[] {
  const modoAnswer = selectedAnswers.modo ?? expectedModo
  if (modoAnswer && isIndefiniteMode(modoAnswer)) {
    return VERB_CATEGORY_ORDER.filter((category) =>
      isVerbCategoryRequired(category, modoAnswer),
    )
  }
  return VERB_CATEGORY_ORDER
}

export function normalizeVerbAnswer(
  category: VerbCategory,
  value: string,
  modo?: string,
): string {
  if (category === 'persona') {
    const digit = value.replace(/\D/g, '')
    return digit || compactNormalized(value)
  }

  if (category === 'tempo') {
    return canonicalizeTempo(value, modo)
  }

  if (category === 'modo') {
    return normalizeModo(value)
  }

  if (category === 'forma') {
    return normalizeForm(value)
  }

  return compactNormalized(value)
}

export function isVerbAnswerCorrect(
  category: VerbCategory,
  selected: string,
  expected: string | null | undefined,
  modo?: string,
): boolean {
  if (
    isIndefiniteMode(modo ?? '') &&
    INDEFINITE_MODE_SKIPPED_CATEGORIES.includes(category)
  ) {
    return true
  }

  if (!selected?.trim()) return false
  if (!expected?.trim()) {
    return (
      isIndefiniteMode(modo ?? '') &&
      INDEFINITE_MODE_SKIPPED_CATEGORIES.includes(category)
    )
  }

  if (category === 'tempo') {
    return tempoOptionMatchesExpected(selected, expected, modo)
  }

  return (
    normalizeVerbAnswer(category, selected, modo) ===
    normalizeVerbAnswer(category, expected, modo)
  )
}

export function verbChipSelectionsMatch(
  category: VerbCategory,
  option: string,
  selected: string | undefined,
  modo?: string,
): boolean {
  if (!selected?.trim()) return false
  if (option === selected) return true
  return (
    isVerbAnswerCorrect(category, option, selected, modo) ||
    isVerbAnswerCorrect(category, selected, option, modo)
  )
}

export function sanitizeStep2State(
  analisiVerbo: Step2AnalisiVerbo,
  completed: Record<VerbCategory, boolean>,
  selectedAnswers: Partial<Record<VerbCategory, string>>,
): {
  completed: Record<VerbCategory, boolean>
  selectedAnswers: Partial<Record<VerbCategory, string>>
} {
  const modo = selectedAnswers.modo ?? analisiVerbo.modo
  const indefinite = isIndefiniteMode(modo)
  const nextCompleted = { ...completed }
  const nextSelected: Partial<Record<VerbCategory, string>> = {}

  if (indefinite) {
    for (const category of INDEFINITE_MODE_SKIPPED_CATEGORIES) {
      nextCompleted[category] = true
    }
  }

  for (const category of VERB_CATEGORY_ORDER) {
    if (indefinite && INDEFINITE_MODE_SKIPPED_CATEGORIES.includes(category)) {
      continue
    }

    const selected = selectedAnswers[category]
    const expected = analisiVerbo[category]

    if (!selected?.trim()) {
      nextCompleted[category] = false
      continue
    }

    if (!expected?.trim()) {
      if (indefinite && INDEFINITE_MODE_SKIPPED_CATEGORIES.includes(category)) {
        nextCompleted[category] = true
        continue
      }
      nextCompleted[category] = false
      continue
    }

    if (isVerbAnswerCorrect(category, selected, expected, modo)) {
      nextSelected[category] = getDisplayLabelForExpected(category, expected, modo)
      nextCompleted[category] = true
      continue
    }

    nextCompleted[category] = false
  }

  return { completed: nextCompleted, selectedAnswers: nextSelected }
}

/** Token del verbo in \`parole_array\` (anche forme composte). */
export function getVerbParoleFromCorretta(parolaCorretta: string): string[] {
  const normalized = parolaCorretta.trim()
  if (!normalized) return []

  const parts = normalized.split(/\s+/).filter(Boolean)
  return parts.length > 0 ? parts : [normalized]
}

/** Verifica se una parola o parte di un verbo composto è quella attesa. */
export function isCorrectVerbWord(
  tileWord: string,
  parolaCorretta: string,
): boolean {
  const normalizedTile = tileWord.trim()
  const normalizedVerb = parolaCorretta.trim()

  if (!normalizedTile || !normalizedVerb) return false
  if (normalizedTile === normalizedVerb) return true

  const parts = normalizedVerb.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return parts.includes(normalizedTile)
  }

  return false
}

/** Il verbo indicato copre parole presenti nella frase (anche forme composte). */
export function verbMatchesParoleArray(
  parolaCorretta: string,
  paroleArray: string[],
): boolean {
  const normalizedVerb = parolaCorretta.trim()
  if (!normalizedVerb) return false
  if (paroleArray.includes(normalizedVerb)) return true

  const parts = normalizedVerb.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return parts.every((part) => paroleArray.includes(part))
  }

  return false
}

export function formatVerbDisplay(
  parolaCorretta: string,
  selectedWord?: string | null,
): string {
  const normalizedVerb = parolaCorretta.trim()
  if (!normalizedVerb) return '—'

  const parts = normalizedVerb.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return selectedWord?.trim() || normalizedVerb
  }

  return normalizedVerb
}
