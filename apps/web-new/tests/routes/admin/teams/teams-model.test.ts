import { AdminTeamSortBy, AdminTeamStatus, SortOrder } from '@rctf/types'
import { createFilter, type MultiFilter } from '$lib/filters/core'
import {
  deriveTeamStatus,
  pendingVerificationMatchesFilters,
  registeredRowsMayMatch,
  serverStatusValues,
  sortTeamRows,
  statusTone,
  teamQueryParams,
  UNVERIFIED,
  type AdminTeam,
  type DivisionOption,
  type PendingVerification,
  type TeamFilters,
  type TeamRow,
  type TeamStatusValue,
} from '$routes/admin/teams/teams-model'
import { describe, expect, test } from 'bun:test'

function team(overrides: Partial<AdminTeam> = {}): AdminTeam {
  return {
    id: overrides.id ?? 'team-1',
    name: overrides.name ?? 'alpha',
    email: overrides.email ?? 'alpha@osec.io',
    division: overrides.division ?? 'open',
    perms: overrides.perms ?? 0,
    banned: overrides.banned ?? false,
    score: overrides.score ?? 100,
    solveCount: overrides.solveCount ?? 3,
    avatarUrl: overrides.avatarUrl ?? null,
    countryCode: overrides.countryCode ?? null,
    statusText: overrides.statusText ?? null,
    createdAt: overrides.createdAt ?? '2024-03-09T00:00:00.000Z',
  }
}

function verification(
  overrides: Partial<PendingVerification> = {}
): PendingVerification {
  return {
    id: overrides.id ?? 'verif-1',
    name: overrides.name ?? 'pending-team',
    email: overrides.email ?? 'pending@osec.io',
    division: overrides.division ?? 'open',
    createdAt: overrides.createdAt ?? 1_710_000_000_000,
    expiresAt: overrides.expiresAt ?? 1_710_003_600_000,
  }
}

function registered(overrides: Partial<AdminTeam> = {}): TeamRow {
  return { kind: 'registered', team: team(overrides) }
}

function pending(overrides: Partial<PendingVerification> = {}): TeamRow {
  return { kind: 'pending', verification: verification(overrides) }
}

function statusFilter(
  mode: 'include' | 'exclude',
  selected: TeamStatusValue[]
): MultiFilter<TeamStatusValue> {
  return { mode, selected }
}

function divisionFilter(
  mode: 'include' | 'exclude',
  selected: DivisionOption[]
): MultiFilter<DivisionOption> {
  return { mode, selected }
}

function filters(overrides: Partial<TeamFilters> = {}): TeamFilters {
  return {
    status: overrides.status ?? createFilter<TeamStatusValue>(),
    division: overrides.division ?? createFilter<DivisionOption>(),
    search: overrides.search ?? '',
  }
}

describe('deriveTeamStatus', () => {
  test('admin precedence wins over a ban', () => {
    expect(deriveTeamStatus(team({ perms: 1, banned: true }))).toBe(
      AdminTeamStatus.ADMIN
    )
  })

  test('banned before active', () => {
    expect(deriveTeamStatus(team({ perms: 0, banned: true }))).toBe(
      AdminTeamStatus.BANNED
    )
  })

  test('plain teams are active', () => {
    expect(deriveTeamStatus(team({ perms: 0, banned: false }))).toBe(
      AdminTeamStatus.ACTIVE
    )
  })
})

describe('statusTone', () => {
  test('maps every status to a tone', () => {
    expect(statusTone(AdminTeamStatus.ACTIVE)).toBe('success')
    expect(statusTone(AdminTeamStatus.BANNED)).toBe('danger')
    expect(statusTone(AdminTeamStatus.ADMIN)).toBe('accent')
    expect(statusTone(UNVERIFIED)).toBe('warning')
  })
})

describe('registeredRowsMayMatch', () => {
  test('no status filter matches everything', () => {
    expect(registeredRowsMayMatch(statusFilter('include', []))).toBe(true)
  })

  test('include of only unverified cannot match a registered row', () => {
    expect(registeredRowsMayMatch(statusFilter('include', [UNVERIFIED]))).toBe(
      false
    )
  })

  test('include with a real status alongside unverified may match', () => {
    expect(
      registeredRowsMayMatch(
        statusFilter('include', [AdminTeamStatus.ACTIVE, UNVERIFIED])
      )
    ).toBe(true)
  })

  test('excluding only unverified leaves registered statuses matchable', () => {
    expect(registeredRowsMayMatch(statusFilter('exclude', [UNVERIFIED]))).toBe(
      true
    )
  })

  test('excluding every registered status matches nothing registered', () => {
    expect(
      registeredRowsMayMatch(
        statusFilter('exclude', [
          AdminTeamStatus.ACTIVE,
          AdminTeamStatus.BANNED,
          AdminTeamStatus.ADMIN,
        ])
      )
    ).toBe(false)
  })
})

