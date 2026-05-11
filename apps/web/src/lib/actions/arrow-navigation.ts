interface ArrowNavigationOptions {
  loop?: boolean
  selector?: string
}

const DEFAULT_SELECTOR = [
  'a[href]',
  'button',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isNavigableElement(element: HTMLElement) {
  if (element.closest('[data-arrow-navigation-exclude]')) return false
  if (element.getAttribute('aria-disabled') === 'true') return false

  if ('disabled' in element && element.disabled) return false

  const styles = window.getComputedStyle(element)
  if (styles.display === 'none' || styles.visibility === 'hidden') return false

  return (
    element.offsetWidth > 0 ||
    element.offsetHeight > 0 ||
    element.getClientRects().length > 0
  )
}

function getItems(node: HTMLElement, selector: string) {
  return Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(
    isNavigableElement
  )
}

function getNextIndex(
  currentIndex: number,
  itemCount: number,
  direction: 1 | -1,
  loop: boolean
) {
  const nextIndex = currentIndex + direction

  if (nextIndex >= 0 && nextIndex < itemCount) return nextIndex
  if (!loop) return currentIndex

  return direction === 1 ? 0 : itemCount - 1
}

export function arrowNavigation(
  node: HTMLElement,
  options: ArrowNavigationOptions = {}
) {
  let currentOptions = {
    loop: true,
    selector: DEFAULT_SELECTOR,
    ...options,
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const isRtl = window.getComputedStyle(node).direction === 'rtl'
    const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft'
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight'
    const direction =
      event.key === previousKey
        ? -1
        : event.key === nextKey
          ? 1
          : event.key === 'Home'
            ? -1
            : event.key === 'End'
              ? 1
              : 0

    if (!direction) return

    const items = getItems(node, currentOptions.selector)
    if (items.length === 0) return

    const currentIndex = items.findIndex(
      item => item === event.target || item.contains(event.target as Node)
    )
    if (currentIndex === -1) return

    event.preventDefault()

    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : getNextIndex(
              currentIndex,
              items.length,
              direction,
              currentOptions.loop
            )

    items[nextIndex]?.focus()
  }

  node.addEventListener('keydown', handleKeydown)

  return {
    update(options: ArrowNavigationOptions = {}) {
      currentOptions = {
        loop: true,
        selector: DEFAULT_SELECTOR,
        ...options,
      }
    },
    destroy() {
      node.removeEventListener('keydown', handleKeydown)
    },
  }
}
