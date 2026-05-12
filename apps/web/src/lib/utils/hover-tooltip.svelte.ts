import { onDestroy } from 'svelte'

export interface HoverTooltipOptions {
  delay?: number
}

interface HoverTooltipAnchor {
  getBoundingClientRect(): DOMRect
}

export interface HoverTooltipController<T> {
  readonly payload: T | null
  open: boolean
  readonly anchor: HoverTooltipAnchor
  hover(payload: T | null, x: number, y: number): void
  close(): void
  onOpenChangeComplete(open: boolean): void
}

function createAnchor(x: number, y: number): HoverTooltipAnchor {
  return {
    getBoundingClientRect: () =>
      ({
        x,
        y,
        top: y,
        left: x,
        bottom: y,
        right: x,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  }
}

/**
 * Drives a manually-anchored tooltip with hover-delay semantics — used by
 * virtualized rows where attaching real `Tooltip.Trigger` nodes per cell is
 * impractical. Pair the returned controller with `<HoverTooltip>`.
 */
export function createHoverTooltip<T>(
  options: HoverTooltipOptions = {}
): HoverTooltipController<T> {
  const { delay = 300 } = options

  let payload = $state<T | null>(null)
  let open = $state(false)
  let anchor = $state<HoverTooltipAnchor>(createAnchor(0, 0))
  let pending: ReturnType<typeof setTimeout> | null = null

  function clearPending() {
    if (!pending) return
    clearTimeout(pending)
    pending = null
  }

  function show(next: T, x: number, y: number) {
    anchor = createAnchor(x, y)
    payload = next
    open = true
  }

  onDestroy(clearPending)

  return {
    get payload() {
      return payload
    },
    get open() {
      return open
    },
    set open(v: boolean) {
      open = v
    },
    get anchor() {
      return anchor
    },
    hover(next, x, y) {
      clearPending()
      if (next === null) {
        open = false
        return
      }
      if (open) {
        show(next, x, y)
        return
      }
      pending = setTimeout(() => {
        pending = null
        show(next, x, y)
      }, delay)
    },
    close() {
      clearPending()
      open = false
    },
    onOpenChangeComplete(nextOpen) {
      if (!nextOpen && !open) payload = null
    },
  }
}

export interface DataAttrTooltipHandlers {
  onpointerover(event: PointerEvent): void
  onpointerout(event: PointerEvent): void
  onfocusin(event: FocusEvent): void
  onfocusout(event: FocusEvent): void
}

/**
 * Event-delegation handlers for `[data-*]`-tagged hover targets inside a
 * scroll container. Avoids per-cell listeners when the container holds many
 * recycled virtual rows.
 */
export function createDataAttrTooltipHandlers(
  hover: (label: string | null, x: number, y: number) => void,
  attr: string = 'data-tooltip-label'
): DataAttrTooltipHandlers {
  const selector = `[${attr}]`

  function findTarget(event: Event): HTMLElement | null {
    const target = event.target
    const currentTarget = event.currentTarget
    if (!(target instanceof Element) || !(currentTarget instanceof HTMLElement))
      return null
    const match = target.closest<HTMLElement>(selector)
    if (!match || !currentTarget.contains(match)) return null
    return match
  }

  function isMovingWithin(
    event: PointerEvent | FocusEvent,
    target: HTMLElement
  ) {
    return (
      event.relatedTarget instanceof Node &&
      target.contains(event.relatedTarget)
    )
  }

  function showFor(target: HTMLElement) {
    const label = target.getAttribute(attr)
    if (!label) return
    const rect = target.getBoundingClientRect()
    hover(label, rect.left + rect.width / 2, rect.top)
  }

  return {
    onpointerover(event) {
      const target = findTarget(event)
      if (!target || isMovingWithin(event, target)) return
      showFor(target)
    },
    onpointerout(event) {
      const target = findTarget(event)
      if (!target || isMovingWithin(event, target)) return
      hover(null, 0, 0)
    },
    onfocusin(event) {
      const target = findTarget(event)
      if (target) showFor(target)
    },
    onfocusout(event) {
      const target = findTarget(event)
      if (!target || isMovingWithin(event, target)) return
      hover(null, 0, 0)
    },
  }
}
