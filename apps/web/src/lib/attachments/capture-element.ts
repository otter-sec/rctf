import type { Attachment } from 'svelte/attachments'

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
