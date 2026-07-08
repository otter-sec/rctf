export type SortOrder = 'asc' | 'desc'

export interface SortState<Col extends string = string> {
  by: Col
  order: SortOrder
}

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

export function visibleRowCount(
  rowCount: number,
  expandedIndex: number
): number {
  return rowCount + (expandedIndex === -1 ? 0 : 1)
}

export function isDetailRowIndex(
  virtualIndex: number,
  expandedIndex: number
): boolean {
  return expandedIndex !== -1 && virtualIndex === expandedIndex + 1
}

export function rowIndexForVirtualRow(
  virtualIndex: number,
  expandedIndex: number
): number {
  return expandedIndex !== -1 && virtualIndex > expandedIndex
    ? virtualIndex - 1
    : virtualIndex
}

export function resolveExpansion(
  expandedId: string | null,
  ids: readonly string[]
): string | null {
  if (expandedId === null) return null
  return ids.includes(expandedId) ? expandedId : null
}
