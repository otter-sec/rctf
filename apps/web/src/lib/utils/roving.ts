import type { Attachment } from 'svelte/attachments'

export function moveRovingIndex(
  current: number,
  length: number,
  key: string,
  isRtl = false
): number | null {
  if (length <= 0) return null
  const forward = isRtl ? 'ArrowLeft' : 'ArrowRight'
  const backward = isRtl ? 'ArrowRight' : 'ArrowLeft'
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === forward) return (current + 1) % length
  if (key === backward) return (current - 1 + length) % length
  return null
}

interface RovingFocusOptions {
  selector?: string
}

function isNavigable(element: HTMLElement): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return false
  if ('disabled' in element && (element as HTMLButtonElement).disabled)
    return false

  const styles = window.getComputedStyle(element)
  if (styles.display === 'none' || styles.visibility === 'hidden') return false

  return (
    element.offsetWidth > 0 ||
    element.offsetHeight > 0 ||
    element.getClientRects().length > 0
  )
}

export function createRovingFocus(
  options: RovingFocusOptions = {}
): Attachment<HTMLElement> {
  const selector = options.selector ?? '[data-roving]'

  return node => {
    const items = () =>
      [...node.querySelectorAll<HTMLElement>(selector)].filter(isNavigable)

    const setTabStops = (active: Element | null) => {
      const list = items()
      const current =
        active && list.includes(active as HTMLElement) ? active : list[0]
      for (const item of list) item.tabIndex = item === current ? 0 : -1
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const list = items()
      const current = list.indexOf(document.activeElement as HTMLElement)
      if (current === -1) return
      const isRtl = window.getComputedStyle(node).direction === 'rtl'
      const next = moveRovingIndex(current, list.length, event.key, isRtl)
      if (next === null) return
      event.preventDefault()
      list[next]?.focus()
    }

    const onFocusin = (event: FocusEvent) =>
      setTabStops(event.target as HTMLElement)

    setTabStops(null)
    node.addEventListener('keydown', onKeydown)
    node.addEventListener('focusin', onFocusin)
    const observer = new MutationObserver(() =>
      setTabStops(document.activeElement)
    )
    observer.observe(node, { childList: true, subtree: true })

    return () => {
      node.removeEventListener('keydown', onKeydown)
      node.removeEventListener('focusin', onFocusin)
      observer.disconnect()
    }
  }
}
