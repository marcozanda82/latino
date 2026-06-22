type PointerLikeEvent = MouseEvent | TouchEvent | PointerEvent

/** Estrae clientX/clientY da mouse, touch o pointer (primo punto di contatto). */
export function getPointerClientCoordinates(event: PointerLikeEvent): {
  clientX: number
  clientY: number
} | null {
  if ('touches' in event && event.touches.length > 0) {
    return {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY,
    }
  }

  if ('changedTouches' in event && event.changedTouches.length > 0) {
    return {
      clientX: event.changedTouches[0].clientX,
      clientY: event.changedTouches[0].clientY,
    }
  }

  if ('clientX' in event && 'clientY' in event) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    }
  }

  return null
}

/** Coordinate relative al contenitore, compensando scroll e offset del rect. */
export function getPointerCoordinatesRelativeToContainer(
  event: PointerLikeEvent,
  container: HTMLElement,
): { x: number; y: number } | null {
  const pointer = getPointerClientCoordinates(event)
  if (!pointer) return null

  const rect = container.getBoundingClientRect()
  return {
    x: pointer.clientX - rect.left,
    y: pointer.clientY - rect.top,
  }
}
