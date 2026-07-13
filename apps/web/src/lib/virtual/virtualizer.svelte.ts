import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  Virtualizer,
  type VirtualItem,
} from '@tanstack/virtual-core'
import type { Attachment } from 'svelte/attachments'

const DEFAULT_OVERSCAN = 10

export interface VirtualizerConfig {
  count: number
  rowHeight: number
  overscan?: number
  scrollMargin?: number
}

export interface VirtualList {
  scrollContainer: Attachment<HTMLElement>
  readonly virtualItems: VirtualItem[]
  readonly totalSize: number
  readonly isScrolling: boolean
  readonly instance: Virtualizer<HTMLElement, Element>
}

export function createVirtualizer(
  config: () => VirtualizerConfig
): VirtualList {
  let scrollElement = $state<HTMLElement | null>(null)

  let virtualItems = $state.raw<VirtualItem[]>([])
  let totalSize = $state(0)
  let isScrolling = $state(false)

  const initial = config()
  let rowHeight = initial.rowHeight

  const instance = new Virtualizer<HTMLElement, Element>({
    count: initial.count,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan: initial.overscan ?? DEFAULT_OVERSCAN,
    scrollMargin: initial.scrollMargin ?? 0,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    // scroll events arrive faster than frames!!!
    onChange: (inst, sync) => {
      if (sync) {
        scheduleMirror(inst)
      } else {
        mirror(inst)
      }
    },
  })

  let mirrorFrame: number | undefined
  function scheduleMirror(inst: Virtualizer<HTMLElement, Element>) {
    if (mirrorFrame !== undefined) return
    mirrorFrame = requestAnimationFrame(() => {
      mirrorFrame = undefined
      mirror(inst)
    })
  }

  function mirror(inst: Virtualizer<HTMLElement, Element>) {
    virtualItems = inst.getVirtualItems()
    totalSize = inst.getTotalSize()
    isScrolling = inst.isScrolling
  }

  const scrollContainer: Attachment<HTMLElement> = node => {
    scrollElement = node
    return () => {
      scrollElement = null
      if (mirrorFrame !== undefined) {
        cancelAnimationFrame(mirrorFrame)
        mirrorFrame = undefined
      }
    }
  }

  $effect(() => {
    const c = config()
    rowHeight = c.rowHeight
    instance.setOptions({
      ...instance.options,
      count: c.count,
      overscan: c.overscan ?? DEFAULT_OVERSCAN,
      scrollMargin: c.scrollMargin ?? 0,
    })
    instance._willUpdate()
    mirror(instance)
  })

  $effect(() => instance._didMount())

  return {
    scrollContainer,
    get virtualItems() {
      return virtualItems
    },
    get totalSize() {
      return totalSize
    },
    get isScrolling() {
      return isScrolling
    },
    get instance() {
      return instance
    },
  }
}
