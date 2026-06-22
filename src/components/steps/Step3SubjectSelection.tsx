import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DropZone } from '../DropZone'
import { Shelf } from '../Shelf'
import {
  DROP_ZONE_IDS,
  SUBJECT_ERROR_MESSAGES,
} from '../../constants/dropZones'
import {
  DRAG_MEASURING,
  DRAG_OVERLAY_MODIFIERS,
  DRAG_TILE_SURFACE_CLASS,
} from '../../constants/dragAndDrop'
import { useDragSensors } from '../../hooks/useDragSensors'
import type { LatinAnalysis, TileData } from '../../types'
import { areWordSetsEqual, buildTilesFromWords } from '../../utils/tiles'

interface Step3SubjectSelectionProps {
  analysis: LatinAnalysis
  onComplete: () => void
  onError: (message: string) => void
  onMistake?: () => void
}

function buildRemainingWords(analysis: LatinAnalysis): string[] {
  const verb = analysis.step1_verbo.parola_corretta
  return analysis.parole_array.filter((word) => word !== verb)
}

export function Step3SubjectSelection({
  analysis,
  onComplete,
  onError,
  onMistake,
}: Step3SubjectSelectionProps) {
  const expectedWords = analysis.step3_soggetto.parole_corrette
  const isImplicitExpected = analysis.step3_soggetto.sottinteso

  const tiles = useMemo(
    () => buildTilesFromWords(buildRemainingWords(analysis), 'subject'),
    [analysis],
  )

  const tileById = useMemo(
    () => Object.fromEntries(tiles.map((tile) => [tile.id, tile])),
    [tiles],
  )

  const [placedTileIds, setPlacedTileIds] = useState<string[]>([])
  const [errorTileId, setErrorTileId] = useState<string | null>(null)
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null)
  const [implicitSuccess, setImplicitSuccess] = useState(false)
  const [implicitShaking, setImplicitShaking] = useState(false)

  const placedTiles = placedTileIds
    .map((id) => tileById[id])
    .filter((tile): tile is TileData => Boolean(tile))

  const placedWords = placedTiles.map((tile) => tile.word)
  const isDragComplete =
    !implicitSuccess &&
    !isImplicitExpected &&
    areWordSetsEqual(placedWords, expectedWords)

  const isComplete = implicitSuccess || isDragComplete

  const sensors = useDragSensors()

  const draggingTile = draggingTileId ? tileById[draggingTileId] : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (implicitSuccess) return
    setDraggingTileId(String(event.active.id))
  }, [implicitSuccess])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log('[DEBUG DROP] Drop completato. event.over:', event.over)
      setDraggingTileId(null)

      if (implicitSuccess) return

      const { active, over } = event
      if (!over || over.id !== DROP_ZONE_IDS.SUBJECT) return

      const tile = tileById[String(active.id)]
      if (!tile || placedTileIds.includes(tile.id)) return

      if (isImplicitExpected) {
        setErrorTileId(tile.id)
        onMistake?.()
        onError(SUBJECT_ERROR_MESSAGES.WRONG_TILE)
        window.setTimeout(() => setErrorTileId(null), 600)
        return
      }

      if (!expectedWords.includes(tile.word)) {
        setErrorTileId(tile.id)
        onMistake?.()
        onError(SUBJECT_ERROR_MESSAGES.WRONG_TILE)
        window.setTimeout(() => setErrorTileId(null), 600)
        return
      }

      const nextPlacedIds = [...placedTileIds, tile.id]
      const nextPlacedWords = nextPlacedIds
        .map((id) => tileById[id]?.word)
        .filter((word): word is string => Boolean(word))

      setPlacedTileIds(nextPlacedIds)
      setErrorTileId(null)

      if (areWordSetsEqual(nextPlacedWords, expectedWords)) {
        onComplete()
      }
    },
    [
      expectedWords,
      implicitSuccess,
      isImplicitExpected,
      onComplete,
      onError,
      onMistake,
      placedTileIds,
      tileById,
    ],
  )

  const handleImplicitClick = useCallback(() => {
    if (isComplete) return

    if (isImplicitExpected) {
      setImplicitSuccess(true)
      setPlacedTileIds([])
      onComplete()
      return
    }

    setImplicitShaking(true)
    onMistake?.()
    onError(SUBJECT_ERROR_MESSAGES.WRONG_IMPLICIT)
    window.setTimeout(() => setImplicitShaking(false), 500)
  }, [isComplete, isImplicitExpected, onComplete, onError, onMistake])

  return (
    <DndContext
      sensors={sensors}
      measuring={DRAG_MEASURING}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <Shelf
          tiles={tiles}
          placedTileIds={placedTileIds}
          errorTileId={errorTileId}
          draggingTileId={draggingTileId}
        />

        <div className="flex flex-col gap-4">
          <DropZone
            id={DROP_ZONE_IDS.SUBJECT}
            label="Soggetto (Nominativo)"
            placedTiles={placedTiles}
            multi
            isActive={!implicitSuccess && !isImplicitExpected}
            isComplete={isDragComplete}
            hidden={implicitSuccess}
          />

          <motion.button
            type="button"
            layout
            disabled={isComplete}
            whileTap={isComplete ? undefined : { scale: 0.98 }}
            onClick={handleImplicitClick}
            animate={
              implicitShaking
                ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                : { x: 0 }
            }
            transition={
              implicitShaking
                ? { duration: 0.45, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 320, damping: 26 }
            }
            className={[
              'relative z-10 w-full cursor-pointer rounded-xl border px-6 py-4 text-sm font-medium transition-colors',
              implicitSuccess
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                : 'border-slate-200 bg-white text-slate-700 can-hover:hover:border-slate-300 can-hover:hover:bg-slate-50',
              isComplete && !implicitSuccess
                ? 'pointer-events-none opacity-40'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Il Soggetto è Sottinteso
          </motion.button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            {implicitSuccess
              ? 'Soggetto sottinteso confermato.'
              : isDragComplete
                ? 'Soggetto individuato correttamente.'
                : isImplicitExpected
                  ? 'Il soggetto non compare in frase: usa il pulsante dedicato.'
                  : `Parole del soggetto: ${placedWords.length} di ${expectedWords.length}`}
          </p>
        </div>
      </div>

      <DragOverlay
        dropAnimation={null}
        adjustScale={false}
        modifiers={DRAG_OVERLAY_MODIFIERS}
      >
        {draggingTile ? (
          <div
            className={`${DRAG_TILE_SURFACE_CLASS} border-slate-300 bg-white text-slate-800 shadow-sm`}
          >
            {draggingTile.word}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
