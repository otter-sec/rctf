import { describe, expect, test } from 'bun:test'
import {
  buildDurationLabel,
  buildFilename,
  DEFAULT_OPTIONS,
  deriveContextTeamIds,
  getDisplayTeamIds,
  getEmphasizeListedState,
  getEmphasizeSelfOnlyState,
  getVisibleGraphIds,
  type ScreenshotOptions,
} from './options'

function makeOptions(
  overrides: Partial<ScreenshotOptions> = {}
): ScreenshotOptions {
  return { ...DEFAULT_OPTIONS, ...overrides }
}

describe('getEmphasizeSelfOnlyState', () => {
  test('hidden without a self team', () => {
    const state = getEmphasizeSelfOnlyState(makeOptions(), false)
    expect(state.visible).toBe(false)
  })

  test('hidden when the graph is off', () => {
    const state = getEmphasizeSelfOnlyState(
      makeOptions({ showGraph: false }),
      true
    )
    expect(state.visible).toBe(false)
  })

  test('disabled with a reason when the self row is hidden', () => {
    const state = getEmphasizeSelfOnlyState(
      makeOptions({ showSelf: false }),
      true
    )
    expect(state.visible).toBe(true)
    expect(state.disabled).toBe(true)
    expect(state.reason).toBe('Requires "Show your team"')
  })

  test('enabled when the self row is shown', () => {
    const state = getEmphasizeSelfOnlyState(
      makeOptions({ showSelf: true }),
      true
    )
    expect(state.disabled).toBe(false)
    expect(state.reason).toBeNull()
  })
})

describe('getEmphasizeListedState', () => {
  test('disabled and overridden when self-only emphasis is active', () => {
    const state = getEmphasizeListedState(
      makeOptions({ emphasizeSelfOnly: true, graphTeamCount: 10, teamCount: 5 })
    )
    expect(state.disabled).toBe(true)
    expect(state.reason).toBe('Overridden by "Emphasize your team only"')
  })

  test('disabled when graphed teams do not exceed listed teams', () => {
    const state = getEmphasizeListedState(
      makeOptions({ emphasizeSelfOnly: false, graphTeamCount: 5, teamCount: 5 })
    )
    expect(state.disabled).toBe(true)
    expect(state.reason).toBe('Requires more graphed teams than listed')
  })

  test('enabled when more teams are graphed than listed', () => {
    const state = getEmphasizeListedState(
      makeOptions({
        emphasizeSelfOnly: false,
        graphTeamCount: 10,
        teamCount: 5,
      })
    )
    expect(state.disabled).toBe(false)
    expect(state.reason).toBeNull()
  })
})

describe('deriveContextTeamIds', () => {
  const graphIds = ['a', 'b', 'c', 'd']

  test('self-only mode dims every graphed team except self', () => {
    const context = deriveContextTeamIds(
      makeOptions({ emphasizeSelfOnly: true }),
      graphIds,
      ['a', 'b'],
      'c'
    )
    expect(context).toEqual(new Set(['a', 'b', 'd']))
  })

  test('listed mode dims graphed teams outside the displayed list', () => {
    const context = deriveContextTeamIds(
      makeOptions({
        emphasizeSelfOnly: false,
        emphasizeListedTeams: true,
        graphTeamCount: 4,
        teamCount: 2,
      }),
      graphIds,
      ['a', 'b'],
      null
    )
    expect(context).toEqual(new Set(['c', 'd']))
  })

  test('returns undefined when listed emphasis is off', () => {
    const context = deriveContextTeamIds(
      makeOptions({ emphasizeSelfOnly: false, emphasizeListedTeams: false }),
      graphIds,
      ['a', 'b'],
      null
    )
    expect(context).toBeUndefined()
  })

  test('returns undefined when graphed teams do not exceed listed teams', () => {
    const context = deriveContextTeamIds(
      makeOptions({
        emphasizeSelfOnly: false,
        emphasizeListedTeams: true,
        graphTeamCount: 2,
        teamCount: 2,
      }),
      graphIds,
      ['a', 'b'],
      null
    )
    expect(context).toBeUndefined()
  })
})

describe('getDisplayTeamIds', () => {
  const teamIds = ['a', 'b', 'c', 'd', 'e']

  test('appends self when outside the top slice and shown', () => {
    expect(getDisplayTeamIds(teamIds, 'e', 3, true)).toEqual([
      'a',
      'b',
      'c',
      'e',
    ])
  })

  test('does not duplicate self already inside the top slice', () => {
    expect(getDisplayTeamIds(teamIds, 'b', 3, true)).toEqual(['a', 'b', 'c'])
  })

  test('omits self when the self row is hidden', () => {
    expect(getDisplayTeamIds(teamIds, 'e', 3, false)).toEqual(['a', 'b', 'c'])
  })
})

describe('getVisibleGraphIds', () => {
  test('slices to the graphed team count', () => {
    expect(getVisibleGraphIds(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b'])
  })
})

describe('buildFilename', () => {
  test('embeds the ISO date and format extension', () => {
    const date = new Date('2024-03-09T12:34:56.000Z')
    expect(buildFilename('webp', date)).toBe('leaderboard-2024-03-09.webp')
  })
})

describe('buildDurationLabel', () => {
  const DAY = 24 * 60 * 60 * 1000
  const HOUR = 60 * 60 * 1000

  test('pluralizes days and hours', () => {
    expect(buildDurationLabel(0, 2 * DAY + 3 * HOUR)).toBe('2 days 3 hours')
  })

  test('uses singular units and omits zero components', () => {
    expect(buildDurationLabel(0, DAY + HOUR)).toBe('1 day 1 hour')
    expect(buildDurationLabel(0, 2 * DAY)).toBe('2 days')
  })
})
