import {
  SubmissionKind,
  SubmissionResult,
  SubmissionSortBy,
  SubmissionSortOrder,
  SubmissionTeamStatus,
} from '@rctf/types'
import {
  applyDeepLinkFilters,
  buildSubmissionsBody,
  createDeepLinkLatch,
  createSubmissionFilters,
  detailEntries,
  initialSubmissionSort,
  resultTone,
  submissionQueryFingerprint,
  type Submission,
  type SubmissionFilters,
  type SubmissionSort,
} from '$routes/admin/submissions/submissions-model'
import { describe, expect, test } from 'bun:test'

function submissionWith(overrides: Partial<Submission>): Submission {
  return {
    id: 'sub-1',
    kind: SubmissionKind.FLAG,
    challengeId: 'baby-rev',
    challengeName: 'baby-rev',
    challengeCategory: 'rev',
    userId: 'team-1',
    userName: 'otter-sec',
    userDivision: 'open',
    userAvatarUrl: null,
    userCountryCode: null,
    userStatusText: null,
    userBanned: false,
    ip: '203.0.113.7',
    result: SubmissionResult.CORRECT,
    details: {},
    relatedId: null,
    createdAt: '2024-03-09T00:00:00.000Z',
    ...overrides,
  }
}

describe('applyDeepLinkFilters', () => {
  const team = { id: 'team-1', name: 'otter-sec', avatarUrl: null }
  const secondTeam = { id: 'team-2', name: 'ottr-sec', avatarUrl: null }
  const challenge = { id: 'baby-rev', name: 'baby-rev', category: 'rev' }
  const secondChallenge = { id: 'baby-pwn', name: 'baby-pwn', category: 'pwn' }

  const targets = (
    teamId: string | null,
    teamOption: typeof team | null,
    challengeId: string | null,
    challengeOption: typeof challenge | null
  ) => ({
    team: { id: teamId, option: teamOption },
    challenge: { id: challengeId, option: challengeOption },
  })

  test('applies team and challenge as include filters when both resolve', () => {
    const filters = createSubmissionFilters()
    const latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, team, challenge.id, challenge)
    )

    expect(latch).toEqual({ teamId: team.id, challengeId: challenge.id })
    expect(filters.team).toEqual({
      mode: 'include',
      selected: [team],
      search: '',
    })
    expect(filters.challenge).toEqual({
      mode: 'include',
      selected: [challenge],
      search: '',
    })
  })

  test('applies each side once and never re-applies on a subsequent call', () => {
    const filters = createSubmissionFilters()
    let latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, team, challenge.id, challenge)
    )

    filters.team.selected = []
    filters.challenge.mode = 'exclude'

    latch = applyDeepLinkFilters(
      filters,
      latch,
      targets(team.id, team, challenge.id, challenge)
    )

    expect(latch).toEqual({ teamId: team.id, challengeId: challenge.id })
    expect(filters.team.selected).toEqual([])
    expect(filters.challenge.mode).toBe('exclude')
  })

  test('latches each side independently as it resolves', () => {
    const filters = createSubmissionFilters()

    let latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, null, challenge.id, challenge)
    )
    expect(latch).toEqual({ teamId: null, challengeId: challenge.id })
    expect(filters.team.selected).toEqual([])
    expect(filters.challenge.selected).toEqual([challenge])

    latch = applyDeepLinkFilters(
      filters,
      latch,
      targets(team.id, team, challenge.id, challenge)
    )
    expect(latch).toEqual({ teamId: team.id, challengeId: challenge.id })
    expect(filters.team.selected).toEqual([team])
  })

  test('does nothing while neither side has resolved', () => {
    const filters = createSubmissionFilters()
    const latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, null, challenge.id, null)
    )

    expect(latch).toEqual({ teamId: null, challengeId: null })
    expect(filters.team.selected).toEqual([])
    expect(filters.challenge.selected).toEqual([])
  })

  test('replaces applied filters when deep-link IDs change', () => {
    const filters = createSubmissionFilters()
    let latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, team, challenge.id, challenge)
    )

    latch = applyDeepLinkFilters(
      filters,
      latch,
      targets(secondTeam.id, secondTeam, secondChallenge.id, secondChallenge)
    )

    expect(latch).toEqual({
      teamId: secondTeam.id,
      challengeId: secondChallenge.id,
    })
    expect(filters.team.selected).toEqual([secondTeam])
    expect(filters.challenge.selected).toEqual([secondChallenge])
  })

  test('resets a latch while a changed deep link is unresolved', () => {
    const filters = createSubmissionFilters()
    let latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, team, challenge.id, challenge)
    )

    latch = applyDeepLinkFilters(
      filters,
      latch,
      targets(secondTeam.id, null, secondChallenge.id, null)
    )
    expect(latch).toEqual({ teamId: null, challengeId: null })

    latch = applyDeepLinkFilters(
      filters,
      latch,
      targets(secondTeam.id, secondTeam, secondChallenge.id, secondChallenge)
    )
    expect(filters.team.selected).toEqual([secondTeam])
    expect(filters.challenge.selected).toEqual([secondChallenge])
  })

  test('removing URL parameters resets latches so the same IDs can be reapplied', () => {
    const filters = createSubmissionFilters()
    let latch = applyDeepLinkFilters(
      filters,
      createDeepLinkLatch(),
      targets(team.id, team, challenge.id, challenge)
    )

    latch = applyDeepLinkFilters(
      filters,
      latch,
      targets(null, null, null, null)
    )
    expect(latch).toEqual({ teamId: null, challengeId: null })

    filters.team.selected = []
    filters.challenge.selected = []
    applyDeepLinkFilters(
      filters,
      latch,
      targets(team.id, team, challenge.id, challenge)
    )
    expect(filters.team.selected).toEqual([team])
    expect(filters.challenge.selected).toEqual([challenge])
  })
})

