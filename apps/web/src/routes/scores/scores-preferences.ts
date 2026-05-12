import type { SortMode, ViewMode } from './types'

const STORAGE_KEY = 'rctf:scores:preferences'

export interface ScoresPreferences {
  viewMode: ViewMode
  sortMode: SortMode
  showTop3Context: boolean
  showSelfContext: boolean
}

export function loadScoresPreferences(): Partial<ScoresPreferences> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function saveScoresPreferences(prefs: Partial<ScoresPreferences>) {
  try {
    const current = loadScoresPreferences()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
  } catch {}
}
