import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import { Tile } from './Tile'
import type { TileData } from '../types'

interface DropZoneProps {
  id: string
  label: string
  isActive: boolean
  isComplete: boolean
  placedTile?: TileData | null
  placedTiles?: TileData[]
  hidden?: boolean
  multi?: boolean
  emptyLabel?: string
}

export function DropZone({
  id,
  label,
  placedTile = null,
  placedTiles,
  isActive,
  isComplete,
  hidden = false,
  multi = false,
  emptyLabel,
}: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: hidden || !isActive })

  const multiTiles = placedTiles ?? []
  const tiles =
    multiTiles.length > 0 ? multiTiles : placedTile ? [placedTile] : []

  const placeholder =
    emptyLabel ??
    (multi
      ? 'Rilascia qui le parole del soggetto'
      : 'Rilascia qui la parola corretta')

  if (hidden) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Banco di lavoro
      </p>
      <h2 className="mb-4 text-base font-medium text-slate-700">{label}</h2>

      <motion.div
        ref={setNodeRef}
        layout
        animate={{
          borderColor: isComplete
            ? '#34d399'
            : isOver
              ? '#94a3b8'
              : isActive
                ? '#cbd5e1'
                : '#e2e8f0',
          backgroundColor: isComplete
            ? 'rgba(236, 253, 245, 0.5)'
            : isOver
              ? 'rgba(248, 250, 252, 0.9)'
              : 'transparent',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={[
          'flex min-h-[100px] flex-wrap items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors',
          isOver && !isComplete ? 'border-slate-400' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <AnimatePresence mode="popLayout">
          {tiles.length > 0 ? (
            tiles.map((tile) => (
              <motion.div
                key={tile.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Tile id={tile.id} word={tile.word} status="placed" disabled />
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-slate-400">{placeholder}</p>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
