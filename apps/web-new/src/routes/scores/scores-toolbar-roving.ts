/**
 * Resolves the next focus index for a horizontal roving-focus `role="toolbar"`
 * group. ArrowLeft/ArrowRight wrap around the ends; Home/End jump to the edges.
 * Returns `null` for keys the toolbar does not handle (or an empty group) so the
 * caller can leave the event untouched.
 */
export function moveRovingIndex(
  current: number,
  length: number,
  key: string
): number | null {
  if (length <= 0) return null
  switch (key) {
    case 'Home':
      return 0
    case 'End':
      return length - 1
    case 'ArrowRight':
      return (current + 1) % length
    case 'ArrowLeft':
      return (current - 1 + length) % length
    default:
      return null
  }
}
