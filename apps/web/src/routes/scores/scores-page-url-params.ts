import type { SortMode, ViewMode } from './scores-shared-types'

export const MIN_SEARCH_LENGTH = 2

export const SCORES_GOTO_OPTIONS = {
  replaceState: true,
  keepFocus: true,
  noScroll: true,
} as const

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
  if (value === 'challenges') next.searchParams.delete('view')
  else next.searchParams.set('view', value)
  next.searchParams.delete('challenge')
  return next
}

export function withScoresSortMode(url: URL, value: SortMode): URL {
  const next = new URL(url)
  if (value === 'categories') next.searchParams.delete('sort')
  else next.searchParams.set('sort', value)
  next.searchParams.delete('challenge')
  return next
}

export function withFocusedChallenge(url: URL, id: string | null): URL {
  const next = new URL(url)
  if (id) next.searchParams.set('challenge', id)
  else next.searchParams.delete('challenge')
  return next
}
