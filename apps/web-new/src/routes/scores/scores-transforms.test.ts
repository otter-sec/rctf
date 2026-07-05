import { getCategoryConfig } from '$lib/utils/categories'
import { describe, expect, test } from 'bun:test'
import {
  MEDAL_COLORS,
  PAGE_SIZE,
  RANK_COLORS,
  SCORE_CELL_WIDTH_PX,
  SCORE_DYNAMIC_CELL_WIDTH_PX,
  SCORE_ROW_GAP_PX,
  SELF_COLOR,
} from './scores-constants'
import {
  getBloodIndex,
  getCategoryCellsInnerWidth,
  getCategoryGroups,
  getCategoryStatsForSolves,
  getChallengeCellsInnerWidth,
  getChallengeCellsWidth,
  getChallengeCellWidth,
  getChallengesByCategory,
  getChallengesBySolves,
  getEmptyGraphVisibility,
  getGraphVisibility,
  getRankColorForPosition,
  getRankDeltaByTeam,
  getRankVariant,
  getSparklineDataByTeam,
  getTeamColorMap,
  getTeamRanks,
  getTeamSolveLookups,
  getVisibleSolveCount,
  isDynamicChallenge,
  mergeWithSelfGraph,
  type ChallengeInfo,
  type ChallengeSource,
} from './scores-transforms'

function makeSource(overrides: Partial<ChallengeSource>): ChallengeSource {
  return {
    name: 'challenge',
    category: 'web',
    points: 100,
    solves: 0,
    scoringKind: 'decay',
    firstSolvers: [],
    ...overrides,
  }
}

function makeInfo(
  id: string,
  category: string,
  scoringKind: 'decay' | 'dynamic' = 'decay'
): ChallengeInfo {
  return {
    id,
    name: id,
    category,
    points: 100,
    solves: 0,
    scoringKind,
    order: 0,
    config: getCategoryConfig(category),
  }
}

describe('getChallengesByCategory — sanity exclusion + ordering', () => {
  const challenges: Record<string, ChallengeSource> = {
    s1: makeSource({
      name: 'Sanity',
      category: 'sanity',
      points: 1,
      solves: 5,
    }),
    w1: makeSource({ name: 'Web B', category: 'web', points: 100, solves: 2 }),
    w2: makeSource({ name: 'Web A', category: 'web', points: 200, solves: 1 }),
    p1: makeSource({ name: 'Pwn', category: 'pwn', points: 50, solves: 3 }),
  }

  test('drops sanity-category challenges', () => {
    const result = getChallengesByCategory(challenges)
    expect(result.some(c => c.category === 'sanity')).toBe(false)
  })

  test('orders by scoreboard category then points desc', () => {
    // pwn (order 1) precedes web (order 6); within web, higher points first.
    const ids = getChallengesByCategory(challenges).map(c => c.id)
    expect(ids).toEqual(['p1', 'w2', 'w1'])
  })
})

describe('getChallengesBySolves', () => {
  test('sorts by solve count ascending, then name', () => {
    const byCategory: ChallengeInfo[] = [
      { ...makeInfo('p1', 'pwn'), name: 'Pwn', solves: 3 },
      { ...makeInfo('w2', 'web'), name: 'Web A', solves: 1 },
      { ...makeInfo('w1', 'web'), name: 'Web B', solves: 2 },
    ]
    expect(getChallengesBySolves(byCategory).map(c => c.id)).toEqual([
      'w2',
      'w1',
      'p1',
    ])
  })
})

