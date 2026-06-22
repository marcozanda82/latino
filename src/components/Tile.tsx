import { motion } from 'framer-motion'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { TileStatus } from '../types'

interface TileProps {
  id: string
  word: string
  status: TileStatus
  disabled?: boolean
}

export function Tile({ id, word, status, disabled = false }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled: disabled || status === 'placed',
    })

  const style = {
    transform: CSS.Transform.toString(transform),
  }

  const isError = status === 'error'
  const isPlaced = status === 'placed'

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={false}
      animate={
        isDragging
          ? {}
          : isError
            ? { x: [0, -10, 10, -8, 8, -4, 4, 0], scale: 1 }
            : isPlaced
              ? {
                  backgroundColor: '#ecfdf5',
                  borderColor: '#34d399',
                  color: '#065f46',
                  scale: 1,
                }
              : { x: 0, scale: 1 }
      }
      transition={
        isDragging
          ? { type: 'spring', stiffness: 420, damping: 28 }
          : isError
            ? { duration: 0.5, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 320, damping: 26 }
      }
      className={[
        'draggable-item relative z-10 rounded-xl border px-5 py-3 font-serif text-lg tracking-wide transition-shadow',
        isDragging
          ? 'z-20 cursor-grabbing border-slate-300 bg-white shadow-lift'
          : 'cursor-pointer shadow-sm',
        isPlaced
          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-emerald-100'
          : 'border-slate-200 bg-white/90 text-slate-800 can-hover:hover:border-slate-300 can-hover:hover:shadow-md',
        disabled && !isPlaced ? 'pointer-events-none opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...listeners}
      {...attributes}
    >
      {word}
    </motion.div>
  )
}
