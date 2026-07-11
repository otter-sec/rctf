export interface LoadMoreInput {
  lastVisibleIndex: number
  loadedCount: number
  overscan: number
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
    overscan,
    hasNextPage,
    isFetching,
    latched,
  } = input

  if (latched) {
    return { shouldFetch: false, latched: isFetching }
  }

  if (isFetching || !hasNextPage) {
    return { shouldFetch: false, latched: false }
  }

  const crossed = loadedCount > 0 && lastVisibleIndex >= loadedCount - overscan
  if (!crossed) {
    return { shouldFetch: false, latched: false }
  }

  return { shouldFetch: true, latched: true }
}
