const STORAGE_KEY = 'rctf:challenges:preferences'

export interface ChallengesPreferences {
  hideSolved: boolean
  collapsedCategories: string[]
}

export const DEFAULT_PREFERENCES: ChallengesPreferences = {
  hideSolved: false,
  collapsedCategories: [],
}

export function parsePreferences(value: unknown): ChallengesPreferences {
  const record: Record<string, unknown> = isRecord(value) ? value : {}

  const hideSolved =
    typeof record.hideSolved === 'boolean'
      ? record.hideSolved
      : DEFAULT_PREFERENCES.hideSolved
  const collapsedCategories = isStringArray(record.collapsedCategories)
    ? record.collapsedCategories
    : [...DEFAULT_PREFERENCES.collapsedCategories]

  return { hideSolved, collapsedCategories }
}

export function loadPreferences(): ChallengesPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return parsePreferences(stored ? JSON.parse(stored) : undefined)
  } catch {
    return parsePreferences(undefined)
  }
}

export function savePreferences(prefs: ChallengesPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}
