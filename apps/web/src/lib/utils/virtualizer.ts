import type { Virtualizer } from '@tanstack/svelte-virtual'

type ObserveRectCallback = (rect: { width: number; height: number }) => void
type ObserveOffsetCallback = (offset: number, isScrolling: boolean) => void

/**
 * Handles delayed element availability and caches dimensions.
 */
export function observeElementRect<T extends Element>(
  instance: Virtualizer<T, Element>,
  cb: ObserveRectCallback
) {
  const targetWindow = instance.targetWindow
  if (!targetWindow) return

  let lastWidth = 0
  let lastHeight = 0
  let ro: ResizeObserver | null = null
  let currentElement: HTMLElement | null = null
  let pollId: number | null = null

  const measure = () => {
    if (!currentElement) return

    const { width, height } = currentElement.getBoundingClientRect()
    const w = Math.round(width)
    const h = Math.round(height)

    // Firefox bug
    if (w === 0 || h === 0) return

    if (w !== lastWidth || h !== lastHeight) {
      lastWidth = w
      lastHeight = h
      cb({ width: w, height: h })
    }
  }

  const setup = (element: HTMLElement) => {
    if (currentElement === element) return

    ro?.disconnect()

    currentElement = element
    ro = new ResizeObserver(measure)
    ro.observe(element, { box: 'border-box' })
    measure()
  }

  const poll = () => {
    const element = instance.scrollElement as unknown as HTMLElement | null
    if (element) {
      setup(element)
      pollId = null
    } else {
      pollId = targetWindow.requestAnimationFrame(poll)
    }
  }

  poll()

  return () => {
    ro?.disconnect()
    if (pollId !== null) targetWindow.cancelAnimationFrame(pollId)
  }
}

/**
 * Handles delayed element availability and reports scroll position immediately.
 */
export function observeElementOffset<T extends Element>(
  instance: Virtualizer<T, Element>,
  cb: ObserveOffsetCallback
) {
  const targetWindow = instance.targetWindow
  if (!targetWindow) return

  let timeoutId: number | undefined
  let currentElement: Element | null = null
  let pollId: number | null = null

  const getOffset = () => {
    if (!currentElement) return 0
    const { horizontal, isRtl } = instance.options
    return horizontal
      ? currentElement.scrollLeft * ((isRtl && -1) || 1)
      : currentElement.scrollTop
  }

  const onScroll = () => {
    cb(getOffset(), true)

    if (timeoutId) targetWindow.clearTimeout(timeoutId)
    timeoutId = targetWindow.setTimeout(() => {
      cb(getOffset(), false)
    }, instance.options.isScrollingResetDelay)
  }

  const setup = (element: Element) => {
    if (currentElement === element) return

    if (currentElement) {
      currentElement.removeEventListener('scroll', onScroll)
    }

    currentElement = element
    element.addEventListener('scroll', onScroll, { passive: true })
    cb(getOffset(), false)
  }

  const poll = () => {
    const element = instance.scrollElement
    if (element) {
      setup(element)
      pollId = null
    } else {
      pollId = targetWindow.requestAnimationFrame(poll)
    }
  }

  poll()

  return () => {
    if (currentElement) {
      currentElement.removeEventListener('scroll', onScroll)
    }
    if (timeoutId) targetWindow.clearTimeout(timeoutId)
    if (pollId !== null) targetWindow.cancelAnimationFrame(pollId)
  }
}
