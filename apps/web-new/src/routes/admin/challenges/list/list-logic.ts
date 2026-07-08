import type { AdminChallenge } from '@rctf/types'
import { ChallengeScoringKind } from '@rctf/types'
import { normalizeSearchText, searchMatches } from '$lib/filters/ui'
import { getCategoryKeyOrAlias, getCategoryOrder } from '$lib/utils/categories'

export interface CategoryGroup {
  category: string
  challenges: AdminChallenge[]
}

export function groupChallenges(challenges: AdminChallenge[]): CategoryGroup[] {
  const groups = new Map<string, AdminChallenge[]>()
  for (const challenge of challenges) {
    const category = getCategoryKeyOrAlias(challenge.category)
    const bucket = groups.get(category)
    if (bucket) {
      bucket.push(challenge)
    } else {
      groups.set(category, [challenge])
    }
  }

  const result = [...groups.entries()].map(([category, list]) => ({
    category,
    challenges: [...list].sort((a, b) => a.name.localeCompare(b.name)),
  }))
  result.sort((a, b) => compareCategories(a.category, b.category))
  return result
}

export function filterChallenges(
  challenges: AdminChallenge[],
  query: string
): AdminChallenge[] {
  const needle = normalizeSearchText(query)
  if (!needle) {
    return challenges
  }
  return challenges.filter(challenge =>
    searchMatches(needle, challenge.name, challenge.category, challenge.author)
  )
}

export function accordionValue(
  groups: CategoryGroup[],
  collapsed: ReadonlySet<string> | readonly string[],
  searchActive: boolean
): string[] {
  const categories = groups.map(group => group.category)
  if (searchActive) {
    return categories
  }
  const collapsedSet = collapsed instanceof Set ? collapsed : new Set(collapsed)
  return categories.filter(category => !collapsedSet.has(category))
}

export function pointsLabel(challenge: AdminChallenge): string {
  if (challenge.scoring?.kind === ChallengeScoringKind.DYNAMIC) {
    return 'Dynamic'
  }
  const { min, max } = challenge.points
  return min === max ? `${max}` : `${min}–${max}`
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
