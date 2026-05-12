import { describe, expect, mock, test } from 'bun:test'
import type { CurrentUserScoreData, ScoreEntry, ScoreGraphEntry } from './types'

const HOUR = 60 * 60 * 1000

mock.module('$lib/constants/scores', () => ({
  CUTOFF_TIME: 2 ** 53 - 1,
  DELTA_WINDOW: 2 * HOUR,
  SELF_COLOR: 'self-color',
  SPARKLINE_WINDOW: 12 * HOUR,
}))

mock.module('$lib/utils', () => ({
  getRankColorForPosition: (rank: number | null, isSelf: boolean, id: string) =>
    isSelf ? 'self-color' : `rank-${rank ?? id}`,
}))

mock.module('$lib/utils/categories', () => {
  const order = ['pwn', 'web', 'misc', 'sanity']
  return {
    getCategoryConfig: (category: string) => ({
      name: category,
      icon: null,
      color: category,
    }),
    getCategoryKeyOrAlias: (category: string) => category.toLowerCase(),
    getScoreboardCategoryOrder: (category: string) => order.indexOf(category.toLowerCase()),
  }
})

const {
  getCategoryGroups,
  getCategoryStatsForSolves,
  getChallengesByCategory,
  getChallengesBySolves,
  getFocusedEntries,
  getGraphVisibility,
  getOriginalRankByTeam,
  getRankDeltaByTeam,
  getScreenshotGraphData,
  getScreenshotSelfTeam,
  getScreenshotTeams,
  getSolvesByTeam,
  getSolveTimesByTeam,
} = await import('./scores-data-helpers')

function entry(id: string, solves: { id: string; solveTime: number }[]): ScoreEntry {
  const rank = Number(id.replace('team-', ''))
  return {
    id,
    name: `Team ${rank}`,
    avatarUrl: null,
    countryCode: null,
    statusText: null,
    score: solves.length * 100,
    solves,
    globalPlace: rank,
    division: 'open',
    divisionPlace: rank,
  }
}

function currentUser(): CurrentUserScoreData {
  return {
    id: 'team-2',
    name: 'Team 2',
    avatarUrl: null,
    countryCode: null,
    statusText: null,
    score: 200,
    solves: [{ id: 'web-100', createdAt: 10 }],
    globalPlace: 2,
    division: 'open',
    divisionPlace: 2,
  }
}

describe('scores data helpers', () => {
  test('sorts challenges for the scoreboard and excludes sanity checks', () => {
    const challenges = getChallengesByCategory({
      sanity: { name: 'Sanity', category: 'sanity', points: 1, solves: 10 },
      misc: { name: 'Misc A', category: 'misc', points: 50, solves: 4 },
      pwn: { name: 'Pwn B', category: 'pwn', points: 200, solves: 1 },
      web: { name: 'Web A', category: 'web', points: 100, solves: 2 },
    })

    expect(challenges.map(challenge => challenge.id)).toEqual(['pwn', 'web', 'misc'])
    expect(getChallengesBySolves(challenges).map(challenge => challenge.id)).toEqual([
      'pwn',
      'web',
      'misc',
    ])
  })

  test('groups challenges by category after scoreboard ordering', () => {
    const challenges = getChallengesByCategory({
      web2: { name: 'Web B', category: 'web', points: 50, solves: 8 },
      web1: { name: 'Web A', category: 'web', points: 100, solves: 3 },
      pwn1: { name: 'Pwn A', category: 'pwn', points: 100, solves: 1 },
    })
    const groups = getCategoryGroups(challenges)

    expect(groups.map(group => group.category)).toEqual(['pwn', 'web'])
    expect(groups[1]!.challenges.map(challenge => challenge.id)).toEqual(['web1', 'web2'])
  })

  test('filters focused challenge entries by solve time', () => {
    const entries = [
      entry('team-1', [{ id: 'web-100', solveTime: 300 }]),
      entry('team-2', [{ id: 'web-100', solveTime: 100 }]),
      entry('team-3', [{ id: 'pwn-100', solveTime: 50 }]),
    ]

    expect(getFocusedEntries(entries, 'web-100').map(team => team.id)).toEqual([
      'team-2',
      'team-1',
    ])
    expect(getFocusedEntries(entries, null)).toBe(entries)
  })

  test('builds solve lookup maps and category completion stats', () => {
    const entries = [entry('team-1', [{ id: 'web-100', solveTime: 100 }])]
    const groups = getCategoryGroups(
      getChallengesByCategory({
        web1: { name: 'Web A', category: 'web', points: 100, solves: 1 },
        web2: { name: 'Web B', category: 'web', points: 50, solves: 0 },
      })
    )

    expect(getSolvesByTeam(entries).get('team-1')?.has('web-100')).toBe(true)
    expect(getSolveTimesByTeam(entries).get('team-1')?.get('web-100')).toBe(100)
    expect(getOriginalRankByTeam(entries).get('team-1')).toBe(1)
    expect(getCategoryStatsForSolves(new Set(['web1']), groups[0]!)).toEqual({
      solved: 1,
      total: 2,
      percent: 50,
    })
  })

  test('computes rank deltas from recent graph movement', () => {
    const graph: ScoreGraphEntry[] = [
      {
        id: 'team-1',
        name: 'Team 1',
        points: [
          { time: 0, score: 0 },
          { time: 3 * HOUR, score: 100 },
        ],
      },
      {
        id: 'team-2',
        name: 'Team 2',
        points: [
          { time: 0, score: 50 },
          { time: 3 * HOUR, score: 50 },
        ],
      },
    ]

    const delta = getRankDeltaByTeam(undefined, graph, null)

    expect(delta.get('team-1')).toBe(1)
    expect(delta.get('team-2')).toBe(-1)
    expect(getRankDeltaByTeam('query', graph, null).size).toBe(0)
  })

  test('selects graph teams from viewport and top-three context', () => {
    const entries = Array.from({ length: 12 }, (_, index) => entry(`team-${index + 1}`, []))
    const visibility = getGraphVisibility({
      entries,
      isLoading: false,
      minRank: 8,
      maxRank: 12,
      focusedChallengeId: null,
      showTop3Context: true,
      showSelfContext: false,
      currentUserId: null,
      teamRanks: new Map(),
    })

    expect([...visibility.visibleTeamIds]).toEqual([
      'team-1',
      'team-2',
      'team-3',
      'team-6',
      'team-7',
      'team-8',
      'team-9',
      'team-10',
      'team-11',
      'team-12',
    ])
    expect([...visibility.contextTeamIds]).toEqual(['team-1', 'team-2', 'team-3'])
  })

  test('shapes screenshot teams and graph data', () => {
    const entries = [entry('team-1', [{ id: 'web-100', solveTime: 100 }])]
    const user = currentUser()
    const sparklineData = new Map([
      ['team-1', [{ time: 1, score: 100 }]],
      ['team-2', [{ time: 1, score: 200 }]],
    ])
    const teamColors = new Map([['team-1', 'red']])
    const graph: ScoreGraphEntry[] = [{ id: 'team-1', name: 'Team 1', points: [] }]

    expect(getScreenshotTeams(entries, user, teamColors, sparklineData)).toMatchObject([
      { id: 'team-1', rank: 1, color: 'red', solveCount: 1 },
    ])
    expect(getScreenshotSelfTeam(user, sparklineData)).toMatchObject({
      id: 'team-2',
      rank: 2,
      solveCount: 1,
    })
    expect(getScreenshotGraphData(graph)).toEqual(graph)
  })
})
