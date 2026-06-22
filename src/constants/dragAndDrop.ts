import { MeasuringStrategy } from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'

export const DRAG_MEASURING = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

export const DRAG_OVERLAY_MODIFIERS = [snapCenterToCursor]

/** Classi condivise tra Tile e DragOverlay per evitare salti di dimensione. */
export const DRAG_TILE_SURFACE_CLASS =
  'draggable-item touch-none inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-5 py-3 font-serif text-lg tracking-wide'
