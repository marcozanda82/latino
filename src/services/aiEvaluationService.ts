const AI_EVALUATION_ENDPOINT =
  import.meta.env.VITE_AI_EVALUATION_URL ?? '/api/evaluate-segment'

const USE_MOCK =
  import.meta.env.VITE_AI_EVALUATION_MOCK !== 'false' ||
  !import.meta.env.VITE_AI_EVALUATION_URL

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function parseScorePayload(payload: unknown): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return clampScore(payload)
  }

  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, unknown>
  const candidates = [data.score, data.accuracy, data.percentage, data.result]

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return clampScore(candidate)
    }
  }

  return null
}

async function mockEvaluateSegmentAccuracy(): Promise<number> {
  await new Promise((resolve) => window.setTimeout(resolve, 650))
  return Math.floor(Math.random() * 101)
}

async function requestAiEvaluation(
  latino: string,
  traduzione: string,
): Promise<number> {
  const response = await fetch(AI_EVALUATION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      latino,
      traduzione,
      prompt:
        'Valuta l\'aderenza semantica e grammaticale della traduzione italiana rispetto al segmento latino. Rispondi SOLO con un numero intero da 0 a 100.',
    }),
  })

  if (!response.ok) {
    throw new Error(`Valutazione AI non disponibile (${response.status})`)
  }

  const payload: unknown = await response.json()
  const score = parseScorePayload(payload)

  if (score === null) {
    throw new Error('Risposta AI non valida: punteggio mancante.')
  }

  return score
}

export async function evaluateSegmentAccuracy(
  latino: string,
  traduzione: string,
): Promise<number> {
  const trimmedLatino = latino.trim()
  const trimmedTraduzione = traduzione.trim()

  if (!trimmedLatino || !trimmedTraduzione) {
    throw new Error('Latino e traduzione sono obbligatori per la valutazione.')
  }

  try {
    if (USE_MOCK) {
      return mockEvaluateSegmentAccuracy()
    }

    return await requestAiEvaluation(trimmedLatino, trimmedTraduzione)
  } catch (error) {
    console.error('[aiEvaluationService] evaluateSegmentAccuracy failed:', error)
    throw error
  }
}
