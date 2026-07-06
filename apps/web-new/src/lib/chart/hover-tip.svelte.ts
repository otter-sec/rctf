/**
 * Delegated pointer-hover state shared by the profile bar/segment charts. One
 * `pointermove` listener on the chart's `<svg>` resolves the hovered element
 * via `event.target.closest('[hitAttribute]')`, reads `keyAttribute` off its
 * dataset as the active key, and records the pointer position (relative to
 * the SVG) for the floating tooltip. `keyAttribute` is the dataset property
 * name (camelCase), e.g. `'index'` for `data-index` or `'segKey'` for
 * `data-seg-key`.
 */

interface TipPosition {
  x: number
  y: number
}

export function createHoverTip(hitAttribute: string, keyAttribute: string) {
  let activeKey = $state<string | null>(null)
  let tip = $state<TipPosition | null>(null)

  function handleMove(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement
    const target = event.target as Element | null
    const hit = target?.closest<SVGElement>(`[${hitAttribute}]`) ?? null
    if (!hit) {
      activeKey = null
      tip = null
      return
    }
    activeKey = hit.dataset[keyAttribute] ?? null
    const rect = svg.getBoundingClientRect()
    tip = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handleLeave() {
    activeKey = null
    tip = null
  }

  return {
    get activeKey() {
      return activeKey
    },
    get tip() {
      return tip
    },
    handleMove,
    handleLeave,
  }
}
