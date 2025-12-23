import type { Virtualizer, VirtualItem } from '@tanstack/svelte-virtual'
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

export interface ScrollMetrics {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
}

export interface InfiniteVirtualizerConfig {
  rowHeight: number
  overscan?: number
  scrollMargin?: number
  isScrollingResetDelay?: number
  onScrollMetrics?: (metrics: ScrollMetrics) => void
}

export function createInfiniteVirtualizer(config: InfiniteVirtualizerConfig) {
  const {
    rowHeight,
    overscan = 10,
    scrollMargin = 0,
    isScrollingResetDelay = 100,
    onScrollMetrics,
  } = config

  let scrollElementRef: HTMLElement | null = null

  const observeElementOffsetWithMetrics = <T extends Element>(
    instance: Virtualizer<T, Element>,
    cb: ObserveOffsetCallback
  ) => {
    const targetWindow = instance.targetWindow
    if (!targetWindow) return

    let timeoutId: number | undefined
    let currentElement: HTMLElement | null = null
    let pollId: number | null = null
    let scrollRaf = 0

    let cachedClientHeight = 0
    let cachedClientWidth = 0
    let cachedScrollHeight = 0

    let capturedScrollTop = 0
    let capturedScrollLeft = 0

    const processScroll = () => {
      scrollRaf = 0
      if (!currentElement) return

      const { horizontal, isRtl } = instance.options

      const scrollTop = capturedScrollTop
      const scrollLeft = capturedScrollLeft

      const offset = horizontal
        ? scrollLeft * ((isRtl && -1) || 1)
        : scrollTop

      cb(offset, true)

      const metrics: ScrollMetrics = {
        scrollTop,
        scrollLeft: horizontal ? scrollLeft : 0,
        scrollHeight: cachedScrollHeight,
        scrollWidth: 0,
        clientHeight: cachedClientHeight,
        clientWidth: cachedClientWidth,
      }
      onScrollMetrics?.(metrics)

      if (timeoutId) targetWindow.clearTimeout(timeoutId)
      timeoutId = targetWindow.setTimeout(() => {
        if (!currentElement) return
        const endOffset = horizontal
          ? currentElement.scrollLeft * ((isRtl && -1) || 1)
          : currentElement.scrollTop
        cb(endOffset, false)
      }, instance.options.isScrollingResetDelay)
    }

    const onScroll = () => {
      if (!currentElement) return

      if (!scrollRaf) {
        capturedScrollTop = currentElement.scrollTop
        capturedScrollLeft = currentElement.scrollLeft

        if (cachedClientHeight === 0 || capturedScrollTop === 0) {
          cachedClientHeight = currentElement.clientHeight
          cachedClientWidth = currentElement.clientWidth
          cachedScrollHeight = currentElement.scrollHeight
        }

        scrollRaf = targetWindow.requestAnimationFrame(processScroll)
      }
    }

    const getOffset = () => {
      if (!currentElement) return 0
      const { horizontal, isRtl } = instance.options
      return horizontal
        ? currentElement.scrollLeft * ((isRtl && -1) || 1)
        : currentElement.scrollTop
    }

    const setup = (element: HTMLElement) => {
      if (currentElement === element) return

      if (currentElement) {
        currentElement.removeEventListener('scroll', onScroll)
      }

      currentElement = element
      element.addEventListener('scroll', onScroll, { passive: true })
      cb(getOffset(), false)
    }

    const poll = () => {
      const element = instance.scrollElement as HTMLElement | null
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
      if (scrollRaf) targetWindow.cancelAnimationFrame(scrollRaf)
    }
  }

  const virtualizer = createVirtualizer({
    count: 0,
    getScrollElement: () => scrollElementRef,
    estimateSize: () => rowHeight,
    overscan,
    scrollMargin,
    observeElementRect,
    observeElementOffset: observeElementOffsetWithMetrics,
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

export interface UseInfiniteVirtualScrollConfig {
  rowHeight: number
  overscan?: number
  isScrollingResetDelay?: number
  threshold?: number
  onLoadMore: () => void
  onScroll?: (metrics: ScrollMetrics) => void
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
  let loadMoreTriggered = false

  let virtualItems = $state<VirtualItem[]>([])
  let totalSize = $state(0)
  let isScrolling = $state(false)
  let scrollingTimeoutId: number | undefined

  const handleScrollMetrics = (metrics: ScrollMetrics) => {
    if (!isScrolling) {
      isScrolling = true
    }

    if (scrollingTimeoutId) {
      clearTimeout(scrollingTimeoutId)
    }
    scrollingTimeoutId = window.setTimeout(() => {
      isScrolling = false
    }, isScrollingResetDelay)

    onScroll?.(metrics)

    if (loadMoreTriggered || !hasNextPage || isFetching) return

    const scrollPercent = (metrics.scrollTop + metrics.clientHeight) / metrics.scrollHeight
    if (scrollPercent > threshold) {
      loadMoreTriggered = true
      onLoadMore()
    }
  }

  const { virtualizer, update: updateVirtualizer } = createInfiniteVirtualizer({
    rowHeight,
    overscan,
    isScrollingResetDelay,
    onScrollMetrics: handleScrollMetrics,
  })

  // Subscribe to virtualizer and cache values outside render cycle
  $effect(() => {
    const unsubscribe = virtualizer.subscribe(v => {
      virtualItems = v.getVirtualItems()
      totalSize = v.getTotalSize()
      isScrolling = v.isScrolling
    })
    return unsubscribe
  })

  $effect.pre(() => {
    updateVirtualizer({
      count,
      scrollElement: viewportRef,
      scrollMargin,
    })
  })

  $effect.pre(() => {
    if (!isFetching) {
      loadMoreTriggered = false
    }
  })

  return {
    get virtualItems() {
      return virtualItems
    },
    get totalSize() {
      return totalSize
    },
    get isScrolling() {
      return isScrolling
    },
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
