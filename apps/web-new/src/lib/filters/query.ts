import {
  clearFilter,
  createFilter,
  filterFingerprint,
  type MultiFilter,
} from './core'
import { resolveTimeRangeFilter, type TimeRangeFilter } from './time'

type FilterParams = Record<string, unknown>

export type ValueFilterDefinition<Id extends string, T> = {
  id: Id
  bodyKey: string
  create: () => MultiFilter<T>
  has: (filters: Record<Id, MultiFilter<T>>) => boolean
  clear: (filters: Record<Id, MultiFilter<T>>) => void
  fingerprint: (filters: Record<Id, MultiFilter<T>>) => string
  addParams: (
    params: FilterParams,
    filters: Record<Id, MultiFilter<T>>,
    serverValues?: (values: string[]) => string[]
  ) => void
}

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

export function defineValueFilter<Id extends string, T>(
  id: Id,
  bodyKey: string,
  valueFor: (option: T) => string
): ValueFilterDefinition<Id, T> {
  const getFilter = (filters: Record<Id, MultiFilter<T>>) => filters[id]

  return {
    id,
    bodyKey,
    create: () => createFilter<T>(),
    has: filters => getFilter(filters).selected.length > 0,
    clear: filters => clearFilter(getFilter(filters)),
    fingerprint: filters => filterFingerprint(getFilter(filters), valueFor),
    addParams: (params, filters, serverValues) =>
      addFilterParams(
        params,
        bodyKey,
        getFilter(filters),
        valueFor,
        serverValues
      ),
  }
}
