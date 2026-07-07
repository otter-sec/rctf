import { describe, expect, test } from 'bun:test'
import {
  createTooltipTiming,
  resolveHoverTarget,
  type HoverTargetFacts,
} from './hover-state'

function makeFacts(
  overrides: Partial<HoverTargetFacts> = {}
): HoverTargetFacts {
  return {
    teamId: 'team-1',
    hasCell: false,
    columnId: null,
    hasSpark: false,
    overMatrixGap: false,
    ...overrides,
  }
}

describe('resolveHoverTarget — matrix cells', () => {
  test('over a cell sets the hovered column and row, leaves team state alone', () => {
    const patch = resolveHoverTarget(
      makeFacts({ hasCell: true, columnId: 'chall-1' })
    )
    expect(patch).toStrictEqual({ columnId: 'chall-1', rowId: 'team-1' })
  })

  test('over a cell without a column id sets the column to null', () => {
    const patch = resolveHoverTarget(makeFacts({ hasCell: true }))
    expect(patch).toStrictEqual({ columnId: null, rowId: 'team-1' })
  })

  test('off any cell outside the matrix gap clears everything', () => {
    const patch = resolveHoverTarget(makeFacts())
    expect(patch).toStrictEqual({
      columnId: null,
      rowId: null,
      teamId: null,
      solveHighlight: null,
    })
  })

  test('over the matrix gap leaves the column and row untouched', () => {
    const patch = resolveHoverTarget(makeFacts({ overMatrixGap: true }))
    expect(patch).toStrictEqual({ teamId: null, solveHighlight: null })
  })
})

describe('resolveHoverTarget — sparklines', () => {
  test('over a spark highlights the team and clears column state', () => {
    const patch = resolveHoverTarget(makeFacts({ hasSpark: true }))
    expect(patch).toStrictEqual({
      columnId: null,
      rowId: null,
      teamId: 'team-1',
      solveHighlight: null,
    })
  })

  test('over a spark in the matrix gap only touches team state', () => {
    const patch = resolveHoverTarget(
      makeFacts({ hasSpark: true, overMatrixGap: true })
    )
    expect(patch).toStrictEqual({ teamId: 'team-1', solveHighlight: null })
  })

  test('over a spark with no team resolves a null team highlight', () => {
    const patch = resolveHoverTarget(
      makeFacts({ hasSpark: true, teamId: null, overMatrixGap: true })
    )
    expect(patch).toStrictEqual({ teamId: null, solveHighlight: null })
  })

  test('spark inside a cell sets both column and team state', () => {
    const patch = resolveHoverTarget(
      makeFacts({ hasCell: true, columnId: 'chall-1', hasSpark: true })
    )
    expect(patch).toStrictEqual({
      columnId: 'chall-1',
      rowId: 'team-1',
      teamId: 'team-1',
      solveHighlight: null,
    })
  })
})

interface FakeTimer {
  id: number
  callback: () => void
  delayMs: number
}

function createTimingHarness() {
  let nextId = 1
  const pending: FakeTimer[] = []
  const shows: string[] = []
  const timing = createTooltipTiming<string>({
    openDelayMs: 400,
    cooldownMs: 300,
    setTimer: (callback, delayMs) => {
      const id = nextId
      nextId += 1
      pending.push({ id, callback, delayMs })
      return id
    },
    clearTimer: id => {
      const index = pending.findIndex(timer => timer.id === id)
      if (index !== -1) pending.splice(index, 1)
    },
  })
  const hover = (key: string, isHeader = false) =>
    timing.pointerOverCell(key, isHeader, () => shows.push(key))
  const fireNext = () => {
    const timer = pending.shift()
    if (!timer) throw new Error('no pending fake timer to fire')
    timer.callback()
    return timer
  }
  return { timing, pending, shows, hover, fireNext }
}

describe('createTooltipTiming — opening', () => {
  test('cold hover schedules show after the open delay and fires once', () => {
    const { pending, shows, hover, fireNext } = createTimingHarness()
    expect(hover('a')).toBe('scheduled')
    expect(shows).toEqual([])
    expect(pending).toHaveLength(1)
    expect(fireNext().delayMs).toBe(400)
    expect(shows).toEqual(['a'])
    expect(pending).toHaveLength(0)
  })

  test('pointer staying on the pending cell is a no-op', () => {
    const { pending, shows, hover } = createTimingHarness()
    hover('a')
    expect(hover('a')).toBe('ignored')
    expect(pending).toHaveLength(1)
    expect(shows).toEqual([])
  })

  test('pointer staying on the active cell is a no-op', () => {
    const { pending, shows, hover, fireNext } = createTimingHarness()
    hover('a')
    fireNext()
    expect(hover('a')).toBe('ignored')
    expect(pending).toHaveLength(0)
    expect(shows).toEqual(['a'])
  })

  test('moving to a second cell before expiry cancels and reschedules', () => {
    const { pending, shows, hover, fireNext } = createTimingHarness()
    hover('a')
    expect(hover('b')).toBe('scheduled')
    expect(pending).toHaveLength(1)
    expect(fireNext().delayMs).toBe(400)
    expect(shows).toEqual(['b'])
  })
})

