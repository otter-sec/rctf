export type FilterMode = 'include' | 'exclude'

export type MultiFilter<T> = {
  mode: FilterMode
  selected: T[]
}

export type SearchFilter<T> = MultiFilter<T> & {
  search: string
}

export function createFilter<T>(): MultiFilter<T> {
  return {
    mode: 'include',
    selected: [],
  }
}

export function createSearchFilter<T>(): SearchFilter<T> {
  return {
    ...createFilter<T>(),
    search: '',
  }
}

export function setFilterMode<T>(filter: MultiFilter<T>, mode: FilterMode) {
  filter.mode = mode
}

export function clearFilter<T>(filter: MultiFilter<T>) {
  filter.mode = 'include'
  filter.selected = []
}

export function clearSearchFilter<T>(filter: SearchFilter<T>) {
  clearFilter(filter)
  filter.search = ''
}

export function toggleFilterOption<T>(
  filter: MultiFilter<T>,
  option: T,
  keyFor: (option: T) => string
) {
  const key = keyFor(option)
  filter.selected = filter.selected.some(current => keyFor(current) === key)
    ? filter.selected.filter(current => keyFor(current) !== key)
    : [...filter.selected, option]
}

export function filterOperatorLabel(mode: FilterMode, count: number) {
  if (mode === 'exclude') return 'is not'
  return includeOperatorLabel(count)
}

export function includeOperatorLabel(count: number) {
  return count > 1 ? 'is any of' : 'is'
}

export function filterFingerprint<T>(
  filter: MultiFilter<T>,
  valueFor: (option: T) => string
) {
  return `${filter.mode}:${filter.selected.map(valueFor).sort().join(',')}`
}