describe('cell geometry', () => {
  test('isDynamicChallenge reads scoringKind', () => {
    expect(isDynamicChallenge({ scoringKind: 'dynamic' })).toBe(true)
    expect(isDynamicChallenge({ scoringKind: 'decay' })).toBe(false)
  })

  test('cell width is 48 for decay and 76 for dynamic', () => {
    expect(getChallengeCellWidth({ scoringKind: 'decay' })).toBe(
      SCORE_CELL_WIDTH_PX
    )
    expect(getChallengeCellWidth({ scoringKind: 'dynamic' })).toBe(
      SCORE_DYNAMIC_CELL_WIDTH_PX
    )
  })

  test('mixed-width total and inner width', () => {
    const cells = [
      { scoringKind: 'decay' as const },
      { scoringKind: 'dynamic' as const },
    ]
    const total =
      SCORE_CELL_WIDTH_PX +
      SCORE_ROW_GAP_PX +
      SCORE_DYNAMIC_CELL_WIDTH_PX +
      SCORE_ROW_GAP_PX
    expect(getChallengeCellsWidth(cells)).toBe(total)
    expect(getChallengeCellsInnerWidth(cells)).toBe(total - SCORE_ROW_GAP_PX)
    expect(getChallengeCellsInnerWidth([])).toBe(0)
  })
})

describe('getCategoryGroups — contiguous runs', () => {
  test('merges adjacent same-category challenges, splitting non-adjacent runs', () => {
    const challenges = [
      makeInfo('a', 'web'),
      makeInfo('b', 'web'),
      makeInfo('c', 'crypto'),
      makeInfo('d', 'web'),
    ]
    const groups = getCategoryGroups(challenges)
    expect(groups.map(g => g.category)).toEqual(['web', 'crypto', 'web'])
    expect(groups[0]!.challenges.map(c => c.id)).toEqual(['a', 'b'])
    expect(groups[2]!.challenges.map(c => c.id)).toEqual(['d'])
  })
})

describe('getTeamSolveLookups', () => {
  const entry = {
    id: 't1',
    solves: [
      { id: 'c1', solveTime: 100 },
      { id: 'c2', solveTime: 200 },
    ],
    dynamicScores: [{ id: 'c3', points: 480, pointDelta: -20 }],
  }

  test('assembles solve ids, times, and dynamic points/deltas', () => {
    const lookups = getTeamSolveLookups(entry)
    expect([...lookups.solvedIds]).toEqual(['c1', 'c2'])
    expect(lookups.solveTimes.get('c2')).toBe(200)
    expect(lookups.dynamicPoints.get('c3')).toBe(480)
    expect(lookups.dynamicPointDeltas.get('c3')).toBe(-20)
  })

  test('empty entry yields empty lookups', () => {
    const lookups = getTeamSolveLookups({
      id: 't2',
      solves: [],
      dynamicScores: [],
    })
    expect(lookups.solvedIds.size).toBe(0)
    expect(lookups.dynamicPoints.size).toBe(0)
  })
})

describe('getBloodIndex', () => {
  const challenges = {
    w1: makeSource({ firstSolvers: [{ id: 'teamA' }, { id: 'teamB' }] }),
    w2: makeSource({ firstSolvers: [] }),
  }

  test('returns the zero-based first-solver position', () => {
    expect(getBloodIndex(challenges, 'w1', 'teamA')).toBe(0)
    expect(getBloodIndex(challenges, 'w1', 'teamB')).toBe(1)
  })

  test('returns -1 for a non-solver or empty first-solvers', () => {
    expect(getBloodIndex(challenges, 'w1', 'ghost')).toBe(-1)
    expect(getBloodIndex(challenges, 'w2', 'teamA')).toBe(-1)
    expect(getBloodIndex(challenges, 'missing', 'teamA')).toBe(-1)
  })
})

