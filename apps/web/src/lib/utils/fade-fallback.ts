export function isFadeVisible(
  edge: string,
  position: number,
  max: number
): boolean {
  return edge === 'top' || edge === 'left' ? position > 1 : position < max - 1
}

const FADE_SELECTOR = 'edge-fade, root-fade, bar-fade'
const EXTENTS_TTL_MS = 1000

export function initFadeFallback(): (() => void) | undefined {
  if (CSS.supports('animation-timeline: scroll()')) return

  type FadeTarget = {
    fade: HTMLElement
    source: Element
    edge: string
    horizontal: boolean
    visible: boolean | null
  }

  type Extents = { maxX: number; maxY: number; at: number }

  let targets: FadeTarget[] = []
  let targetsDirty = true
  let frame: number | undefined
  const extents = new Map<Element, Extents>()

  const collectTargets = () => {
    targets = []
    extents.clear()
    const fades = document.querySelectorAll<HTMLElement>(FADE_SELECTOR)
    for (const fade of fades) {
      const scope = fade.closest<HTMLElement>('[data-fade-scope]')
      const source = scope
        ? scope.querySelector('[data-fade-source]')
        : document.scrollingElement
      if (!source) continue
      const edge = fade.dataset.edge ?? 'bottom'
      targets.push({
        fade,
        source,
        edge,
        horizontal: edge === 'left' || edge === 'right',
        visible: null,
      })
      fade.style.transition = 'opacity 150ms ease'
    }
    targetsDirty = false
  }

  // scrollWidth/scrollHeight force layout
  const measure = (source: Element, now: number): Extents => {
    let extent = extents.get(source)
    if (!extent || now - extent.at > EXTENTS_TTL_MS) {
      extent = {
        maxX: source.scrollWidth - source.clientWidth,
        maxY: source.scrollHeight - source.clientHeight,
        at: now,
      }
      extents.set(source, extent)
    }
    return extent
  }

  const update = () => {
    frame = undefined
    if (targetsDirty) collectTargets()

    const now = performance.now()
    for (const target of targets) {
      const extent = measure(target.source, now)
      const position = target.horizontal
        ? target.source.scrollLeft
        : target.source.scrollTop
      const max = target.horizontal ? extent.maxX : extent.maxY
      const visible = isFadeVisible(target.edge, position, max)
      if (visible !== target.visible) {
        target.visible = visible
        target.fade.style.opacity = visible ? '1' : '0'
      }
    }
  }

  const scheduleUpdate = () => {
    if (frame === undefined) frame = requestAnimationFrame(update)
  }
  const refreshTargets = () => {
    targetsDirty = true
    scheduleUpdate()
  }

  // only fade elements entering or leaving the DOM matter
  const involvesFade = (nodes: NodeList): boolean => {
    for (const node of nodes) {
      if (!(node instanceof Element)) continue
      if (node.matches(FADE_SELECTOR) || node.querySelector(FADE_SELECTOR)) {
        return true
      }
    }
    return false
  }

  document.addEventListener('scroll', scheduleUpdate, {
    capture: true,
    passive: true,
  })
  window.addEventListener('resize', refreshTargets)
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (
        involvesFade(record.addedNodes) ||
        involvesFade(record.removedNodes)
      ) {
        refreshTargets()
        return
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  update()

  return () => {
    document.removeEventListener('scroll', scheduleUpdate, { capture: true })
    window.removeEventListener('resize', refreshTargets)
    observer.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
  }
}
