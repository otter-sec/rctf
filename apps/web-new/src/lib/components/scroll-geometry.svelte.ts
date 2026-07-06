/**
 * Live scroll geometry for a scroll region — one scroll listener plus one
 * ResizeObserver shared by every consumer (self-row pinning, graph windows,
 * custom scrollbars, and edge fades). Per-event, because coarser signals (like
 * a virtualizer's mirrored offset, which only updates when the rendered range
 * shifts) are too coarse for edge-exact UI.
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

export interface EdgeFades {
  readonly top: boolean
  readonly bottom: boolean
}

/** Whether rows are clipped past each vertical edge (1px slack absorbs rounding). */
export function deriveEdgeFades(geometry: ScrollGeometry): EdgeFades {
  const top = $derived(geometry.scrollTop > 1)
  const bottom = $derived(
    geometry.scrollTop < geometry.scrollHeight - geometry.clientHeight - 1
  )
  return {
    get top() {
      return top
    },
    get bottom() {
      return bottom
    },
  }
}

/**
 * Edge-exact clip of a tracked row (the current user's), derived from live
 * scroll geometry: 'top' the instant the row's top slides past the viewport
 * top, 'bottom' the instant its bottom crosses the viewport bottom. Derived
 * per scroll event — not an IntersectionObserver, whose threshold crossings
 * wait for full exit and can be skipped entirely by fast scrolls (momentum,
 * scrollbar drags), leaving a stale edge. Offsets are content coordinates —
 * unaffected by scroll.
 */
export function deriveSelfRowClip(
  geometry: ScrollGeometry,
  getNode: () => HTMLElement | null
): { readonly edge: 'top' | 'bottom' | null } {
  const edge = $derived.by((): 'top' | 'bottom' | null => {
    const node = getNode()
    if (!node || geometry.clientHeight === 0) return null
    const rowTop = node.offsetTop
    const rowBottom = rowTop + node.offsetHeight
    if (rowTop < geometry.scrollTop) return 'top'
    if (rowBottom > geometry.scrollTop + geometry.clientHeight) return 'bottom'
    return null
  })
  return {
    get edge() {
      return edge
    },
  }
}
