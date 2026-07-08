import { resolveCellTooltip } from '$routes/scores/leaderboard/cell-tooltip'
import { describe, expect, test } from 'bun:test'

const START_TIME = 1_710_000_000_000

describe('resolveCellTooltip', () => {
  test('returns null for a non-cell target', () => {
    expect(resolveCellTooltip({}, START_TIME)).toBeNull()
    expect(resolveCellTooltip({ kind: 'row-team' }, START_TIME)).toBeNull()
  })

  test('solved challenge cell yields points, check icon, and CTF-offset solve time', () => {
    const solveTime = START_TIME + (3 * 60 + 24) * 60_000
    const tooltip = resolveCellTooltip(
      {
        kind: 'challenge',
        name: 'baby-rev',
        points: '487',
        state: 'solved',
        solveTime: String(solveTime),
      },
      START_TIME
    )
    expect(tooltip).not.toBeNull()
    expect(tooltip!.title).toBe('baby-rev')
    expect(tooltip!.capitalize).toBe(false)
    expect(tooltip!.lines).toEqual([
      { text: '487 pts ·', icon: { kind: 'solved' }, iconLabel: 'Solved' },
      { text: '+3h 24m' },
    ])
  })

  test('unsolved challenge cell omits the icon and solve-time row', () => {
    const tooltip = resolveCellTooltip(
      {
        kind: 'challenge',
        name: 'baby-rev',
        points: '500',
        state: 'unsolved',
      },
      START_TIME
    )
    expect(tooltip!.lines).toEqual([{ text: '500 pts · Unsolved' }])
  })

  test('blood challenge cell yields a medal icon with its label', () => {
    const tooltip = resolveCellTooltip(
      {
        kind: 'challenge',
        name: 'baby-rev',
        points: '500',
        state: 'solved',
        blood: '1',
        solveTime: String(START_TIME + 60_000),
      },
      START_TIME
    )
    expect(tooltip!.lines[0]).toEqual({
      text: '500 pts ·',
      icon: { kind: 'blood', medal: 1 },
      iconLabel: 'First blood',
    })
    expect(tooltip!.lines[1]).toEqual({ text: '+0h 1m' })
    expect(
      resolveCellTooltip(
        { kind: 'challenge', name: 'x', blood: '3' },
        START_TIME
      )!.lines[0]
    ).toEqual({
      text: '0 pts ·',
      icon: { kind: 'blood', medal: 3 },
      iconLabel: 'Third blood',
    })
  })

  test('dynamic challenge cell yields current points and trend-colored delta', () => {
    const up = resolveCellTooltip(
      {
        kind: 'challenge',
        name: 'flappy',
        dynamic: '',
        teamPoints: '487',
        pointDelta: '13',
      },
      START_TIME
    )
    expect(up!.lines).toEqual([
      { text: 'Current: 487 pts' },
      { text: 'Last update: +13 pts', trend: 'positive' },
    ])

    const down = resolveCellTooltip(
      {
        kind: 'challenge',
        name: 'flappy',
        dynamic: '',
        teamPoints: '474',
        pointDelta: '-13',
      },
      START_TIME
    )
    expect(down!.lines[1]).toEqual({
      text: 'Last update: -13 pts',
      trend: 'negative',
    })

    const flat = resolveCellTooltip(
      {
        kind: 'challenge',
        name: 'flappy',
        dynamic: '',
        teamPoints: '500',
        pointDelta: '0',
      },
      START_TIME
    )
    expect(flat!.lines[1]).toEqual({
      text: 'Last update: 0 pts',
      trend: 'neutral',
    })
  })

  test('category cell yields solved / total', () => {
    const partial = resolveCellTooltip(
      {
        kind: 'category',
        name: 'crypto',
        solved: '2',
        total: '5',
      },
      START_TIME
    )
    expect(partial).toEqual({
      title: 'crypto',
      capitalize: true,
      lines: [{ text: '2 / 5 solved' }],
    })
  })

  test('all-dynamic category cell reports dynamic scoring', () => {
    const tooltip = resolveCellTooltip(
      {
        kind: 'category',
        name: 'misc',
        solved: '0',
        total: '0',
      },
      START_TIME
    )
    expect(tooltip!.lines).toEqual([{ text: 'Dynamic scoring' }])
  })

  test('header challenge yields name and points', () => {
    expect(
      resolveCellTooltip(
        {
          kind: 'header-challenge',
          name: 'baby-rev',
          points: '487',
        },
        START_TIME
      )
    ).toEqual({
      title: 'baby-rev',
      capitalize: false,
      lines: [{ text: '487 pts' }],
    })

    expect(
      resolveCellTooltip(
        {
          kind: 'header-challenge',
          name: 'flappy',
          dynamic: '',
        },
        START_TIME
      )!.lines
    ).toEqual([{ text: 'Dynamic scoring' }])
  })

  test('header category yields counts, points, and dynamic suffix', () => {
    expect(
      resolveCellTooltip(
        {
          kind: 'header-category',
          name: 'crypto',
          count: '4',
          points: '1500',
        },
        START_TIME
      )
    ).toEqual({
      title: 'crypto',
      capitalize: true,
      lines: [{ text: '4 challenges · 1500 pts' }],
    })

    expect(
      resolveCellTooltip(
        {
          kind: 'header-category',
          name: 'crypto',
          count: '5',
          points: '1500',
          dynamicCount: '1',
        },
        START_TIME
      )!.lines
    ).toEqual([{ text: '5 challenges · 1500 pts (+ 1 dynamic)' }])

    expect(
      resolveCellTooltip(
        {
          kind: 'header-category',
          name: 'misc',
          count: '1',
          points: '500',
        },
        START_TIME
      )!.lines
    ).toEqual([{ text: '1 challenge · 500 pts' }])
  })
})
