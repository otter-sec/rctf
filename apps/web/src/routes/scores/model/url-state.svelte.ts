import { goto } from '$app/navigation'
import { page as pageState } from '$app/state'
import { onDestroy } from 'svelte'
import {
  getActiveSearch,
  MIN_SEARCH_LENGTH,
  resolveSortMode,
  resolveViewMode,
  SCORES_GOTO_OPTIONS,
  withScoresChallenge,
  withScoresDivision,
  withScoresSearch,
  withScoresSortMode,
  withScoresViewMode,
  type SortMode,
  type ViewMode,
} from '../leaderboard/url-params'
import { loadScoresPreferences, saveScoresPreferences } from './preferences'

export const SEARCH_DEBOUNCE_MS = 400

export type ScoresUrlState = ReturnType<typeof createScoresRouteState>

export function createScoresRouteState() {
  const savedPrefs = loadScoresPreferences()
  const initialSearch = pageState.url.searchParams.get('search')
  let hasInteracted = $state(false)
  let searchInput = $state(initialSearch ?? '')
  let search = $state<string | undefined>(
    initialSearch && initialSearch.length >= MIN_SEARCH_LENGTH
      ? initialSearch
      : undefined
  )
  let searchTimer: number | undefined
  let showTop3Context = $state(savedPrefs.showTop3Context ?? true)
  let showSelfContext = $state(savedPrefs.showSelfContext ?? true)

  onDestroy(() => {
    if (searchTimer) window.clearTimeout(searchTimer)
  })

  const viewMode = $derived(
    resolveViewMode(
      pageState.url.searchParams.get('view'),
      savedPrefs.viewMode,
      hasInteracted
    )
  )

  const sortMode = $derived(
    resolveSortMode(
      pageState.url.searchParams.get('sort'),
      savedPrefs.sortMode,
      hasInteracted
    )
  )

  const division = $derived(
    pageState.url.searchParams.get('division') ?? undefined
  )

  const focusedChallengeId = $derived(
    pageState.url.searchParams.get('challenge') ?? null
  )

  function clearSearchTimer() {
    if (!searchTimer) return
    window.clearTimeout(searchTimer)
    searchTimer = undefined
  }

  function getCurrentUrl() {
    if (typeof window !== 'undefined') return new URL(window.location.href)
    return new URL(pageState.url)
  }

  function getCurrentUrlWithSearch() {
    search = getActiveSearch(searchInput)
    return withScoresSearch(getCurrentUrl(), searchInput)
  }

  function navigateTo(url: URL) {
    void goto(url, SCORES_GOTO_OPTIONS)
  }

  function replaceUrl(url: URL) {
    if (typeof window === 'undefined') return
    window.history.replaceState(window.history.state, '', url)
  }

  function commitSearch() {
    clearSearchTimer()
    replaceUrl(getCurrentUrlWithSearch())
  }

  function setSearchInput(value: string) {
    searchInput = value
    clearSearchTimer()
    searchTimer = window.setTimeout(commitSearch, SEARCH_DEBOUNCE_MS)
  }

  function setDivision(value: string | undefined) {
    clearSearchTimer()
    navigateTo(withScoresDivision(getCurrentUrlWithSearch(), value))
  }

  function setViewMode(value: ViewMode) {
    hasInteracted = true
    saveScoresPreferences({ viewMode: value })
    clearSearchTimer()
    navigateTo(withScoresViewMode(getCurrentUrlWithSearch(), value))
  }

  function setSortMode(value: SortMode) {
    hasInteracted = true
    saveScoresPreferences({ sortMode: value })
    clearSearchTimer()
    navigateTo(withScoresSortMode(getCurrentUrlWithSearch(), value))
  }

  function setFocusedChallenge(id: string | null) {
    clearSearchTimer()
    navigateTo(withScoresChallenge(getCurrentUrlWithSearch(), id))
  }

  function setShowTop3Context(value: boolean) {
    saveScoresPreferences({ showTop3Context: value })
    showTop3Context = value
  }

  function setShowSelfContext(value: boolean) {
    saveScoresPreferences({ showSelfContext: value })
    showSelfContext = value
  }

  return {
    get viewMode() {
      return viewMode
    },
    get sortMode() {
      return sortMode
    },
    get division() {
      return division
    },
    get focusedChallengeId() {
      return focusedChallengeId
    },
    get searchInput() {
      return searchInput
    },
    get search() {
      return search
    },
    get showTop3Context() {
      return showTop3Context
    },
    get showSelfContext() {
      return showSelfContext
    },
    setSearchInput,
    setDivision,
    setViewMode,
    setSortMode,
    setShowTop3Context,
    setShowSelfContext,
    setFocusedChallenge,
  }
}
