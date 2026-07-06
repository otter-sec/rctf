import type { MultiFilter } from './core'
import { resolveTimeRangeFilter, type TimeRangeFilter } from './time'

type FilterParams = Record<string, unknown>

export function addFilterParams<T>(
  params: FilterParams,
  bodyKey: string,
  filter: MultiFilter<T>,
  valueFor: (option: T) => string,
  serverValues?: (values: string[]) => string[]
) {
  if (filter.selected.length === 0) return

  const values = filter.selected.map(valueFor)
  const emitted = serverValues ? serverValues(values) : values
  if (emitted.length === 0) return

  params[bodyKey] =
    filter.mode === 'include' ? { include: emitted } : { exclude: emitted }
}

export function addTimeRangeParams(
  params: FilterParams,
  filter: TimeRangeFilter,
  ctfStartTime?: number | null
) {
  const { createdAfter, createdBefore, error } = resolveTimeRangeFilter(
    filter,
    ctfStartTime
  )

  if (error) return

  if (createdAfter) params.createdAfter = createdAfter
  if (createdBefore) params.createdBefore = createdBefore
}
