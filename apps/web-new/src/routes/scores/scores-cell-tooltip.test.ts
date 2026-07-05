import { formatLocalTime } from '$lib/utils/time'
import { describe, expect, test } from 'bun:test'
import { resolveCellTooltip } from './scores-cell-tooltip'

describe('resolveCellTooltip', () => {
  test('returns null for a non-cell target', () => {
    expect(resolveCellTooltip({})).toBeNull()
    expect(resolveCellTooltip({ kind: 'row-team' })).toBeNull()
  })

  test('solved challenge cell yields name, points, and solve time', () => {
    const solveTime = 1_710_000_000_000
    const tooltip = resolveCellTooltip({
      kind: 'challenge',
      name: 'baby-rev',
      points: '487',
      state: 'solved',
      solveTime: String(solveTime),
    })
    expect(tooltip).not.toBeNull()
    expect(tooltip!.title).toBe('baby-rev')
    expect(tooltip!.capitalize).toBe(false)
    expect(tooltip!.lines).toEqual([
      { text: '487 pts · Solved!' },
      { text: formatLocalTime(solveTime) },
    ])
  })

  test('unsolved challenge cell omits the solve-time row', () => {
    const tooltip = resolveCellTooltip({
      kind: 'challenge',
      name: 'baby-rev',
      points: '500',
      state: 'unsolved',
    })
    expect(tooltip!.lines).toEqual([{ text: '500 pts · Unsolved' }])
  })

  test('blood challenge cell adds a medal status row', () => {
    const tooltip = resolveCellTooltip({
      kind: 'challenge',
      name: 'baby-rev',
      points: '500',
      state: 'solved',
      blood: '1',
      solveTime: '1710000000000',
    })
    expect(tooltip!.lines[0]).toEqual({ text: '500 pts · First blood!' })
    expect(
      resolveCellTooltip({ kind: 'challenge', name: 'x', blood: '3' })!.lines[0]
    ).toEqual({ text: '0 pts · Third blood!' })
  })

  test('dynamic challenge cell yields current points and trend-colored delta', () => {
    const up = resolveCellTooltip({
      kind: 'challenge',
      name: 'flappy',
      dynamic: '',
      teamPoints: '487',
      pointDelta: '13',
    })
    expect(up!.lines).toEqual([
      { text: 'Current: 487 pts' },
      { text: 'Last update: +13 pts', trend: 'positive' },
    ])

    const down = resolveCellTooltip({
      kind: 'challenge',
      name: 'flappy',
      dynamic: '',
      teamPoints: '474',
      pointDelta: '-13',
    })
    expect(down!.lines[1]).toEqual({
      text: 'Last update: -13 pts',
      trend: 'negative',
    })

    const flat = resolveCellTooltip({
      kind: 'challenge',
      name: 'flappy',
      dynamic: '',
      teamPoints: '500',
      pointDelta: '0',
    })
    expect(flat!.lines[1]).toEqual({
      text: 'Last update: 0 pts',
      trend: 'neutral',
    })
  })

  test('category cell yields solved / total', () => {
    const partial = resolveCellTooltip({
      kind: 'category',
      name: 'crypto',
      solved: '2',
      total: '5',
    })
    expect(partial).toEqual({
      title: 'crypto',
      capitalize: true,
      lines: [{ text: '2 / 5 solved' }],
    })
  })

  test('all-dynamic category cell reports dynamic scoring', () => {
    const tooltip = resolveCellTooltip({
      kind: 'category',
      name: 'misc',
      solved: '0',
      total: '0',
    })
    expect(tooltip!.lines).toEqual([{ text: 'Dynamic scoring' }])
  })

  test('header challenge yields name and points', () => {
    expect(
      resolveCellTooltip({
        kind: 'header-challenge',
        name: 'baby-rev',
        points: '487',
      })
    ).toEqual({
      title: 'baby-rev',
      capitalize: false,
      lines: [{ text: '487 pts' }],
    })

    expect(
      resolveCellTooltip({
        kind: 'header-challenge',
        name: 'flappy',
        dynamic: '',
      })!.lines
    ).toEqual([{ text: 'Dynamic scoring' }])
  })

  test('header category yields counts, points, and dynamic suffix', () => {
    expect(
      resolveCellTooltip({
        kind: 'header-category',
        name: 'crypto',
        count: '4',
        points: '1500',
      })
    ).toEqual({
      title: 'crypto',
      capitalize: true,
      lines: [{ text: '4 challenges · 1500 pts' }],
    })

    expect(
      resolveCellTooltip({
        kind: 'header-category',
        name: 'crypto',
        count: '5',
        points: '1500',
        dynamicCount: '1',
      })!.lines
    ).toEqual([{ text: '5 challenges · 1500 pts (+ 1 dynamic)' }])

    expect(
      resolveCellTooltip({
        kind: 'header-category',
        name: 'misc',
        count: '1',
        points: '500',
      })!.lines
    ).toEqual([{ text: '1 challenge · 500 pts' }])
  })
})
