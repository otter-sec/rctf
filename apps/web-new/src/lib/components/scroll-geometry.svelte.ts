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
      update()
    })
    childWatcher.observe(node, { childList: true })
    return () => {
      node.removeEventListener('scroll', update)
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

export function createWindowScrollGeometry(): ScrollGeometry {
  let scrollTop = $state(0)
  let scrollLeft = $state(0)
  let scrollHeight = $state(0)
  let scrollWidth = $state(0)
  let clientHeight = $state(0)
  let clientWidth = $state(0)

  $effect(() => {
    const root = document.scrollingElement
    if (!root) return
    const update = () => {
      scrollTop = root.scrollTop
      scrollLeft = root.scrollLeft
      scrollHeight = root.scrollHeight
      scrollWidth = root.scrollWidth
      clientHeight = root.clientHeight
      clientWidth = root.clientWidth
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(document.documentElement)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('scroll', update)
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
