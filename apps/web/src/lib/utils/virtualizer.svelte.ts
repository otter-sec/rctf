import type { Virtualizer } from '@tanstack/svelte-virtual'
import { createVirtualizer } from '@tanstack/svelte-virtual'
import { get } from 'svelte/store'

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

export interface InfiniteVirtualizerConfig {
  rowHeight: number
  overscan?: number
  scrollMargin?: number
  isScrollingResetDelay?: number
}

export function createInfiniteVirtualizer(config: InfiniteVirtualizerConfig) {
  const {
    rowHeight,
    overscan = 10,
    scrollMargin = 0,
    isScrollingResetDelay = 100,
  } = config

  let scrollElementRef: HTMLElement | null = null
  const virtualizer = createVirtualizer({
    count: 0,
    getScrollElement: () => scrollElementRef,
    estimateSize: () => rowHeight,
    overscan,
    scrollMargin,
    observeElementRect,
    observeElementOffset,
    isScrollingResetDelay,
  })

  let lastCount = -1
  let lastScrollMargin = -1
  let lastScrollElement: HTMLElement | null = null
  let hasMeasured = false

  function update(opts: {
    count: number
    scrollElement: HTMLElement | null
    scrollMargin?: number
  }) {
    const {
      count,
      scrollElement,
      scrollMargin: newScrollMargin = scrollMargin,
    } = opts
    const v = get(virtualizer)

    const needsUpdate =
      count !== lastCount ||
      newScrollMargin !== lastScrollMargin ||
      scrollElement !== lastScrollElement

    scrollElementRef = scrollElement

    if (needsUpdate) {
      lastCount = count
      lastScrollMargin = newScrollMargin
      lastScrollElement = scrollElement
      v.setOptions({ count, scrollMargin: newScrollMargin })
    }

    // Firefox bug workaround - needs double rAF to measure correctly :shrug:
    if (scrollElement && count > 0 && (!hasMeasured || needsUpdate)) {
      hasMeasured = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          v.measure()
        })
      })
    }
  }

  return { virtualizer, update }
}

export interface InfiniteScrollConfig {
  threshold?: number
  onScroll?: () => void
}

export function setupInfiniteScroll(
  handlers: {
    getViewport: () => HTMLElement | null
    hasNextPage: () => boolean
    isFetching: () => boolean
    onLoadMore: () => void
  },
  config: InfiniteScrollConfig = {}
) {
  const { threshold = 0.7, onScroll } = config
  let loadMoreTriggered = false
  let raf = 0

  function resetTrigger() {
    loadMoreTriggered = false
  }

  function run() {
    raf = 0
    const v = handlers.getViewport()
    if (!v) return

    onScroll?.()

    if (loadMoreTriggered || !handlers.hasNextPage() || handlers.isFetching())
      return

    const scrollPercent = (v.scrollTop + v.clientHeight) / v.scrollHeight
    if (scrollPercent > threshold) {
      loadMoreTriggered = true
      handlers.onLoadMore()
    }
  }

  function schedule() {
    if (raf) return
    raf = requestAnimationFrame(run)
  }

  function attach(viewport: HTMLElement) {
    viewport.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(viewport)
    schedule()

    return () => {
      viewport.removeEventListener('scroll', schedule)
      observer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }

  return { attach, resetTrigger }
}

export interface UseInfiniteVirtualScrollConfig {
  rowHeight: number
  overscan?: number
  isScrollingResetDelay?: number
  threshold?: number
  onLoadMore: () => void
  onScroll?: () => void
}

export function useInfiniteVirtualScroll(
  config: UseInfiniteVirtualScrollConfig
) {
  const {
    rowHeight,
    overscan = 10,
    isScrollingResetDelay = 100,
    threshold = 0.7,
    onLoadMore,
    onScroll,
  } = config

  let viewportRef = $state<HTMLElement | null>(null)
  let count = $state(0)
  let scrollMargin = $state(0)
  let hasNextPage = $state(false)
  let isFetching = $state(false)

  const { virtualizer, update: updateVirtualizer } = createInfiniteVirtualizer({
    rowHeight,
    overscan,
    isScrollingResetDelay,
  })

  const infiniteScroll = setupInfiniteScroll(
    {
      getViewport: () => viewportRef,
      hasNextPage: () => hasNextPage,
      isFetching: () => isFetching,
      onLoadMore,
    },
    { threshold, onScroll }
  )

  $effect(() => {
    updateVirtualizer({
      count,
      scrollElement: viewportRef,
      scrollMargin,
    })
  })

  $effect(() => {
    if (!isFetching) {
      infiniteScroll.resetTrigger()
    }
  })

  $effect(() => {
    const v = viewportRef
    if (!v) return
    return infiniteScroll.attach(v)
  })

  return {
    virtualizer,
    state: {
      get viewportRef() {
        return viewportRef
      },
      set viewportRef(el: HTMLElement | null) {
        viewportRef = el
      },
      get count() {
        return count
      },
      set count(n: number) {
        count = n
      },
      get scrollMargin() {
        return scrollMargin
      },
      set scrollMargin(n: number) {
        scrollMargin = n
      },
      get hasNextPage() {
        return hasNextPage
      },
      set hasNextPage(v: boolean) {
        hasNextPage = v
      },
      get isFetching() {
        return isFetching
      },
      set isFetching(v: boolean) {
        isFetching = v
      },
    },
  }
}
