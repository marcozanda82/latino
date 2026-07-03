import { AnimatePresence, motion } from 'framer-motion'
import { Tile } from './Tile'
import type { TileData } from '../types'

interface DropZoneProps {
  label: string
  isActive: boolean
  isComplete: boolean
  placedTile?: TileData | null
  placedTiles?: TileData[]
  hidden?: boolean
  multi?: boolean
  emptyLabel?: string
  onPlacedTileClick?: (tile: TileData) => void
}

export function DropZone({
  label,
  placedTile = null,
  placedTiles,
  isActive,
  isComplete,
  hidden = false,
  multi = false,
  emptyLabel,
  onPlacedTileClick,
}: DropZoneProps) {
  const multiTiles = placedTiles ?? []
  const tiles =
    multiTiles.length > 0 ? multiTiles : placedTile ? [placedTile] : []

  const placeholder =
    emptyLabel ??
    (multi
      ? 'Tocca le parole del soggetto per aggiungerle qui'
      : 'Tocca la parola corretta per posizionarla qui')

  const canDeselect = isActive && !isComplete && Boolean(onPlacedTileClick)

  if (hidden) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Banco di lavoro
      </p>
      <h2 className="mb-4 text-base font-medium text-slate-700">{label}</h2>

      <motion.div
        layout
        animate={{
          borderColor: isComplete ? '#34d399' : isActive ? '#cbd5e1' : '#e2e8f0',
          backgroundColor: isComplete
            ? 'rgba(236, 253, 245, 0.5)'
            : 'transparent',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex min-h-[100px] flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors"
      >
        <AnimatePresence mode="popLayout">
          {tiles.length > 0 ? (
            tiles.map((tile) => (
              <motion.div
                key={tile.id}
                layout
                initial={{ opacity: 0, scale: 0.88, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: -8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              >
                <Tile
                  id={tile.id}
                  word={tile.word}
                  status="placed"
                  disabled={!canDeselect}
                  onClick={
                    canDeselect
                      ? () => onPlacedTileClick?.(tile)
                      : undefined
                  }
                />
              </motion.div>
            ))
          ) : (
            <motion.p
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-slate-400"
            >
              {placeholder}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
