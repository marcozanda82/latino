import { motion } from 'framer-motion'
import { Tile } from './Tile'
import type { TileData, TileStatus } from '../types'

interface ShelfProps {
  tiles: TileData[]
  placedTileIds: string[]
  errorTileId: string | null
  draggingTileId: string | null
  title?: string
}

function getTileStatus(
  tileId: string,
  placedTileIds: string[],
  errorTileId: string | null,
  draggingTileId: string | null,
): TileStatus {
  if (placedTileIds.includes(tileId)) return 'placed'
  if (errorTileId === tileId) return 'error'
  if (draggingTileId === tileId) return 'dragging'
  return 'idle'
}

export function Shelf({
  tiles,
  placedTileIds,
  errorTileId,
  draggingTileId,
  title = 'Parole rimanenti',
}: ShelfProps) {
  const visibleTiles = tiles.filter((tile) => !placedTileIds.includes(tile.id))

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Scaffalatura
          </p>
          <h2 className="mt-1 text-base font-medium text-slate-700">
            {title}
          </h2>
        </div>
        <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium text-slate-500">
          Trascina le parole
        </span>
      </div>

      <motion.div
        layout
        className="flex min-h-[72px] flex-wrap items-center justify-center gap-3"
      >
        {visibleTiles.length > 0 ? (
          visibleTiles.map((tile) => (
            <Tile
              key={tile.id}
              id={tile.id}
              word={tile.word}
              status={getTileStatus(
                tile.id,
                placedTileIds,
                errorTileId,
                draggingTileId,
              )}
            />
          ))
        ) : (
          <p className="text-sm text-slate-400">
            Nessuna parola disponibile sulla scaffalatura
          </p>
        )}
      </motion.div>
    </section>
  )
}
