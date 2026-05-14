import type { SortMode, ViewMode } from './types'

const STORAGE_KEY = 'rctf:scores:preferences'

export interface ScoresPreferences {
  viewMode: ViewMode
  sortMode: SortMode
  showTop3Context: boolean
  showSelfContext: boolean
}

export function parseScoresPreferences(
  value: unknown
): Partial<ScoresPreferences> {
  if (!isRecord(value)) return {}

  const prefs: Partial<ScoresPreferences> = {}
  if (isViewMode(value.viewMode)) prefs.viewMode = value.viewMode
  if (isSortMode(value.sortMode)) prefs.sortMode = value.sortMode
  if (typeof value.showTop3Context === 'boolean')
    prefs.showTop3Context = value.showTop3Context
  if (typeof value.showSelfContext === 'boolean')
    prefs.showSelfContext = value.showSelfContext
  return prefs
}

export function loadScoresPreferences(): Partial<ScoresPreferences> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseScoresPreferences(JSON.parse(stored)) : {}
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isViewMode(value: unknown): value is ViewMode {
  return value === 'challenges' || value === 'categories'
}

function isSortMode(value: unknown): value is SortMode {
  return value === 'categories' || value === 'solves'
}
