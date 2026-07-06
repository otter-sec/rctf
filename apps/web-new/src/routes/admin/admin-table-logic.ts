/**
 * Pure state helpers shared by the admin table shell and its consumers (teams,
 * submissions). Sort toggling and the index arithmetic for the spliced detail
 * row live here so they stay testable apart from the virtualized component.
 */

export type SortOrder = 'asc' | 'desc'

export interface SortState<Col extends string = string> {
  by: Col
  order: SortOrder
}

/**
 * Reduces a header click to the next sort state. Clicking the active column
 * flips its order; clicking a different column adopts that column's default
 * order (callers supply per-column defaults — descending for score/solves/
 * createdAt, ascending otherwise) rather than carrying the prior order across.
 */
export function nextSort<Col extends string>(
  current: SortState<Col>,
  clicked: Col,
  defaults: Record<Col, SortOrder>
): SortState<Col> {
  if (current.by === clicked) {
    return { by: clicked, order: current.order === 'asc' ? 'desc' : 'asc' }
  }
  return { by: clicked, order: defaults[clicked] }
}

/**
 * Total virtual rows the table renders: the loaded data rows plus one spliced
 * detail row when a row is expanded. `expandedIndex` is the expanded row's data
 * index, or -1 when nothing is expanded.
 */
export function visibleRowCount(
  rowCount: number,
  expandedIndex: number
): number {
  return rowCount + (expandedIndex === -1 ? 0 : 1)
}

/** Whether a virtual index is the detail row spliced right after the expanded row. */
export function isDetailRowIndex(
  virtualIndex: number,
  expandedIndex: number
): boolean {
  return expandedIndex !== -1 && virtualIndex === expandedIndex + 1
}

/**
 * Maps a virtual row index back to its data index, accounting for the detail
 * row: every virtual row past the expanded one is shifted down by the spliced
 * slot. Callers must exclude detail rows first via {@link isDetailRowIndex}.
 */
export function rowIndexForVirtualRow(
  virtualIndex: number,
  expandedIndex: number
): number {
  return expandedIndex !== -1 && virtualIndex > expandedIndex
    ? virtualIndex - 1
    : virtualIndex
}

/**
 * Reconciles the expanded id against the current id set: keeps it while present,
 * clears to null once the row leaves (filtered out or paged away). Consumers
 * feed the result back into the bound `expandedId` so a stale expansion never
 * points at a row that is no longer loaded.
 */
export function resolveExpansion(
  expandedId: string | null,
  ids: readonly string[]
): string | null {
  if (expandedId === null) return null
  return ids.includes(expandedId) ? expandedId : null
}
