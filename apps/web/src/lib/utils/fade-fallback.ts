export function isFadeVisible(
  edge: string,
  position: number,
  max: number
): boolean {
  return edge === 'top' || edge === 'left' ? position > 1 : position < max - 1
}

export function initFadeFallback(): (() => void) | undefined {
  if (CSS.supports('animation-timeline: scroll()')) return

  type FadeTarget = {
    fade: HTMLElement
    source: Element
    edge: string
    horizontal: boolean
  }

  let targets: FadeTarget[] = []
  let targetsDirty = true
  let frame: number | undefined

  const collectTargets = () => {
    targets = []
    const fades = document.querySelectorAll<HTMLElement>(
      'edge-fade, root-fade, bar-fade'
    )
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
      })
      fade.style.transition = 'opacity 150ms ease'
    }
    targetsDirty = false
  }

  const update = () => {
    frame = undefined
    if (targetsDirty) collectTargets()

    const measurements = new Map<
      Element,
      { left: number; top: number; maxX: number; maxY: number }
    >()
    for (const { fade, source, edge, horizontal } of targets) {
      let measurement = measurements.get(source)
      if (!measurement) {
        measurement = {
          left: source.scrollLeft,
          top: source.scrollTop,
          maxX: source.scrollWidth - source.clientWidth,
          maxY: source.scrollHeight - source.clientHeight,
        }
        measurements.set(source, measurement)
      }
      const position = horizontal ? measurement.left : measurement.top
      const max = horizontal ? measurement.maxX : measurement.maxY
      fade.style.opacity = isFadeVisible(edge, position, max) ? '1' : '0'
    }
  }

  const scheduleUpdate = () => {
    if (frame === undefined) frame = requestAnimationFrame(update)
  }
  const refreshTargets = () => {
    targetsDirty = true
    scheduleUpdate()
  }

  document.addEventListener('scroll', scheduleUpdate, {
    capture: true,
    passive: true,
  })
  window.addEventListener('resize', scheduleUpdate)
  const observer = new MutationObserver(refreshTargets)
  observer.observe(document.body, { childList: true, subtree: true })
  update()

  return () => {
    document.removeEventListener('scroll', scheduleUpdate, { capture: true })
    window.removeEventListener('resize', scheduleUpdate)
    observer.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
  }
}