describe('getCategoryStatsForSolves — excludes dynamic, distinguishes all-dynamic', () => {
  const mixed = {
    category: 'web',
    config: getCategoryConfig('web'),
    challenges: [
      makeInfo('c1', 'web', 'decay'),
      makeInfo('c2', 'web', 'decay'),
      makeInfo('c3', 'web', 'dynamic'),
    ],
  }

  test('partial progress excludes dynamic challenges from the total', () => {
    const stats = getCategoryStatsForSolves(new Set(['c1']), mixed)
    expect(stats).toEqual({
      solved: 1,
      total: 2,
      percent: 50,
      state: 'partial',
    })
  })

  test('full clear when every non-dynamic challenge is solved', () => {
    const stats = getCategoryStatsForSolves(new Set(['c1', 'c2', 'c3']), mixed)
    expect(stats.state).toBe('full')
    expect(stats.solved).toBe(2)
  })

  test('none when no non-dynamic challenge is solved', () => {
    expect(getCategoryStatsForSolves(null, mixed).state).toBe('none')
    expect(getCategoryStatsForSolves(new Set(), mixed).state).toBe('none')
  })

  test('all-dynamic is reported distinctly from none', () => {
    const allDynamic = {
      category: 'koth',
      config: getCategoryConfig('koth'),
      challenges: [
        makeInfo('d1', 'koth', 'dynamic'),
        makeInfo('d2', 'koth', 'dynamic'),
      ],
    }
    const stats = getCategoryStatsForSolves(new Set(['d1']), allDynamic)
    expect(stats.state).toBe('all-dynamic')
    expect(stats.total).toBe(0)
    expect(stats.percent).toBe(0)
  })
})

describe('getRankColorForPosition + getTeamColorMap', () => {
  test('podium ranks take medal colors', () => {
    expect(getRankColorForPosition(1, false, 'x')).toBe(MEDAL_COLORS[0])
    expect(getRankColorForPosition(2, false, 'x')).toBe(MEDAL_COLORS[1])
    expect(getRankColorForPosition(3, false, 'x')).toBe(MEDAL_COLORS[2])
  })

  test('ranks 4+ cycle through the ten-slot palette', () => {
    expect(getRankColorForPosition(4, false, 'x')).toBe(RANK_COLORS[3])
    expect(getRankColorForPosition(11, false, 'x')).toBe(RANK_COLORS[0])
  })

  test('current user always overrides to self color', () => {
    expect(getRankColorForPosition(1, true, 'x')).toBe(SELF_COLOR)
    expect(getRankColorForPosition(null, true, 'x')).toBe(SELF_COLOR)
  })

  test('unranked teams fall back to a stable hashed color', () => {
    const first = getRankColorForPosition(null, false, 'abc')
    expect(first).toBe(getRankColorForPosition(null, false, 'abc'))
    expect(RANK_COLORS as readonly string[]).toContain(first)
  })

  test('color map applies palette order and self override', () => {
    const entries = [
      { id: 't1', globalPlace: 1 },
      { id: 't2', globalPlace: 2 },
      { id: 't5', globalPlace: 5 },
      { id: 'me', globalPlace: 8 },
      { id: 'ghost', globalPlace: null },
    ]
    const map = getTeamColorMap(entries, { id: 'me' })
    expect(map.get('t1')).toBe(MEDAL_COLORS[0])
    expect(map.get('t5')).toBe(RANK_COLORS[4])
    expect(map.get('me')).toBe(SELF_COLOR)
    expect(map.get('ghost')).toBe(getRankColorForPosition(null, false, 'ghost'))
  })
})