describe('createTooltipTiming — warm re-open', () => {
  test('warm + header opens immediately without a timer', () => {
    const { pending, shows, hover, fireNext } = createTimingHarness()
    hover('a')
    fireNext()
    expect(hover('header', true)).toBe('shown')
    expect(shows).toEqual(['a', 'header'])
    expect(pending).toHaveLength(0)
  })

  test('warm + non-header still waits the full delay', () => {
    const { pending, shows, hover, fireNext } = createTimingHarness()
    hover('a')
    fireNext()
    expect(hover('b')).toBe('scheduled')
    expect(shows).toEqual(['a'])
    expect(fireNext().delayMs).toBe(400)
    expect(shows).toEqual(['a', 'b'])
    expect(pending).toHaveLength(0)
  })

  test('cold hover on a header is not immediate', () => {
    const { hover, fireNext } = createTimingHarness()
    expect(hover('header', true)).toBe('scheduled')
    expect(fireNext().delayMs).toBe(400)
  })
})

describe('createTooltipTiming — cooldown', () => {
  test('clear with an active tooltip starts the cooldown', () => {
    const { pending, hover, fireNext, timing } = createTimingHarness()
    hover('a')
    fireNext()
    timing.clear()
    expect(pending).toHaveLength(1)
    expect(pending[0]?.delayMs).toBe(300)
  })

  test('header re-open while cooling is immediate and cancels the cooldown', () => {
    const { pending, shows, hover, fireNext, timing } = createTimingHarness()
    hover('a')
    fireNext()
    timing.clear()
    expect(hover('header', true)).toBe('shown')
    expect(shows).toEqual(['a', 'header'])
    expect(pending).toHaveLength(0)
  })

  test('warm drops only after the cooldown elapses', () => {
    const { hover, fireNext, timing } = createTimingHarness()
    hover('a')
    fireNext()
    timing.clear()
    fireNext()
    expect(hover('header', true)).toBe('scheduled')
  })

  test('a new active clear while cooling restarts the cooldown', () => {
    const { pending, hover, fireNext, timing } = createTimingHarness()
    hover('a')
    fireNext()
    timing.clear()
    hover('header', true)
    timing.clear()
    expect(pending).toHaveLength(1)
    expect(pending[0]?.delayMs).toBe(300)
  })

  test('clear without an active tooltip only cancels the pending open', () => {
    const { pending, hover, timing } = createTimingHarness()
    hover('a')
    timing.clear()
    expect(pending).toHaveLength(0)
    timing.clear()
    expect(pending).toHaveLength(0)
  })

  test('warm persists when an active tooltip is replaced by a scheduled open, then cleared', () => {
    const { pending, hover, timing, fireNext } = createTimingHarness()
    hover('a')
    fireNext()
    expect(hover('b')).toBe('scheduled')
    timing.clear()
    expect(pending).toHaveLength(0)
    expect(hover('h', true)).toBe('shown')
  })
})

describe('createTooltipTiming — isCurrent', () => {
  test('tracks the pending cell, then the active cell, until cleared', () => {
    const { hover, fireNext, timing } = createTimingHarness()
    expect(timing.isCurrent('a')).toBe(false)
    hover('a')
    expect(timing.isCurrent('a')).toBe(true)
    expect(timing.isCurrent('b')).toBe(false)
    fireNext()
    expect(timing.isCurrent('a')).toBe(true)
    timing.clear()
    expect(timing.isCurrent('a')).toBe(false)
  })
})

describe('createTooltipTiming — dispose', () => {
  test('dispose clears both the open and cooldown timers', () => {
    const { pending, shows, hover, fireNext, timing } = createTimingHarness()
    hover('a')
    fireNext()
    timing.clear()
    hover('b')
    expect(pending).toHaveLength(2)
    timing.dispose()
    expect(pending).toHaveLength(0)
    expect(shows).toEqual(['a'])
  })
})
