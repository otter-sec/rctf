export type ViewMode = 'challenges' | 'categories'
export type SortMode = 'categories' | 'solves'

export const DEFAULT_VIEW_MODE: ViewMode = 'challenges'
export const DEFAULT_SORT_MODE: SortMode = 'categories'

export const MIN_SEARCH_LENGTH = 2

export const SCORES_GOTO_OPTIONS = {
  replaceState: true,
  keepFocus: true,
  noScroll: true,
} as const

export function isViewMode(value: unknown): value is ViewMode {
  return value === 'challenges' || value === 'categories'
}

export function isSortMode(value: unknown): value is SortMode {
  return value === 'categories' || value === 'solves'
}

export function getActiveSearch(value: string): string | undefined {
  return value.length >= MIN_SEARCH_LENGTH ? value : undefined
}

export function withScoresSearch(url: URL, value: string): URL {
  const next = new URL(url)
  const search = getActiveSearch(value)
  if (search) next.searchParams.set('search', search)
  else next.searchParams.delete('search')
  return next
}

export function withScoresDivision(url: URL, value: string | undefined): URL {
  const next = new URL(url)
  if (value) next.searchParams.set('division', value)
  else next.searchParams.delete('division')
  return next
}

export function withScoresViewMode(url: URL, value: ViewMode): URL {
  const next = new URL(url)
  if (value === DEFAULT_VIEW_MODE) next.searchParams.delete('view')
  else next.searchParams.set('view', value)
  return next
}

export function withScoresSortMode(url: URL, value: SortMode): URL {
  const next = new URL(url)
  if (value === DEFAULT_SORT_MODE) next.searchParams.delete('sort')
  else next.searchParams.set('sort', value)
  return next
}

// URL param wins; a saved preference applies only before the first in-session
// interaction; otherwise the default. Covers AE3.
export function resolveViewMode(
  urlParam: string | null,
  savedPref: ViewMode | undefined,
  hasInteracted: boolean
): ViewMode {
  if (isViewMode(urlParam)) return urlParam
  if (!hasInteracted && savedPref) return savedPref
  return DEFAULT_VIEW_MODE
}

export function resolveSortMode(
  urlParam: string | null,
  savedPref: SortMode | undefined,
  hasInteracted: boolean
): SortMode {
  if (isSortMode(urlParam)) return urlParam
  if (!hasInteracted && savedPref) return savedPref
  return DEFAULT_SORT_MODE
}
