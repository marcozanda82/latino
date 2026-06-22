import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DropZone } from '../DropZone'
import { Shelf } from '../Shelf'
import { DROP_ZONE_IDS } from '../../constants/dropZones'
import { useDragSensors } from '../../hooks/useDragSensors'
import type { LatinAnalysis, TileData } from '../../types'

interface Step1VerbSelectionProps {
  analysis: LatinAnalysis
  onVerbComplete: () => void
  onError: (message: string) => void
  onMistake?: () => void
  showAvantiButton?: boolean
  onAdvance?: () => void
}

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
}: Step1VerbSelectionProps) {
  const tiles = useMemo(
    () => buildTiles(analysis.parole_array),
    [analysis.parole_array],
  )
  const tileById = useMemo(
    () => Object.fromEntries(tiles.map((tile) => [tile.id, tile])),
    [tiles],
  )

  const [placedTileId, setPlacedTileId] = useState<string | null>(null)
  const [errorTileId, setErrorTileId] = useState<string | null>(null)
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const sensors = useDragSensors()

  const placedTile = placedTileId ? tileById[placedTileId] : null
  const draggingTile = draggingTileId ? tileById[draggingTileId] : null

  useEffect(() => {
    if (isComplete) {
      onVerbComplete()
    }
  }, [isComplete, onVerbComplete])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingTileId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingTileId(null)

      const { active, over } = event
      if (!over || over.id !== DROP_ZONE_IDS.VERB || isComplete) return

      const tile = tileById[String(active.id)]
      if (!tile) return

      const isCorrect =
        tile.word === analysis.step1_verbo.parola_corretta

      if (isCorrect) {
        setPlacedTileId(tile.id)
        setErrorTileId(null)
        setIsComplete(true)
      } else {
        setErrorTileId(tile.id)
        onMistake?.()
        onError(analysis.step1_verbo.spiegazione_errore)
        window.setTimeout(() => setErrorTileId(null), 600)
      }
    },
    [
      analysis.step1_verbo.parola_corretta,
      analysis.step1_verbo.spiegazione_errore,
      isComplete,
      onError,
      onMistake,
      tileById,
    ],
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <Shelf
          tiles={tiles}
          placedTileIds={placedTileId ? [placedTileId] : []}
          errorTileId={errorTileId}
          draggingTileId={draggingTileId}
          title="Frase latina"
        />

        <DropZone
          id={DROP_ZONE_IDS.VERB}
          label="Verbo Principale"
          placedTile={placedTile}
          isActive={!isComplete}
          isComplete={isComplete}
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
              className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all can-hover:hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Avanti
            </button>
          </motion.div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingTile ? (
          <div className="touch-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-serif text-lg tracking-wide shadow-lg">
            {draggingTile.word}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
