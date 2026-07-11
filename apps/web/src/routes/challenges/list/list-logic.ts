import type { Challenge } from '@rctf/types'
import { compareCategories, getCategoryKeyOrAlias } from '$lib/utils/categories'

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

export function resolveCategory(raw: string): string {
  return getCategoryKeyOrAlias(raw)
}

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

function toSet(
  value: ReadonlySet<string> | readonly string[]
): ReadonlySet<string> {
  return value instanceof Set ? value : new Set(value)
}
