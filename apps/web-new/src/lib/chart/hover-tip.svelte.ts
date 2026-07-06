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
