import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { LevelCardsSkeleton } from './ui/Skeletons'
import { useExercises } from '../context/ExerciseContext'
import { subscribeToArchivedEvaluations } from '../services/firebaseEvaluations'
import type { PendingTranslation } from '../types/evaluation'
import type { LatinAnalysis } from '../types'
import { VERB_CATEGORY_LABELS } from '../utils/verbAnalysis'

function formatDate(value?: { toDate?: () => Date }): string {
  if (!value?.toDate) return '—'
  return value.toDate().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function statusLabel(status: PendingTranslation['status']): string {
  if (status === 'approved') return 'Auto-convalidata'
  if (status === 'verde') return 'Approvata dal Tutor'
  if (status === 'giallo') return 'Parziale'
  if (status === 'rosso') return 'Da ripassare'
  return status
}

function formatTranslation(value: LatinAnalysis['step4_nucleo_tradotto']): string {
  return Array.isArray(value) ? value.join(' / ') : value
}

function AnalysisSummary({ analysis }: { analysis: LatinAnalysis }) {
  const verbAnalysis = analysis.step2_analisi_verbo

  return (
    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Verbo
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {analysis.step1_verbo.parola_corretta}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Analisi del verbo
        </p>
        <dl className="mt-2 grid gap-2 text-sm">
          {(
            Object.entries(verbAnalysis) as [
              keyof typeof verbAnalysis,
              string,
            ][]
          ).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4">
              <dt className="text-slate-500">
                {VERB_CATEGORY_LABELS[key as keyof typeof VERB_CATEGORY_LABELS] ??
                  key}
              </dt>
              <dd className="font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Soggetto
        </p>
        <p className="mt-1 text-sm text-slate-800">
          {analysis.step3_soggetto.sottinteso
            ? 'Soggetto sottinteso'
            : analysis.step3_soggetto.parole_corrette.join(', ')}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Nucleo tradotto
        </p>
        <p className="mt-1 text-sm text-slate-800">
          {formatTranslation(analysis.step4_nucleo_tradotto)}
        </p>
      </div>

      {analysis.step5_complementi.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Complementi
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-800">
            {analysis.step5_complementi.map((complemento, index) => (
              <li key={`${complemento.caso}-${index}`}>
                <span className="font-medium">
                  {complemento.parole.join(' ')}
                </span>
                <span className="text-slate-500"> ({complemento.caso})</span>
                <span className="block text-emerald-900">
                  {formatTranslation(complemento.traduzione)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function StudentArchive() {
  const { levels } = useExercises()
  const [items, setItems] = useState<PendingTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const analysisByLevelId = useMemo(
    () =>
      Object.fromEntries(
        levels.map((level) => [level.id, level.analysis]),
      ),
    [levels],
  )

  const analysisByFrase = useMemo(
    () =>
      Object.fromEntries(
        levels.map((level) => [level.analysis.frase_originale, level.analysis]),
      ),
    [levels],
  )

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToArchivedEvaluations((data) => {
      setItems(data)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!loading && items.length > 0 && !selectedId) {
      setSelectedId(items[0].id)
    }
  }, [items, loading, selectedId])

  const selected = items.find((item) => item.id === selectedId) ?? null
  const selectedAnalysis = selected
    ? selected.levelId
      ? analysisByLevelId[selected.levelId]
      : analysisByFrase[selected.fraseOriginale]
    : undefined

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-800 sm:text-2xl">
          Archivio esercizi
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Ripassa le frasi convalidate (auto-convalidate o approvate dal Tutor).
        </p>
      </div>

      {loading ? (
        <LevelCardsSkeleton count={2} />
      ) : items.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <p className="text-sm text-slate-600">
            Nessun esercizio archiviato al momento.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <GlassCard className="!p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={[
                      'w-full px-5 py-4 text-left transition-colors',
                      selectedId === item.id
                        ? 'bg-sky-50'
                        : 'can-hover:hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <p className="font-serif text-sm italic text-slate-700">
                        « {item.fraseOriginale} »
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                          {statusLabel(item.status)}
                        </span>
                        <span className="text-slate-500">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  </button>
                </li>
              ))}
            </ul>
          </GlassCard>

          {selected ? (
            <GlassCard className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Frase latina
                </p>
                <p className="mt-1 font-serif text-lg italic text-slate-800">
                  « {selected.fraseOriginale} »
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Analisi corretta
                </p>
                {selectedAnalysis ? (
                  <div className="mt-2">
                    <AnalysisSummary analysis={selectedAnalysis} />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    Analisi non disponibile per questo esercizio.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Traduzione attesa
                </p>
                <p className="mt-1 text-base text-slate-800">
                  {selected.traduzioneAttesa}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  La tua traduzione validata
                </p>
                <p className="mt-1 text-base font-medium text-emerald-900">
                  {selected.traduzioneStudente}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <span>Punteggio: {selected.totalScore ?? selected.mechanicalScore}/100</span>
                {typeof selected.reward === 'number' && selected.reward > 0 ? (
                  <span>+{selected.reward.toLocaleString('it-IT')} Sesterzi</span>
                ) : null}
                {selected.autoApproved ? (
                  <span className="text-sky-700">Auto-convalidata</span>
                ) : null}
              </div>
            </GlassCard>
          ) : null}
        </div>
      )}
    </section>
  )
}
