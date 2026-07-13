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

    const updateOffset = () => {
      scrollTop = node.scrollTop
      scrollLeft = node.scrollLeft
    }
    const updateSize = () => {
      scrollHeight = node.scrollHeight
      scrollWidth = node.scrollWidth
      clientHeight = node.clientHeight
      clientWidth = node.clientWidth
    }
    const measure = () => {
      updateOffset()
      updateSize()
    }

    measure()
    node.addEventListener('scroll', updateOffset, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(node)

    let observedChild: Element | null = null
    const observeChild = () => {
      const child = node.firstElementChild
      if (child === observedChild) return
      if (observedChild) observer.unobserve(observedChild)
      observedChild = child
      if (child) observer.observe(child)
    }
    observeChild()
    const childWatcher = new MutationObserver(() => {
      observeChild()
      measure()
    })
    childWatcher.observe(node, { childList: true })
    return () => {
      node.removeEventListener('scroll', updateOffset)
      observer.disconnect()
      childWatcher.disconnect()
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

export interface EdgeInsets {
  top: number
  bottom: number
}

export function blockPaddingInsets(el: HTMLElement | null): EdgeInsets {
  if (!el) return { top: 0, bottom: 0 }
  const style = getComputedStyle(el)
  return {
    top: parseFloat(style.paddingBlockStart) || 0,
    bottom: parseFloat(style.paddingBlockEnd) || 0,
  }
}

export function deriveSelfRowClip(
  geometry: ScrollGeometry,
  getNode: () => HTMLElement | null,
  getInsets?: () => EdgeInsets
): { readonly edge: 'top' | 'bottom' | null } {
  const insets = $derived.by(() => getInsets?.() ?? { top: 0, bottom: 0 })
  const edge = $derived.by((): 'top' | 'bottom' | null => {
    const node = getNode()
    if (!node || geometry.clientHeight === 0) return null
    const rowTop = node.offsetTop
    const rowBottom = rowTop + node.offsetHeight
    if (rowTop < geometry.scrollTop + insets.top) return 'top'
    if (
      rowBottom >
      geometry.scrollTop + geometry.clientHeight - insets.bottom
    ) {
      return 'bottom'
    }
    return null
  })
  return {
    get edge() {
      return edge
    },
  }
}
