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

function withParam(url: URL, key: string, value: string | undefined): URL {
  const next = new URL(url)
  if (value) next.searchParams.set(key, value)
  else next.searchParams.delete(key)
  return next
}

export function withScoresSearch(url: URL, value: string): URL {
  return withParam(url, 'search', getActiveSearch(value))
}

export function withScoresDivision(url: URL, value: string | undefined): URL {
  return withParam(url, 'division', value)
}

export function withScoresViewMode(url: URL, value: ViewMode): URL {
  const next = withParam(
    url,
    'view',
    value === DEFAULT_VIEW_MODE ? undefined : value
  )
  next.searchParams.delete('challenge')
  return next
}

export function withScoresSortMode(url: URL, value: SortMode): URL {
  const next = withParam(
    url,
    'sort',
    value === DEFAULT_SORT_MODE ? undefined : value
  )
  next.searchParams.delete('challenge')
  return next
}

export function withScoresChallenge(url: URL, value: string | null): URL {
  return withParam(url, 'challenge', value ?? undefined)
}

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
