import type { Attachment } from 'svelte/attachments'

// Captures the attached node into caller state and clears it on teardown. The
// guard keeps a stale teardown (old node detaching after a new one attached)
// from nulling the fresher capture.
export function captureElement<T extends Element>(
  assign: (node: T | null) => void
): Attachment<T> {
  let current: T | null = null
  return node => {
    current = node
    assign(node)
    return () => {
      if (current === node) {
        current = null
        assign(null)
      }
    }
  }
}
