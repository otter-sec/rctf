import { goto } from '$app/navigation'
import { page as pageState } from '$app/state'
import { onDestroy } from 'svelte'
import { loadScoresPreferences, saveScoresPreferences } from './scores-preferences'
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

  function updateSearchUrl(raw: string) {
    search = raw.length >= 2 ? raw : undefined
    const url = new URL(window.location.href)
    if (raw.length >= 2) {
      url.searchParams.set('search', raw)
    } else {
      url.searchParams.delete('search')
    }
    history.replaceState(history.state, '', url.toString())
  }

  function setSearchInput(value: string) {
    searchInput = value
    if (searchTimer) window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => updateSearchUrl(value), SEARCH_DEBOUNCE_MS)
  }

  function setDivision(value: string | undefined) {
    const url = new URL(pageState.url)
    if (value) url.searchParams.set('division', value)
    else url.searchParams.delete('division')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setViewMode(value: ViewMode) {
    hasInteracted = true
    saveScoresPreferences({ viewMode: value })
    const url = new URL(pageState.url)
    if (value === 'challenges') url.searchParams.delete('view')
    else url.searchParams.set('view', value)
    url.searchParams.delete('challenge')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  function setSortMode(value: SortMode) {
    hasInteracted = true
    saveScoresPreferences({ sortMode: value })
    const url = new URL(pageState.url)
    if (value === 'categories') url.searchParams.delete('sort')
    else url.searchParams.set('sort', value)
    url.searchParams.delete('challenge')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
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
    const url = new URL(pageState.url)
    if (id) url.searchParams.set('challenge', id)
    else url.searchParams.delete('challenge')
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
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
