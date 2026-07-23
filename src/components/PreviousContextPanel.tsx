export interface PreviousSegmentContext {
  id: number | string
  latino: string
  traduzione: string
  /** Posizione 1-based del segmento nella versione (opzionale, per etichetta). */
  segmentNumber?: number
}

interface PreviousContextPanelProps {
  segments: PreviousSegmentContext[]
}

export function PreviousContextPanel({ segments }: PreviousContextPanelProps) {
  if (segments.length === 0) return null

  return (
    <details
      open
      className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm"
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-blue-900 marker:content-none [&::-webkit-details-marker]:hidden">
        📖 Contesto precedente (Segmenti completati)
      </summary>

      <div className="mt-4 space-y-0">
        {segments.map((segment, index) => (
          <div key={String(segment.id)}>
            {index > 0 ? (
              <hr className="my-3 border-blue-200" aria-hidden />
            ) : null}

            <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
              Segmento {segment.segmentNumber ?? index + 1}
            </p>
            <p className="mt-1 font-serif text-sm italic leading-relaxed text-slate-600">
              {segment.latino}
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
              {segment.traduzione.trim() || (
                <span className="font-normal italic text-slate-400">
                  (traduzione non disponibile)
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </details>
  )
}