describe('detailEntries', () => {
  test('a flag submission surfaces only its submitted flag', () => {
    const entries = detailEntries(
      submissionWith({
        kind: SubmissionKind.FLAG,
        details: { submittedFlag: 'rctf{pwned}' },
      })
    )

    expect(entries).toEqual([{ label: 'flag', value: 'rctf{pwned}' }])
  })

  test('an admin-bot submission surfaces every present field in order', () => {
    const entries = detailEntries(
      submissionWith({
        kind: SubmissionKind.ADMIN_BOT,
        relatedId: 'job-42',
        details: {
          configRevision: 'rev-3',
          inputs: { url: 'https://x', cookie: 'abc' },
          error: 'timed out',
          instancerInstances: [{ id: 'a' }, { id: 'b' }],
        },
      })
    )

    expect(entries).toEqual([
      { label: 'revision', value: 'rev-3' },
      { label: 'job', value: 'job-42' },
      { label: 'url', value: 'https://x' },
      { label: 'cookie', value: 'abc' },
      { label: 'error', value: 'timed out', wide: true },
      { label: 'instances', value: '2 items' },
    ])
  })

  test('an admin-bot submission omits every absent field', () => {
    const entries = detailEntries(
      submissionWith({ kind: SubmissionKind.ADMIN_BOT, details: {} })
    )

    expect(entries).toEqual([])
  })
})

describe('resultTone', () => {
  test('maps all seven results to a tone', () => {
    expect(resultTone(SubmissionResult.CORRECT)).toBe('success')
    expect(resultTone(SubmissionResult.QUEUED)).toBe('success')
    expect(resultTone(SubmissionResult.ALREADY_SOLVED)).toBe('warning')
    expect(resultTone(SubmissionResult.ACTIVE_JOB)).toBe('warning')
    expect(resultTone(SubmissionResult.INCORRECT)).toBe('danger')
    expect(resultTone(SubmissionResult.INVALID_INPUT)).toBe('danger')
    expect(resultTone(SubmissionResult.BAD_INSTANCER_STATE)).toBe('danger')
  })
})

describe('buildSubmissionsBody', () => {
  const sort: SubmissionSort = initialSubmissionSort()

  test('serializes include and exclude filters under their body keys', () => {
    const filters = createSubmissionFilters()
    filters.challenge.mode = 'include'
    filters.challenge.selected = [
      { id: 'baby-rev', name: 'baby-rev', category: 'rev' },
    ]
    filters.kind.mode = 'exclude'
    filters.kind.selected = [SubmissionKind.ADMIN_BOT]

    const body = buildSubmissionsBody(filters, sort)

    expect(body.challenge).toEqual({ include: ['baby-rev'] })
    expect(body.kind).toEqual({ exclude: [SubmissionKind.ADMIN_BOT] })
    expect(body.limit).toBe(100)
    expect(body.sortBy).toBe(SubmissionSortBy.CREATED_AT)
    expect(body.sortOrder).toBe(SubmissionSortOrder.DESC)
  })

  test('omits filter keys with no selection', () => {
    const body = buildSubmissionsBody(createSubmissionFilters(), sort)

    expect(body.challenge).toBeUndefined()
    expect(body.team).toBeUndefined()
    expect(body.createdAfter).toBeUndefined()
    expect(body.createdBefore).toBeUndefined()
  })

  test('emits time params for a valid absolute range', () => {
    const filters = createSubmissionFilters()
    filters.time.mode = 'absolute'
    filters.time.start = '2024-03-09T00:00'
    filters.time.end = '2024-03-10T00:00'

    const body = buildSubmissionsBody(filters, sort)

    expect(body.createdAfter).toBeDefined()
    expect(body.createdBefore).toBeDefined()
  })

  test('emits no time params when the range is invalid', () => {
    const filters = createSubmissionFilters()
    filters.time.mode = 'absolute'
    filters.time.start = '2024-03-10T00:00'
    filters.time.end = '2024-03-09T00:00'

    const body = buildSubmissionsBody(filters, sort)

    expect(body.createdAfter).toBeUndefined()
    expect(body.createdBefore).toBeUndefined()
  })
})

describe('submissionQueryFingerprint', () => {
  function fingerprintFor(
    mutate: (filters: SubmissionFilters) => void
  ): string {
    const filters = createSubmissionFilters()
    mutate(filters)
    return submissionQueryFingerprint(filters, initialSubmissionSort())
  }

  test('is stable for identical filter and sort state', () => {
    expect(fingerprintFor(() => {})).toBe(fingerprintFor(() => {}))
  })

  test('changes when a value filter changes', () => {
    const base = fingerprintFor(() => {})
    const next = fingerprintFor(filters => {
      filters.result.selected = [SubmissionResult.CORRECT]
    })

    expect(next).not.toBe(base)
  })

  test('changes when the team-status filter changes', () => {
    const base = fingerprintFor(() => {})
    const next = fingerprintFor(filters => {
      filters.teamStatus.selected = [SubmissionTeamStatus.BANNED]
    })

    expect(next).not.toBe(base)
  })

  test('changes when the sort changes', () => {
    const filters = createSubmissionFilters()
    const base = submissionQueryFingerprint(filters, initialSubmissionSort())
    const next = submissionQueryFingerprint(filters, {
      by: SubmissionSortBy.TEAM,
      order: 'asc',
    })

    expect(next).not.toBe(base)
  })
})
