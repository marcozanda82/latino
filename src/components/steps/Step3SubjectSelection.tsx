import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DropZone } from '../DropZone'
import { Shelf } from '../Shelf'
import { SUBJECT_ERROR_MESSAGES } from '../../constants/dropZones'
import type { LatinAnalysis, TileData } from '../../types'
import { areWordSetsEqual, buildTilesFromWords } from '../../utils/tiles'
import { getInteractiveParoleArray } from '../../utils/complements'
import { getVerbParoleFromCorretta } from '../../utils/verbAnalysis'

interface Step3SubjectSelectionProps {
  analysis: LatinAnalysis
  onComplete: () => void
  onError: (message: string) => void
  onMistake?: () => void
  initialPlacedTileIds?: string[]
  initialImplicitSuccess?: boolean
  onStateSnapshot?: (state: {
    placedTileIds: string[]
    implicitSuccess: boolean
  }) => void
  classroomMode?: boolean
}

function buildRemainingWords(analysis: LatinAnalysis): string[] {
  const verbParts = getVerbParoleFromCorretta(
    analysis.step1_verbo.parola_corretta,
  )
  return getInteractiveParoleArray(
    analysis.parole_array.filter((word) => !verbParts.includes(word)),
  )
}

export function Step3SubjectSelection({
  analysis,
  onComplete,
  onError,
  onMistake,
  initialPlacedTileIds = [],
  initialImplicitSuccess = false,
  onStateSnapshot,
  classroomMode = false,
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

  const [placedTileIds, setPlacedTileIds] = useState<string[]>(
    initialPlacedTileIds,
  )
  const [errorTileId, setErrorTileId] = useState<string | null>(null)
  const [implicitSuccess, setImplicitSuccess] = useState(initialImplicitSuccess)
  const [implicitShaking, setImplicitShaking] = useState(false)

  useEffect(() => {
    onStateSnapshot?.({ placedTileIds, implicitSuccess })
  }, [placedTileIds, implicitSuccess, onStateSnapshot])

  const placedTiles = placedTileIds
    .map((id) => tileById[id])
    .filter((tile): tile is TileData => Boolean(tile))

  const placedWords = placedTiles.map((tile) => tile.word)
  const isSelectionComplete =
    !implicitSuccess &&
    !isImplicitExpected &&
    areWordSetsEqual(placedWords, expectedWords)

  const isComplete = implicitSuccess || isSelectionComplete

  const handlePoolTileClick = useCallback(
    (tile: TileData) => {
      if (implicitSuccess || isSelectionComplete) return
      if (placedTileIds.includes(tile.id)) return

      if (isImplicitExpected) {
        setErrorTileId(tile.id)
        onMistake?.()
        if (!classroomMode) {
          onError(SUBJECT_ERROR_MESSAGES.WRONG_TILE)
        }
        window.setTimeout(() => setErrorTileId(null), 600)
        return
      }

      if (!expectedWords.includes(tile.word)) {
        setErrorTileId(tile.id)
        onMistake?.()
        if (!classroomMode) {
          onError(SUBJECT_ERROR_MESSAGES.WRONG_TILE)
        }
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
      classroomMode,
      expectedWords,
      implicitSuccess,
      isImplicitExpected,
      isSelectionComplete,
      onComplete,
      onError,
      onMistake,
      placedTileIds,
      tileById,
    ],
  )

  const handlePlacedTileClick = useCallback(
    (tile: TileData) => {
      if (implicitSuccess || isSelectionComplete) return
      setPlacedTileIds((current) => current.filter((id) => id !== tile.id))
      setErrorTileId(null)
    },
    [implicitSuccess, isSelectionComplete],
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
    if (!classroomMode) {
      onError(SUBJECT_ERROR_MESSAGES.WRONG_IMPLICIT)
    }
    window.setTimeout(() => setImplicitShaking(false), 500)
  }, [classroomMode, isComplete, isImplicitExpected, onComplete, onError, onMistake])

  return (
    <div className="flex flex-col gap-6">
      <Shelf
        tiles={tiles}
        placedTileIds={placedTileIds}
        errorTileId={errorTileId}
        onTileClick={handlePoolTileClick}
        hint="Tocca le parole del soggetto"
      />

      <div className="flex flex-col gap-4">
        <DropZone
          label="Soggetto (Nominativo)"
          placedTiles={placedTiles}
          multi
          isActive={!implicitSuccess && !isImplicitExpected}
          isComplete={isSelectionComplete}
          hidden={implicitSuccess}
          onPlacedTileClick={handlePlacedTileClick}
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
            : isSelectionComplete
              ? 'Soggetto individuato.'
              : classroomMode
                ? 'Seleziona le parole del soggetto o usa il pulsante sottinteso.'
                : isImplicitExpected
                  ? 'Il soggetto non compare in frase: usa il pulsante dedicato.'
                  : `Parole del soggetto: ${placedWords.length} di ${expectedWords.length}`}
        </p>
      </div>
    </div>
  )
}
