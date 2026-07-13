export interface LoadMoreInput {
  lastVisibleIndex: number
  loadedCount: number
  prefetchRows: number
  hasNextPage: boolean
  isFetching: boolean
  latched: boolean
}

export interface LoadMoreResult {
  shouldFetch: boolean
  latched: boolean
}

export function evaluateLoadMore(input: LoadMoreInput): LoadMoreResult {
  const {
    lastVisibleIndex,
    loadedCount,
    prefetchRows,
    hasNextPage,
    isFetching,
    latched,
  } = input

  if (latched && isFetching) {
    return { shouldFetch: false, latched: true }
  }

  if (isFetching || !hasNextPage) {
    return { shouldFetch: false, latched: false }
  }

  const crossed =
    loadedCount > 0 && lastVisibleIndex >= loadedCount - prefetchRows
  if (!crossed) {
    return { shouldFetch: false, latched: false }
  }

  return { shouldFetch: true, latched: true }
}
