import type { LeaderboardEntry } from '$lib/query/leaderboard'
import type { ScoresData } from '../model/data.svelte'
import { getVisibleSolveCount } from '../model/transforms'
import type { ScreenshotTeam } from './options'

export type ScreenshotModel = ReturnType<typeof createScreenshotModel>

type TeamLike = Pick<
  LeaderboardEntry,
  'id' | 'name' | 'avatarUrl' | 'countryCode' | 'statusText' | 'score'
> & { solves: readonly { id: string }[] }

export function createScreenshotModel(data: ScoresData) {
  function toTeam(entry: TeamLike, rank: number, fallbackColor: string): ScreenshotTeam {
    return {
      id: entry.id,
      rank,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      countryCode: entry.countryCode,
      statusText: entry.statusText,
      score: entry.score,
      solveCount: getVisibleSolveCount(entry.solves, data.challengesData),
      isCurrentUser: entry.id === data.currentUserId,
      sparklineData: data.sparklineDataByTeam.get(entry.id) ?? [],
      color: data.teamColorMap.get(entry.id) ?? fallbackColor,
    }
  }

  const teams = $derived(
    data.entries.map((entry, index) =>
      toTeam(entry, entry.globalPlace ?? index + 1, 'var(--foreground-l3)')
    )
  )

  const selfTeam = $derived.by((): ScreenshotTeam | null => {
    const user = data.currentUser
    if (!user) return null
    const listed = teams.find(team => team.id === user.id)
    if (listed) return listed
    if (user.globalPlace === null) return null
    return toTeam(user, user.globalPlace, 'var(--foreground-self-l0)')
  })

  const solvesByTeam = $derived.by(() => {
    const map = new Map<string, Set<string>>()
    for (const entry of data.entries) {
      map.set(entry.id, new Set(entry.solves.map(solve => solve.id)))
    }
    const user = data.currentUser
    if (user && !map.has(user.id)) {
      map.set(user.id, new Set(user.solves.map(solve => solve.id)))
    }
    return map
  })

  return {
    get teams() {
      return teams
    },
    get selfTeam() {
      return selfTeam
    },
    get solvesByTeam() {
      return solvesByTeam
    },
  }
}
