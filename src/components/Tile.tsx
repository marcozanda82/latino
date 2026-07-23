import { motion } from 'framer-motion'
import type { TileStatus } from '../types'
import { WORD_TILE_SURFACE_CLASS } from '../constants/tiles'
import { isPunctuation } from '../utils/stringUtils'

interface TileProps {
  id: string
  word: string
  status: TileStatus
  disabled?: boolean
  onClick?: () => void
}

export function Tile({
  id,
  word,
  status,
  disabled = false,
  onClick,
}: TileProps) {
  const isError = status === 'error'
  const isPlaced = status === 'placed'
  const punctuation = isPunctuation(word)
  const isInteractive = Boolean(onClick) && !disabled && !punctuation

  if (punctuation) {
    return (
      <motion.span
        layout
        data-tile-id={id}
        aria-hidden
        className="inline-flex select-none items-center px-0.5 font-serif text-lg tracking-wide text-slate-400 pointer-events-none"
      >
        {word}
      </motion.span>
    )
  }

  return (
    <motion.button
      type="button"
      layout
      data-tile-id={id}
      disabled={!isInteractive}
      onClick={onClick}
      whileTap={isInteractive ? { scale: 0.96 } : undefined}
      initial={false}
      animate={
        isError
          ? { x: [0, -10, 10, -8, 8, -4, 4, 0], scale: 1 }
          : isPlaced
            ? {
                backgroundColor: '#ecfdf5',
                borderColor: '#34d399',
                color: '#065f46',
                scale: 1,
              }
            : { x: 0, scale: 1, opacity: 1 }
      }
      transition={
        isError
          ? { duration: 0.5, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 320, damping: 26 }
      }
      className={[
        WORD_TILE_SURFACE_CLASS,
        'relative z-10',
        isPlaced
          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-emerald-100 can-hover:hover:border-emerald-500 can-hover:hover:bg-emerald-100/80'
          : 'border-slate-200 bg-white/90 text-slate-800 shadow-sm can-hover:hover:border-slate-300 can-hover:hover:shadow-md',
        isInteractive && !isPlaced ? 'active:scale-[0.96]' : '',
        disabled && !isPlaced ? 'pointer-events-none opacity-40' : '',
        !isInteractive && !disabled && isPlaced
          ? 'cursor-default'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {word}
    </motion.button>
  )
}
