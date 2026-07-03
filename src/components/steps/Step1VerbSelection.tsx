import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DropZone } from '../DropZone'
import { Shelf } from '../Shelf'
import type { LatinAnalysis, TileData } from '../../types'

interface Step1VerbSelectionProps {
  analysis: LatinAnalysis
  onVerbComplete: () => void
  onError: (message: string) => void
  onMistake?: () => void
  showAvantiButton?: boolean
  onAdvance?: () => void
  initialPlacedTileId?: string | null
  onStateSnapshot?: (state: {
    placedTileId: string | null
    isComplete: boolean
  }) => void
  /** Compito in classe: niente toast che rivelano la risposta */
  classroomMode?: boolean
}

const GENERIC_VERB_ERROR = 'Parola sbagliata. Riprova.'

function buildTiles(parole: string[]): TileData[] {
  return parole.map((word, index) => ({
    id: `tile-${index}-${word}`,
    word,
    index,
  }))
}

export function Step1VerbSelection({
  analysis,
  onVerbComplete,
  onError,
  onMistake,
  showAvantiButton = false,
  onAdvance,
  initialPlacedTileId = null,
  onStateSnapshot,
  classroomMode = false,
}: Step1VerbSelectionProps) {
  const tiles = useMemo(
    () => buildTiles(analysis.parole_array),
    [analysis.parole_array],
  )
  const tileById = useMemo(
    () => Object.fromEntries(tiles.map((tile) => [tile.id, tile])),
    [tiles],
  )

  const [placedTileId, setPlacedTileId] = useState<string | null>(
    initialPlacedTileId,
  )
  const [errorTileId, setErrorTileId] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(Boolean(initialPlacedTileId))

  const placedTile = placedTileId ? tileById[placedTileId] : null

  useEffect(() => {
    onStateSnapshot?.({ placedTileId, isComplete })
  }, [placedTileId, isComplete, onStateSnapshot])

  useEffect(() => {
    if (isComplete) {
      onVerbComplete()
    }
  }, [isComplete, onVerbComplete])

  const handlePoolTileClick = useCallback(
    (tile: TileData) => {
      if (isComplete) return

      const isCorrect = tile.word === analysis.step1_verbo.parola_corretta

      if (isCorrect) {
        setPlacedTileId(tile.id)
        setErrorTileId(null)
        setIsComplete(true)
        return
      }

      setErrorTileId(tile.id)
      onMistake?.()
      if (!classroomMode) {
        onError(GENERIC_VERB_ERROR)
      }
      window.setTimeout(() => setErrorTileId(null), 600)
    },
    [
      analysis.step1_verbo.parola_corretta,
      classroomMode,
      isComplete,
      onError,
      onMistake,
    ],
  )

  const handlePlacedTileClick = useCallback(() => {
    if (isComplete) return
    setPlacedTileId(null)
    setErrorTileId(null)
    setIsComplete(false)
  }, [isComplete])

  return (
    <div className="flex flex-col gap-6">
      <Shelf
        tiles={tiles}
        placedTileIds={placedTileId ? [placedTileId] : []}
        errorTileId={errorTileId}
        onTileClick={handlePoolTileClick}
        title="Frase latina"
        hint="Tocca il verbo"
      />

      <DropZone
        label="Verbo Principale"
        placedTile={placedTile}
        isActive={!isComplete}
        isComplete={isComplete}
        emptyLabel="Tocca il verbo nella frase latina"
        onPlacedTileClick={handlePlacedTileClick}
      />

      {showAvantiButton && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: isComplete ? 1 : 0.4, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="flex justify-end"
        >
          <button
            type="button"
            onClick={onAdvance}
            disabled={!isComplete}
            className="cursor-pointer rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Avanti
          </button>
        </motion.div>
      )}
    </div>
  )
}
