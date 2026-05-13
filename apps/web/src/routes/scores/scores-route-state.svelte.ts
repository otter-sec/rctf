import { goto } from '$app/navigation'
import { page as pageState } from '$app/state'
import { onDestroy } from 'svelte'
import { loadScoresPreferences, saveScoresPreferences } from './scores-preferences'
import {
  getActiveSearch,
  SCORES_GOTO_OPTIONS,
  withFocusedChallenge,
  withScoresDivision,
  withScoresSearch,
  withScoresSortMode,
  withScoresViewMode,
} from './scores-route-helpers'
import type { SortMode, ViewMode } from './types'

const SEARCH_DEBOUNCE_MS = 400

export function createScoresRouteState() {
  const savedPrefs = loadScoresPreferences()
  const initialSearch = pageState.url.searchParams.get('search')
  let hasInteracted = $state(false)
  let searchInput = $state(initialSearch ?? '')
  let search = $state<string | undefined>(
    initialSearch && initialSearch.length >= 2 ? initialSearch : undefined
  )
  let searchTimer: number | undefined
  let showTop3Context = $state(savedPrefs.showTop3Context ?? true)
  let showSelfContext = $state(savedPrefs.showSelfContext ?? true)

  onDestroy(() => {
    if (searchTimer) window.clearTimeout(searchTimer)
  })

  const viewMode = $derived.by((): ViewMode => {
    const value = pageState.url.searchParams.get('view')
    if (value === 'challenges' || value === 'categories') return value
    if (!hasInteracted && savedPrefs.viewMode) return savedPrefs.viewMode
    return 'challenges'
  })

  const sortMode = $derived.by((): SortMode => {
    const value = pageState.url.searchParams.get('sort')
    if (value === 'solves') return 'solves'
    if (!hasInteracted && savedPrefs.sortMode) return savedPrefs.sortMode
    return 'categories'
  })

  const division = $derived(pageState.url.searchParams.get('division') ?? undefined)

  const focusedChallengeId = $derived(pageState.url.searchParams.get('challenge') ?? null)

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

  function commitSearch() {
    clearSearchTimer()
    navigateTo(getCurrentUrlWithSearch())
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

  function setShowTop3Context(value: boolean) {
    saveScoresPreferences({ showTop3Context: value })
    showTop3Context = value
  }

  function setShowSelfContext(value: boolean) {
    saveScoresPreferences({ showSelfContext: value })
    showSelfContext = value
  }

  function setFocusedChallenge(id: string | null) {
    clearSearchTimer()
    navigateTo(withFocusedChallenge(getCurrentUrlWithSearch(), id))
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
    get searchInput() {
      return searchInput
    },
    get search() {
      return search
    },
    get focusedChallengeId() {
      return focusedChallengeId
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
