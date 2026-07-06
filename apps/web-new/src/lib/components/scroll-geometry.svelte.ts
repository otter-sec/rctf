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
