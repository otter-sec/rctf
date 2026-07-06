import { describe, expect, test } from 'bun:test'
import type { ProfileSolve } from './analytics-data'
import {
  buildProfileGraphData,
  type GraphSampleInput,
  type ProfileGraphInput,
} from './graph-data'

const START = 1000
const END = 1_000_000_000

function solve(overrides: Partial<ProfileSolve>): ProfileSolve {
  return {
    id: 'chal',
    name: 'chal',
    category: 'misc',
    points: 100,
    awardedPoints: null,
    solves: 5,
    createdAt: 100,
    bloodIndex: null,
    ...overrides,
  }
}

function input(overrides: Partial<ProfileGraphInput>): ProfileGraphInput {
  return {
    graphData: { points: [] },
    solves: [],
    dynamicScores: [],
    startTime: START,
    endTime: END,
    splitDynamicScore: false,
    ...overrides,
  }
}

const twoSamples: GraphSampleInput = {
  points: [
    { time: 100, score: 500 },
    { time: 200, score: 800 },
  ],
}

describe('buildProfileGraphData line splitting', () => {
  test('renders a single total line when not splitting dynamic score', () => {
    const data = buildProfileGraphData(input({ graphData: twoSamples }))

    expect(data.hasTotalLine).toBe(true)
    expect(data.staticLine).toEqual([])
    expect(data.dynamicLine).toEqual([])
    expect(data.hasStaticLine).toBe(false)
    expect(data.hasDynamicLine).toBe(false)
  })

  test('static line is total minus dynamic history at matching timestamps', () => {
    const data = buildProfileGraphData(
      input({
        splitDynamicScore: true,
        graphData: {
          points: [
            { time: 100, score: 500 },
            { time: 200, score: 800 },
          ],
          dynamicPoints: [
            { time: 100, score: 100 },
            { time: 200, score: 300 },
          ],
        },
      })
    )

    expect(data.dynamicLine).toEqual([
      { time: 100, score: 100 },
      { time: 200, score: 300 },
    ])
    expect(data.staticLine).toEqual([
      { time: 100, score: 400 },
      { time: 200, score: 500 },
    ])
    expect(data.hasStaticLine).toBe(true)
    expect(data.hasDynamicLine).toBe(true)
  })

  test('falls back to a flat current-score dynamic line when no history exists', () => {
    const data = buildProfileGraphData(
      input({
        splitDynamicScore: true,
        graphData: twoSamples,
        dynamicScores: [
          { id: 'd1', points: 150, pointDelta: 0 },
          { id: 'd2', points: 50, pointDelta: 0 },
        ],
      })
    )

    expect(data.dynamicLine).toEqual([
      { time: 100, score: 200 },
      { time: 200, score: 200 },
    ])
    expect(data.staticLine).toEqual([
      { time: 100, score: 300 },
      { time: 200, score: 600 },
    ])
    expect(data.hasDynamicLine).toBe(true)
  })

  test('no dynamic line when splitting is requested but no dynamic data exists', () => {
    const data = buildProfileGraphData(
      input({ splitDynamicScore: true, graphData: twoSamples })
    )

    expect(data.dynamicLine).toEqual([])
    expect(data.hasDynamicLine).toBe(false)
    expect(data.staticLine).toEqual([
      { time: 100, score: 500 },
      { time: 200, score: 800 },
    ])
  })
})

describe('buildProfileGraphData solve dots', () => {
  test('accumulates a running score with before + points = after', () => {
    const data = buildProfileGraphData(
      input({
        graphData: twoSamples,
        solves: [
          solve({ id: 'a', createdAt: 150, points: 100 }),
          solve({ id: 'b', createdAt: 250, points: 50 }),
        ],
      })
    )

    expect(data.solveDots).toHaveLength(2)
    const [first, second] = data.solveDots
    expect(first).toMatchObject({ scoreBefore: 0, points: 100, score: 100 })
    expect(second).toMatchObject({ scoreBefore: 100, points: 50, score: 150 })
    for (const dot of data.solveDots) {
      expect(dot.scoreBefore + (dot.points ?? 0)).toBe(dot.score)
    }
  })

  test('prefers awardedPoints over the challenge points value', () => {
    const data = buildProfileGraphData(
      input({
        graphData: twoSamples,
        solves: [
          solve({ id: 'a', createdAt: 150, points: 500, awardedPoints: 120 }),
        ],
      })
    )

    expect(data.solveDots[0]).toMatchObject({ points: 120, score: 120 })
  })

  test('accumulates in the order solves are given (caller must pre-sort)', () => {
    const data = buildProfileGraphData(
      input({
        graphData: twoSamples,
        solves: [
          solve({ id: 'a', createdAt: 150, points: 100 }),
          solve({ id: 'b', createdAt: 250, points: 50 }),
        ],
      })
    )

    expect(data.solveDots.map(dot => dot.key)).toEqual(['solve-a', 'solve-b'])
    expect(data.solveDots[1]).toMatchObject({ scoreBefore: 100, score: 150 })
  })

  test('reads scoreBefore from the static line when splitting dynamic score', () => {
    const data = buildProfileGraphData(
      input({
        splitDynamicScore: true,
        graphData: {
          points: [
            { time: 100, score: 500 },
            { time: 200, score: 800 },
          ],
          dynamicPoints: [
            { time: 100, score: 100 },
            { time: 200, score: 300 },
          ],
        },
        solves: [solve({ id: 'a', createdAt: 200, points: 50 })],
      })
    )

    expect(data.solveDots[0]).toMatchObject({ scoreBefore: 450, score: 500 })
  })

  test('carries category display fields onto each dot', () => {
    const data = buildProfileGraphData(
      input({
        graphData: twoSamples,
        solves: [solve({ id: 'a', category: 'crypto', name: 'baby-crypto' })],
      })
    )

    expect(data.solveDots[0]).toMatchObject({
      name: 'baby-crypto',
      catShort: 'crypto',
      color: 'yellow',
    })
    expect(data.solveDots[0]?.categoryIcon).toBeDefined()
  })

  test('empty solves produce no dots without throwing', () => {
    const data = buildProfileGraphData(input({ graphData: twoSamples }))
    expect(data.solveDots).toEqual([])
  })
})

describe('buildProfileGraphData domain', () => {
  test('clamps the x-domain upper bound to endTime when samples run past it', () => {
    const data = buildProfileGraphData(
      input({
        graphData: {
          points: [
            { time: 100, score: 500 },
            { time: 200, score: 800 },
          ],
        },
        startTime: 100,
        endTime: 150,
      })
    )

    expect(data.xDomain).toEqual([100, 150])
  })

  test('pads a single-sample domain by a half hour', () => {
    const data = buildProfileGraphData(
      input({
        graphData: { points: [{ time: 100, score: 500 }] },
        startTime: 50,
      })
    )

    expect(data.xDomain).toEqual([50, 100 + 30 * 60 * 1000])
  })

  test('returns a null domain when there is nothing to plot', () => {
    const data = buildProfileGraphData(input({}))

    expect(data.xDomain).toBeNull()
    expect(data.yMax).toBe(1)
    expect(data.solveDots).toEqual([])
  })

  test('yMax reflects the tallest plotted point', () => {
    const data = buildProfileGraphData(input({ graphData: twoSamples }))
    expect(data.yMax).toBe(800)
  })
})
