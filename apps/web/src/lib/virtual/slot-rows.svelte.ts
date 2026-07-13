import type { VirtualItem } from '@tanstack/virtual-core'

export interface SlotRow {
  slot: number
  item: VirtualItem
}

export interface SlotRowsConfig {
  items: () => VirtualItem[]
  isScrolling: () => boolean
  count: () => number
  refreshMs: number
}

const padToPool = (
  items: VirtualItem[],
  pool: number,
  count: number
): VirtualItem[] => {
  const firstItem = items[0]
  const lastItem = items.at(-1)
  if (!firstItem || !lastItem || items.length >= pool) return items

  const synthetic = (index: number): VirtualItem => ({
    ...lastItem,
    key: index,
    index,
    start: lastItem.start + (index - lastItem.index) * lastItem.size,
    end: lastItem.end + (index - lastItem.index) * lastItem.size,
  })

  const run = [...items]
  let below = lastItem.index
  let above = firstItem.index
  while (run.length < pool && (below + 1 < count || above > 0)) {
    if (below + 1 < count) {
      below += 1
      run.push(synthetic(below))
    } else {
      above -= 1
      run.unshift(synthetic(above))
    }
  }
  return run
}

export function createSlotRows(config: SlotRowsConfig): {
  readonly rows: SlotRow[]
} {
  let pool = 0
  let first = -1
  let last = -1
  let appliedAt = 0
  let applied: SlotRow[] = []
  let retry = $state(0)
  let timer: ReturnType<typeof setTimeout> | undefined

  const rows = $derived.by(() => {
    void retry
    const items = config.items()
    const overlaps =
      applied.length === 0 ||
      items.length === 0 ||
      (items[0]!.index <= last && items.at(-1)!.index >= first)
    const elapsed = performance.now() - appliedAt

    if (config.isScrolling() && !overlaps && elapsed < config.refreshMs) {
      // a jump into a scroll boundary stops producing events, reevaluate
      // when the refresh window closes
      timer ??= setTimeout(() => {
        timer = undefined
        retry += 1
      }, config.refreshMs - elapsed)
      return applied
    }

    clearTimeout(timer)
    timer = undefined
    pool = Math.max(pool, items.length)
    const run = padToPool(items, pool, config.count())
    first = run[0]?.index ?? -1
    last = run.at(-1)?.index ?? -1
    appliedAt = performance.now()
    // slot order is stable so the keyed each never moves dom nodes
    applied = run
      .map(item => ({ slot: item.index % pool, item }))
      .sort((a, b) => a.slot - b.slot)
    return applied
  })

  return {
    get rows() {
      return rows
    },
  }
}
