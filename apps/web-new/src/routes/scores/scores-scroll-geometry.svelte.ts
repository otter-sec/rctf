/**
 * Live scroll geometry for the leaderboard scroll region — one scroll listener
 * plus one ResizeObserver shared by every consumer (self-row pinning, the graph
 * window, the custom scrollbars, and the edge fades). Per-event, because the
 * virtualizer's mirrored offset only updates when the rendered range shifts,
 * which is too coarse for edge-exact UI.
 */
export interface ScrollGeometry {
  readonly scrollTop: number
  readonly scrollLeft: number
  readonly scrollHeight: number
  readonly scrollWidth: number
  readonly clientHeight: number
  readonly clientWidth: number
}

export function createScrollGeometry(
  getNode: () => HTMLElement | null
): ScrollGeometry {
  let scrollTop = $state(0)
  let scrollLeft = $state(0)
  let scrollHeight = $state(0)
  let scrollWidth = $state(0)
  let clientHeight = $state(0)
  let clientWidth = $state(0)

  $effect(() => {
    const node = getNode()
    if (!node) return
    const update = () => {
      scrollTop = node.scrollTop
      scrollLeft = node.scrollLeft
      scrollHeight = node.scrollHeight
      scrollWidth = node.scrollWidth
      clientHeight = node.clientHeight
      clientWidth = node.clientWidth
    }
    update()
    node.addEventListener('scroll', update, { passive: true })
    // Observing the first child too catches content growth (the virtual list
    // appending a page) that changes scrollHeight without resizing the node.
    const observer = new ResizeObserver(update)
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => {
      node.removeEventListener('scroll', update)
      observer.disconnect()
    }
  })

  return {
    get scrollTop() {
      return scrollTop
    },
    get scrollLeft() {
      return scrollLeft
    },
    get scrollHeight() {
      return scrollHeight
    },
    get scrollWidth() {
      return scrollWidth
    },
    get clientHeight() {
      return clientHeight
    },
    get clientWidth() {
      return clientWidth
    },
  }
}
