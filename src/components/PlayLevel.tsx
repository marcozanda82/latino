import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LatinTranslator } from './LatinTranslator'
import { AppLayout } from './layout/AppLayout'
import { PlayLevelSkeleton } from './ui/Skeletons'
import { GlassCard } from './ui/GlassCard'
import { fetchLevelById, type Level } from '../services/exerciseService'

export function PlayLevel() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const [level, setLevel] = useState<Level | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!levelId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false

    fetchLevelById(levelId)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setNotFound(true)
          return
        }
        setLevel(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [levelId])

  if (loading) {
    return <PlayLevelSkeleton />
  }

  if (notFound || !level) {
    return (
      <AppLayout>
        <GlassCard className="py-16 text-center">
          <p className="text-sm font-medium text-slate-600">Livello non trovato.</p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
          >
            Torna ai Livelli
          </Link>
        </GlassCard>
      </AppLayout>
    )
  }

  return (
    <LatinTranslator
      analysis={level.analysis}
      levelTitle={level.title}
      levelId={level.id}
      onBackToLevels={() => navigate('/')}
    />
  )
}