describe('sortTeamRows', () => {
  test('score DESC keeps pending rows last and breaks ties by name', () => {
    const rows: TeamRow[] = [
      registered({ id: 'a', name: 'bravo', score: 50 }),
      registered({ id: 'b', name: 'alpha', score: 50 }),
      registered({ id: 'c', name: 'charlie', score: 200 }),
      pending({ id: 'p', name: 'zulu' }),
    ]
    const sorted = sortTeamRows(rows, AdminTeamSortBy.SCORE, SortOrder.DESC)
    expect(sorted.map(rowKey)).toEqual(['c', 'b', 'a', 'p'])
  })

  test('team ASC orders by name across both kinds', () => {
    const rows: TeamRow[] = [
      registered({ id: 'a', name: 'delta' }),
      pending({ id: 'p', name: 'bravo' }),
      registered({ id: 'b', name: 'alpha' }),
    ]
    const sorted = sortTeamRows(rows, AdminTeamSortBy.TEAM, SortOrder.ASC)
    expect(sorted.map(rowKey)).toEqual(['b', 'p', 'a'])
  })

  test('name tiebreak stays ascending regardless of sort direction', () => {
    const rows: TeamRow[] = [
      registered({ id: 'b', name: 'bravo', score: 50 }),
      registered({ id: 'a', name: 'alpha', score: 50 }),
    ]
    const sorted = sortTeamRows(rows, AdminTeamSortBy.SCORE, SortOrder.DESC)
    expect(sorted.map(rowKey)).toEqual(['a', 'b'])
  })
})

describe('pendingVerificationMatchesFilters', () => {
  const divisions = { open: 'Open Division', hs: 'High School' }

  test('include unverified keeps pending rows', () => {
    expect(
      pendingVerificationMatchesFilters(
        verification(),
        filters({ status: statusFilter('include', [UNVERIFIED]) }),
        divisions
      )
    ).toBe(true)
  })

  test('include of only registered statuses drops pending rows', () => {
    expect(
      pendingVerificationMatchesFilters(
        verification(),
        filters({ status: statusFilter('include', [AdminTeamStatus.ACTIVE]) }),
        divisions
      )
    ).toBe(false)
  })

  test('excluding unverified drops pending rows', () => {
    expect(
      pendingVerificationMatchesFilters(
        verification(),
        filters({ status: statusFilter('exclude', [UNVERIFIED]) }),
        divisions
      )
    ).toBe(false)
  })

  test('excluding a registered status keeps pending rows', () => {
    expect(
      pendingVerificationMatchesFilters(
        verification(),
        filters({ status: statusFilter('exclude', [AdminTeamStatus.BANNED]) }),
        divisions
      )
    ).toBe(true)
  })

  test('division include filters by option value', () => {
    const hs = { value: 'hs', label: 'High School' }
    expect(
      pendingVerificationMatchesFilters(
        verification({ division: 'open' }),
        filters({ division: divisionFilter('include', [hs]) }),
        divisions
      )
    ).toBe(false)
    expect(
      pendingVerificationMatchesFilters(
        verification({ division: 'hs' }),
        filters({ division: divisionFilter('include', [hs]) }),
        divisions
      )
    ).toBe(true)
  })

  test('search matches name, email, division label, and the word unverified', () => {
    const target = verification({ name: 'otterctf', email: 'ott@osec.io' })
    expect(
      pendingVerificationMatchesFilters(
        target,
        filters({ search: 'otter' }),
        divisions
      )
    ).toBe(true)
    expect(
      pendingVerificationMatchesFilters(
        target,
        filters({ search: 'osec.io' }),
        divisions
      )
    ).toBe(true)
    expect(
      pendingVerificationMatchesFilters(
        target,
        filters({ search: 'high school' }),
        divisions
      )
    ).toBe(false)
    expect(
      pendingVerificationMatchesFilters(
        verification({ division: 'hs' }),
        filters({ search: 'high school' }),
        divisions
      )
    ).toBe(true)
    expect(
      pendingVerificationMatchesFilters(
        target,
        filters({ search: 'unverified' }),
        divisions
      )
    ).toBe(true)
    expect(
      pendingVerificationMatchesFilters(
        target,
        filters({ search: 'nomatch' }),
        divisions
      )
    ).toBe(false)
  })
})

describe('serverStatusValues', () => {
  test('strips the unverified pseudo-status', () => {
    expect(
      serverStatusValues([
        AdminTeamStatus.ACTIVE,
        UNVERIFIED,
        AdminTeamStatus.BANNED,
      ])
    ).toEqual([AdminTeamStatus.ACTIVE, AdminTeamStatus.BANNED])
  })
})

describe('teamQueryParams', () => {
  test('carries sort, search, and include/exclude filters, stripping unverified', () => {
    const params = teamQueryParams(
      filters({
        status: statusFilter('include', [AdminTeamStatus.ACTIVE, UNVERIFIED]),
        division: divisionFilter('exclude', [
          { value: 'hs', label: 'High School' },
        ]),
      }),
      'otter',
      { by: AdminTeamSortBy.SCORE, order: SortOrder.DESC }
    )
    expect(params.search).toBe('otter')
    expect(params.sortBy).toBe(AdminTeamSortBy.SCORE)
    expect(params.sortOrder).toBe(SortOrder.DESC)
    expect(params.status).toEqual({ include: [AdminTeamStatus.ACTIVE] })
    expect(params.division).toEqual({ exclude: ['hs'] })
  })

  test('omits an all-unverified status filter from the server body', () => {
    const params = teamQueryParams(
      filters({ status: statusFilter('include', [UNVERIFIED]) }),
      '',
      { by: AdminTeamSortBy.CREATED_AT, order: SortOrder.DESC }
    )
    expect(params.status).toBeUndefined()
    expect(params.search).toBeUndefined()
  })
})

function rowKey(row: TeamRow): string {
  return row.kind === 'registered' ? row.team.id : row.verification.id
}
