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

export const VERB_CATEGORY_LABELS: Record<VerbCategory, string> = {
  modo: 'Modo',
  persona: 'Persona',
  numero: 'Numero',
  tempo: 'Tempo',
  forma: 'Forma',
}

export const VERB_CATEGORY_OPTIONS: Record<VerbCategory, readonly string[]> = {
  modo: ['Indicativo', 'Imperativo', 'Infinito', 'Participio', 'Congiuntivo'],
  persona: ['1ª', '2ª', '3ª'],
  numero: ['Singolare', 'Plurale'],
  tempo: [
    'Presente',
    'Imperfetto',
    'Perfetto',
    'Piuccheperfetto',
    'Futuro Semplice',
    'Futuro Anteriore',
  ],
  forma: Object.values(FORM_CHIP_LABELS),
}

function baseNormalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function normalizeModo(value: string): string {
  return baseNormalize(value)
}

export function isValidModo(value: string): value is LatinMode {
  return VALID_MODES.includes(normalizeModo(value) as LatinMode)
}

export function normalizeForm(value: string): string {
  return baseNormalize(value)
}

export function isValidForm(value: string): value is LatinForm {
  return VALID_FORMS.includes(normalizeForm(value) as LatinForm)
}

export function isInfinitoMode(value: string): boolean {
  return normalizeModo(value) === 'infinito'
}

export function getRequiredVerbCategories(
  completed: Record<VerbCategory, boolean>,
  selectedAnswers: Partial<Record<VerbCategory, string>>,
): VerbCategory[] {
  const modoAnswer = selectedAnswers.modo
  if (completed.modo && modoAnswer && isInfinitoMode(modoAnswer)) {
    return VERB_CATEGORY_ORDER.filter((category) => category !== 'persona')
  }
  return VERB_CATEGORY_ORDER
}

export function normalizeVerbAnswer(
  category: VerbCategory,
  value: string,
): string {
  const normalized = baseNormalize(value).replace(/\s+/g, '')

  if (category === 'persona') {
    const digit = value.replace(/\D/g, '')
    return digit || normalized
  }

  return normalized
}

export function isVerbAnswerCorrect(
  category: VerbCategory,
  selected: string,
  expected: string,
): boolean {
  if (!selected?.trim() || !expected?.trim()) return false

  return (
    normalizeVerbAnswer(category, selected).toLowerCase() ===
    normalizeVerbAnswer(category, expected).toLowerCase()
  )
}
