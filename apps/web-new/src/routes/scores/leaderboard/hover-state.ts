export interface HoverTargetFacts {
  teamId: string | null
  hasCell: boolean
  columnId: string | null
  hasSpark: boolean
  overMatrixGap: boolean
}

export interface HoverPatch {
  columnId?: string | null
  rowId?: string | null
  teamId?: string | null
  solveHighlight?: null
}

export function resolveHoverTarget(facts: HoverTargetFacts): HoverPatch {
  const patch: HoverPatch = {}
  if (facts.hasCell) {
    patch.columnId = facts.columnId
    patch.rowId = facts.teamId
  } else if (!facts.overMatrixGap) {
    patch.columnId = null
    patch.rowId = null
  }
  if (facts.hasSpark) {
    patch.teamId = facts.teamId
    patch.solveHighlight = null
  } else if (!facts.hasCell) {
    patch.teamId = null
    patch.solveHighlight = null
  }
  return patch
}

export type TooltipTimingDeps = {
  openDelayMs: number
  cooldownMs: number
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (id: number) => void
}

export type PointerOverCellResult = 'shown' | 'scheduled' | 'ignored'

export type TooltipTiming<K> = {
  pointerOverCell: (
    key: K,
    isHeader: boolean,
    show: () => void
  ) => PointerOverCellResult
  isCurrent: (key: K) => boolean
  clear: () => void
  dispose: () => void
}

export function createTooltipTiming<K>(
  deps: TooltipTimingDeps
): TooltipTiming<K> {
  let warm = false
  let openTimer: number | undefined
  let coolTimer: number | undefined
  let pendingKey: K | null = null
  let activeKey: K | null = null

  function cancelOpen(): void {
    if (openTimer !== undefined) deps.clearTimer(openTimer)
    openTimer = undefined
    pendingKey = null
  }

  function cancelCooldown(): void {
    if (coolTimer !== undefined) deps.clearTimer(coolTimer)
    coolTimer = undefined
  }

  function markShown(key: K): void {
    activeKey = key
    warm = true
    cancelCooldown()
  }

  function pointerOverCell(
    key: K,
    isHeader: boolean,
    show: () => void
  ): PointerOverCellResult {
    if (isCurrent(key)) return 'ignored'
    cancelOpen()
    if (warm && isHeader) {
      markShown(key)
      show()
      return 'shown'
    }
    activeKey = null
    pendingKey = key
    openTimer = deps.setTimer(() => {
      openTimer = undefined
      pendingKey = null
      markShown(key)
      show()
    }, deps.openDelayMs)
    return 'scheduled'
  }

  function isCurrent(key: K): boolean {
    return key === pendingKey || (activeKey !== null && key === activeKey)
  }

  function clear(): void {
    cancelOpen()
    if (activeKey === null) return
    activeKey = null
    cancelCooldown()
    coolTimer = deps.setTimer(() => {
      coolTimer = undefined
      warm = false
    }, deps.cooldownMs)
  }

  function dispose(): void {
    cancelOpen()
    cancelCooldown()
    activeKey = null
  }

  return { pointerOverCell, isCurrent, clear, dispose }
}
