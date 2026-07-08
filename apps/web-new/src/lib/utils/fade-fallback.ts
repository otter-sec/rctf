export function initFadeFallback(): (() => void) | undefined {
  if (CSS.supports('animation-timeline: scroll()')) return

  const update = () => {
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
      const horizontal = edge === 'left' || edge === 'right'
      const position = horizontal ? source.scrollLeft : source.scrollTop
      const max = horizontal
        ? source.scrollWidth - source.clientWidth
        : source.scrollHeight - source.clientHeight
      const visible =
        edge === 'top' || edge === 'left' ? position > 1 : position < max - 1
      fade.style.opacity = visible ? '1' : '0'
      fade.style.transition = 'opacity 150ms ease'
    }
  }

  document.addEventListener('scroll', update, { capture: true, passive: true })
  window.addEventListener('resize', update)
  const observer = new MutationObserver(update)
  observer.observe(document.body, { childList: true, subtree: true })
  update()

  return () => {
    document.removeEventListener('scroll', update, { capture: true })
    window.removeEventListener('resize', update)
    observer.disconnect()
  }
}