describe('getTeamRanks', () => {
  test('numbers entries by their visible position', () => {
    const ranks = getTeamRanks([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(ranks.get('a')).toBe(1)
    expect(ranks.get('c')).toBe(3)
  })
})

describe('mergeWithSelfGraph', () => {
  const data = [{ id: 'a' }, { id: 'b' }]

  test('appends self when absent', () => {
    expect(mergeWithSelfGraph(data, { id: 'me' })).toHaveLength(3)
  })

  test('leaves data untouched when self is already present or missing', () => {
    expect(mergeWithSelfGraph(data, { id: 'a' })).toHaveLength(2)
    expect(mergeWithSelfGraph(data, null)).toBe(data)
  })
})

describe('getSparklineDataByTeam — window anchored to newest data point', () => {
  // Timestamps are far below Date.now(); anchoring to the max data point (not
  // wall-clock) is what keeps any point inside the 12h window.
  const MAX = 100_000_000
  const allGraphData = [
    {
      id: 'a',
      points: [
        { time: 0, score: 1 },
        { time: 60_000_000, score: 2 },
        { time: 99_000_000, score: 3 },
      ],
    },
    { id: 'b', points: [{ time: MAX, score: 5 }] },
  ]

  test('teams with in-window activity keep their raw windowed points', () => {
    const map = getSparklineDataByTeam(allGraphData, null)
    // window start = MAX - 12h = 56_800_000; only the two recent points
    // survive, with no synthesized endpoints (the sparkline stretches to the
    // team's own activity range).
    expect(map.get('a')!.map(p => p.time)).toEqual([60_000_000, 99_000_000])
    // A single point exactly at the window end has no history to draw.
    expect(map.get('b')!).toHaveLength(1)
  })

  test('a team idle across the whole window gets a flat two-point line', () => {
    const map = getSparklineDataByTeam(
      [
        { id: 'idle', points: [{ time: 1_000, score: 7 }] },
        { id: 'fresh', points: [{ time: MAX, score: 5 }] },
      ],
      null
    )
    expect(map.get('idle')!).toEqual([
      { time: MAX - 12 * 60 * 60 * 1000, score: 7 },
      { time: MAX, score: 7 },
    ])
  })

  test('no point is fabricated before a team first-ever event', () => {
    const map = getSparklineDataByTeam(
      [
        { id: 'late', points: [{ time: MAX - 1_000, score: 4 }] },
        { id: 'anchor', points: [{ time: MAX, score: 5 }] },
      ],
      null
    )
    expect(map.get('late')!).toEqual([
      { time: MAX - 1_000, score: 4 },
      { time: MAX, score: 4 },
    ])
  })

  test('merges the self series when it is absent from the board', () => {
    const map = getSparklineDataByTeam(allGraphData, {
      id: 'me',
      points: [{ time: MAX, score: 9 }],
    })
    expect(map.has('me')).toBe(true)
  })
})

describe('getRankDeltaByTeam — 2h re-rank from graph data', () => {
  // Current: C=500, A=300, B=250. Past (2h before newest): C=500, B=200, A=50.
  const allGraphData = [
    {
      id: 'a',
      points: [
        { time: 2_000_000, score: 50 },
        { time: 9_000_000, score: 300 },
      ],
    },
    {
      id: 'b',
      points: [
        { time: 2_000_000, score: 200 },
        { time: 9_500_000, score: 250 },
      ],
    },
    {
      id: 'c',
      points: [
        { time: 2_000_000, score: 500 },
        { time: 9_500_000, score: 500 },
      ],
    },
  ]

  test('reports climbers and fallers, omitting teams that did not move', () => {
    const deltas = getRankDeltaByTeam(undefined, allGraphData, null)
    expect(deltas.get('a')).toBe(1)
    expect(deltas.get('b')).toBe(-1)
    expect(deltas.has('c')).toBe(false)
    expect(deltas.size).toBe(2)
  })

  test('is empty during an active search', () => {
    expect(getRankDeltaByTeam('otter', allGraphData, null).size).toBe(0)
  })

  test('is empty when there is no graph data at all', () => {
    expect(getRankDeltaByTeam(undefined, [], null).size).toBe(0)
  })
})

describe('getGraphVisibility', () => {
  const entries = Array.from({ length: 25 }, (_, i) => ({ id: `t${i + 1}` }))

  function baseConfig() {
    return {
      entries,
      isLoading: false,
      minRank: 5,
      maxRank: 30,
      showTop3Context: true,
      showSelfContext: true,
      currentUserId: 't20',
      teamRanks: new Map(entries.map((e, i) => [e.id, i + 1])),
    }
  }

  test('empty visibility while loading or with no entries', () => {
    expect(getGraphVisibility({ ...baseConfig(), isLoading: true })).toEqual(
      getEmptyGraphVisibility()
    )
    expect(getGraphVisibility({ ...baseConfig(), entries: [] })).toEqual(
      getEmptyGraphVisibility()
    )
  })

  test('caps the viewport window at PAGE_SIZE and pins top-3 + self when outside', () => {
    const { visibleTeamIds, contextTeamIds } = getGraphVisibility(baseConfig())
    // Window ranks 5..19 (15 = PAGE_SIZE rows, maxRank clamped down).
    const windowIds = Array.from({ length: PAGE_SIZE }, (_, i) => `t${i + 5}`)
    for (const id of windowIds) expect(visibleTeamIds.has(id)).toBe(true)
    // A team past the window that is neither top-3 nor self stays hidden.
    expect(visibleTeamIds.has('t21')).toBe(false)
    // top-3 pinned into visible + context.
    for (const id of ['t1', 't2', 't3']) {
      expect(visibleTeamIds.has(id)).toBe(true)
      expect(contextTeamIds.has(id)).toBe(true)
    }
    // self (rank 20, outside the window) is added to visible.
    expect(visibleTeamIds.has('t20')).toBe(true)
    expect(visibleTeamIds.size).toBe(PAGE_SIZE + 3 + 1)
  })

  test('no duplicate when self is inside the top-3', () => {
    const { visibleTeamIds } = getGraphVisibility({
      ...baseConfig(),
      currentUserId: 't2',
    })
    expect(visibleTeamIds.has('t2')).toBe(true)
    // window (15) + top-3 (3); self is already in top-3 so no extra entry.
    expect(visibleTeamIds.size).toBe(PAGE_SIZE + 3)
  })

  test('falls back to the top ten when the viewport range is unset', () => {
    const { visibleTeamIds } = getGraphVisibility({
      ...baseConfig(),
      minRank: 0,
      maxRank: 0,
      currentUserId: null,
    })
    expect(visibleTeamIds.size).toBe(10)
    expect(visibleTeamIds.has('t1')).toBe(true)
    expect(visibleTeamIds.has('t11')).toBe(false)
  })
})

describe('getRankVariant', () => {
  test('maps the podium, self, and default ranks', () => {
    expect(getRankVariant(1, false)).toBe('first')
    expect(getRankVariant(2, false)).toBe('second')
    expect(getRankVariant(3, false)).toBe('third')
    expect(getRankVariant(4, true)).toBe('self')
    expect(getRankVariant(4, false)).toBe('nth')
  })

  test('podium wins over the self accent', () => {
    expect(getRankVariant(1, true)).toBe('first')
  })
})

describe('getVisibleSolveCount', () => {
  const challengesData = {
    'baby-rev': { scoringKind: 'decay' as const },
    flappy: { scoringKind: 'dynamic' as const },
  }

  test('excludes dynamic-scoring challenges from the count', () => {
    const solves = [{ id: 'baby-rev' }, { id: 'flappy' }, { id: 'unknown' }]
    expect(getVisibleSolveCount(solves, challengesData)).toBe(2)
  })

  test('is zero for an empty solve list', () => {
    expect(getVisibleSolveCount([], challengesData)).toBe(0)
  })
})

describe('getCategoryCellsInnerWidth', () => {
  test('sums fixed-width cells minus the trailing gap', () => {
    expect(getCategoryCellsInnerWidth(0)).toBe(0)
    expect(getCategoryCellsInnerWidth(1)).toBe(SCORE_CELL_WIDTH_PX)
    expect(getCategoryCellsInnerWidth(3)).toBe(
      3 * SCORE_CELL_WIDTH_PX + 2 * SCORE_ROW_GAP_PX
    )
  })
})
