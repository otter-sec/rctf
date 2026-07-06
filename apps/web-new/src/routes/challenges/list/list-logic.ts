import type { Challenge } from '@rctf/types'
import { getCategoryKeyOrAlias, getCategoryOrder } from '$lib/utils/categories'

export interface CategoryGroup {
  category: string
  challenges: Challenge[]
}

export interface FilterOptions {
  query: string
  hideSolved: boolean
  solvedIds: ReadonlySet<string>
}

export interface AccordionValueOptions {
  allCategories: string[]
  collapsedCategories: ReadonlySet<string> | readonly string[]
  searching: boolean
  deepLinkCategory: string | null
}

export interface ChallengeStats {
  pointsEarned: number
  pointsTotal: number
  solvedCount: number
  totalCount: number
}

/**
 * Normalises a raw category string to its canonical key, folding aliases
 * (`binary` → `pwn`, `rev` → `reverse`, `cryptography` → `crypto`) and casing.
 * Unknown categories pass through lowercased.
 */
export function resolveCategory(raw: string): string {
  return getCategoryKeyOrAlias(raw)
}

/**
 * Buckets challenges by their canonical category, orders the groups by the fixed
 * priority list (unknown categories alphabetically last), and sorts each group's
 * challenges by solve count descending with a name tiebreak.
 */
export function groupChallenges(challenges: Challenge[]): CategoryGroup[] {
  const groups = new Map<string, Challenge[]>()
  for (const challenge of challenges) {
    const category = resolveCategory(challenge.category)
    const bucket = groups.get(category)
    if (bucket) {
      bucket.push(challenge)
    } else {
      groups.set(category, [challenge])
    }
  }

  const result = [...groups.entries()].map(([category, list]) => ({
    category,
    challenges: sortWithinCategory(list),
  }))
  result.sort((a, b) => compareCategories(a.category, b.category))
  return result
}

/**
 * Filters challenges by a case-insensitive substring across name, category, and
 * author, and (when `hideSolved` is set) drops the caller's solved challenges.
 */
export function filterChallenges(
  challenges: Challenge[],
  { query, hideSolved, solvedIds }: FilterOptions
): Challenge[] {
  const needle = query.trim().toLowerCase()
  return challenges.filter(challenge => {
    if (hideSolved && solvedIds.has(challenge.id)) {
      return false
    }
    if (!needle) {
      return true
    }
    return (
      challenge.name.toLowerCase().includes(needle) ||
      challenge.category.toLowerCase().includes(needle) ||
      challenge.author.toLowerCase().includes(needle)
    )
  })
}

/**
 * Computes the controlled accordion open-set. The persisted collapsed set is the
 * baseline; an active search forces every category open, and a deep-link target
 * is always forced open. Both are transient and never written back to prefs.
 */
export function deriveAccordionValue({
  allCategories,
  collapsedCategories,
  searching,
  deepLinkCategory,
}: AccordionValueOptions): string[] {
  if (searching) {
    return [...allCategories]
  }
  const collapsed = toSet(collapsedCategories)
  return allCategories.filter(
    category => !collapsed.has(category) || category === deepLinkCategory
  )
}

/**
 * Aggregates points and solve counts over the full (unfiltered) challenge set;
 * `points` is trusted non-null per the v2 schema.
 */
export function computeStats(
  challenges: Challenge[],
  solvedIds: ReadonlySet<string>
): ChallengeStats {
  let pointsEarned = 0
  let pointsTotal = 0
  let solvedCount = 0
  for (const challenge of challenges) {
    pointsTotal += challenge.points
    if (solvedIds.has(challenge.id)) {
      pointsEarned += challenge.points
      solvedCount += 1
    }
  }
  return {
    pointsEarned,
    pointsTotal,
    solvedCount,
    totalCount: challenges.length,
  }
}

function sortWithinCategory(challenges: Challenge[]): Challenge[] {
  return [...challenges].sort((a, b) => {
    const bySolves = b.solves - a.solves
    if (bySolves !== 0) {
      return bySolves
    }
    return a.name.localeCompare(b.name)
  })
}

function compareCategories(a: string, b: string): number {
  const orderA = getCategoryOrder(a)
  const orderB = getCategoryOrder(b)
  if (orderA === -1 && orderB === -1) {
    return a.localeCompare(b)
  }
  if (orderA === -1) {
    return 1
  }
  if (orderB === -1) {
    return -1
  }
  return orderA - orderB
}

function toSet(
  value: ReadonlySet<string> | readonly string[]
): ReadonlySet<string> {
  return value instanceof Set ? value : new Set(value)
}
