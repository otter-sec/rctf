/**
 * Pure helpers for the admin teams table. The row model merges two heterogeneous
 * sources — server-paged registered teams and a separately-fetched pending
 * email-verification queue — into one client-sorted, client-filtered list. The
 * `unverified` status is a client-side pseudo-status: it never reaches the server
 * body (see {@link serverStatusValues}) and can short-circuit the registered
 * query entirely (see {@link registeredRowsMayMatch}).
 */
import {
  AdminTeamSortBy,
  AdminTeamStatus,
  SortOrder,
  type FilterAdminUsersRouteV2,
  type GetAdminUserVerificationsRouteV2,
  type RouteResponseData,
} from '@rctf/types'
import { filterFingerprint, type MultiFilter } from '$lib/filters/core'
import { addFilterParams } from '$lib/filters/query'
import type { AdminUsersQueryParams } from '$lib/query/keys'
import type {
  SortState,
  SortOrder as TableSortOrder,
} from '../admin-table-logic'

export type AdminTeam = RouteResponseData<
  typeof FilterAdminUsersRouteV2
>['users'][number]
export type PendingVerification = RouteResponseData<
  typeof GetAdminUserVerificationsRouteV2
>['verifications'][number]

export type RegisteredTeamRow = { kind: 'registered'; team: AdminTeam }
export type PendingTeamRow = {
  kind: 'pending'
  verification: PendingVerification
}
export type TeamRow = RegisteredTeamRow | PendingTeamRow

/** Client-side pseudo-status gating the pending-verification data source. */
export const UNVERIFIED = 'unverified' as const

export type TeamStatusValue = AdminTeamStatus | typeof UNVERIFIED

export type DivisionOption = { value: string; label: string }

export type TeamFilters = {
  status: MultiFilter<TeamStatusValue>
  division: MultiFilter<DivisionOption>
  search: string
}

export type StatusTone = 'success' | 'danger' | 'accent' | 'warning'

export const PAGE_SIZE = 100
export const ROW_HEIGHT = 48

export const TEAM_STATUS_VALUES: readonly TeamStatusValue[] = [
  AdminTeamStatus.ACTIVE,
  AdminTeamStatus.BANNED,
  AdminTeamStatus.ADMIN,
  UNVERIFIED,
]

/** Registered-team status by precedence: admin over banned over active. */
export function deriveTeamStatus(
  team: Pick<AdminTeam, 'perms' | 'banned'>
): AdminTeamStatus {
  if (team.perms > 0) return AdminTeamStatus.ADMIN
  if (team.banned) return AdminTeamStatus.BANNED
  return AdminTeamStatus.ACTIVE
}

export function teamRowStatus(row: TeamRow): TeamStatusValue {
  return row.kind === 'registered' ? deriveTeamStatus(row.team) : UNVERIFIED
}

export function statusLabel(status: TeamStatusValue): string {
  switch (status) {
    case AdminTeamStatus.ACTIVE:
      return 'Active'
    case AdminTeamStatus.BANNED:
      return 'Banned'
    case AdminTeamStatus.ADMIN:
      return 'Admin'
    case UNVERIFIED:
      return 'Unverified'
  }
}

export function statusTone(status: TeamStatusValue): StatusTone {
  switch (status) {
    case AdminTeamStatus.ACTIVE:
      return 'success'
    case AdminTeamStatus.BANNED:
      return 'danger'
    case AdminTeamStatus.ADMIN:
      return 'accent'
    case UNVERIFIED:
      return 'warning'
  }
}

export function teamRowName(row: TeamRow): string {
  return row.kind === 'registered' ? row.team.name : row.verification.name
}

export function teamRowEmail(row: TeamRow): string | null {
  return row.kind === 'registered' ? row.team.email : row.verification.email
}

export function teamRowDivision(row: TeamRow): string {
  return row.kind === 'registered'
    ? row.team.division
    : row.verification.division
}

export function teamRowCreatedAt(row: TeamRow): number {
  return row.kind === 'registered'
    ? new Date(row.team.createdAt).getTime()
    : row.verification.createdAt
}

/** Registered rows show their creation time; pending rows show expiry. */
export function rowDisplayTime(row: TeamRow): number {
  return row.kind === 'registered'
    ? new Date(row.team.createdAt).getTime()
    : row.verification.expiresAt
}

function rowScore(row: TeamRow): number {
  return row.kind === 'registered' ? row.team.score : -1
}

function rowSolves(row: TeamRow): number {
  return row.kind === 'registered' ? row.team.solveCount : -1
}

function compareRows(a: TeamRow, b: TeamRow, sortBy: AdminTeamSortBy): number {
  switch (sortBy) {
    case AdminTeamSortBy.TEAM:
      return teamRowName(a).localeCompare(teamRowName(b))
    case AdminTeamSortBy.EMAIL:
      return (teamRowEmail(a) ?? '').localeCompare(teamRowEmail(b) ?? '')
    case AdminTeamSortBy.DIVISION:
      return teamRowDivision(a).localeCompare(teamRowDivision(b))
    case AdminTeamSortBy.STATUS:
      return statusLabel(teamRowStatus(a)).localeCompare(
        statusLabel(teamRowStatus(b))
      )
    case AdminTeamSortBy.SCORE:
      return rowScore(a) - rowScore(b)
    case AdminTeamSortBy.SOLVES:
      return rowSolves(a) - rowSolves(b)
    case AdminTeamSortBy.CREATED_AT:
      return teamRowCreatedAt(a) - teamRowCreatedAt(b)
  }
}

/**
 * Sorts the merged rows by the active column. Pending rows carry a score/solve
 * count of -1 so they trail on those numeric sorts, and the name tiebreak stays
 * ascending regardless of direction so equal rows keep a stable readable order.
 */
export function sortTeamRows(
  rows: readonly TeamRow[],
  sortBy: AdminTeamSortBy,
  order: TableSortOrder
): TeamRow[] {
  const direction = order === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const result = compareRows(a, b, sortBy)
    if (result !== 0) return result * direction
    return teamRowName(a).localeCompare(teamRowName(b))
  })
}

function registeredStatuses(
  filter: MultiFilter<TeamStatusValue>
): AdminTeamStatus[] {
  return filter.selected.filter(
    (value): value is AdminTeamStatus => value !== UNVERIFIED
  )
}

/**
 * Whether the registered-team query can return any row under the status filter.
 * An include-list of only `unverified` matches no registered status, so the
 * server round-trip is skipped; an exclude-list matches unless it names every
 * registered status.
 */
export function registeredRowsMayMatch(
  filter: MultiFilter<TeamStatusValue>
): boolean {
  if (filter.selected.length === 0) return true

  const statuses = registeredStatuses(filter)
  if (filter.mode === 'include') return statuses.length > 0

  const excluded = new Set(statuses)
  return Object.values(AdminTeamStatus).some(status => !excluded.has(status))
}

/** Drops the `unverified` pseudo-status before a status filter reaches the server. */
export function serverStatusValues(values: string[]): string[] {
  return values.filter(value => value !== UNVERIFIED)
}

function matchesStatus(
  filter: MultiFilter<TeamStatusValue>,
  isUnverifiedRow: boolean
): boolean {
  if (filter.selected.length === 0) return true
  const selected = filter.selected.includes(UNVERIFIED)
  const included = isUnverifiedRow ? selected : !selected
  return filter.mode === 'include' ? included : !included
}

function matchesDivision(
  filter: MultiFilter<DivisionOption>,
  division: string
): boolean {
  if (filter.selected.length === 0) return true
  const selected = filter.selected.some(option => option.value === division)
  return filter.mode === 'include' ? selected : !selected
}

/**
 * Client-side predicate for the locally-sourced pending rows, mirroring the
 * server's registered-team filtering: status (unverified in/out), division, and
 * the free-text search over name, email, division id/label, and "unverified".
 */
export function pendingVerificationMatchesFilters(
  verification: PendingVerification,
  filters: TeamFilters,
  divisions: Record<string, string> | undefined
): boolean {
  if (!matchesStatus(filters.status, true)) return false
  if (!matchesDivision(filters.division, verification.division)) return false

  const search = filters.search.trim().toLowerCase()
  if (!search) return true

  const divisionLabel =
    divisions?.[verification.division] ?? verification.division
  return [
    verification.name,
    verification.email,
    verification.division,
    divisionLabel,
    'unverified',
  ].some(value => value.toLowerCase().includes(search))
}

export const SORT_DEFAULTS: Record<AdminTeamSortBy, TableSortOrder> = {
  [AdminTeamSortBy.TEAM]: 'asc',
  [AdminTeamSortBy.STATUS]: 'asc',
  [AdminTeamSortBy.DIVISION]: 'asc',
  [AdminTeamSortBy.EMAIL]: 'asc',
  [AdminTeamSortBy.SCORE]: 'desc',
  [AdminTeamSortBy.SOLVES]: 'desc',
  [AdminTeamSortBy.CREATED_AT]: 'desc',
}

export function defaultSortOrder(sortBy: AdminTeamSortBy): TableSortOrder {
  return SORT_DEFAULTS[sortBy]
}

/** Builds the registered-team query params (server does search/sort/filter/page). */
export function teamQueryParams(
  filters: TeamFilters,
  search: string,
  sort: SortState<AdminTeamSortBy>
): AdminUsersQueryParams {
  const params: AdminUsersQueryParams = {
    limit: PAGE_SIZE,
    sortBy: sort.by,
    sortOrder: sort.order as SortOrder,
  }
  const trimmed = search.trim()
  if (trimmed) params.search = trimmed

  addFilterParams(
    params as Record<string, unknown>,
    'status',
    filters.status,
    value => value,
    serverStatusValues
  )
  addFilterParams(
    params as Record<string, unknown>,
    'division',
    filters.division,
    option => option.value
  )

  return params
}

/**
 * Query fingerprint driving the shared table shell's scroll reset. Folds the
 * sort, both filter families, and the debounced search into one string.
 */
export function teamFingerprint(
  sort: SortState<AdminTeamSortBy>,
  filters: TeamFilters,
  search: string
): string {
  return [
    sort.by,
    sort.order,
    filterFingerprint(filters.status, value => value),
    filterFingerprint(filters.division, option => option.value),
    search.trim(),
  ].join(':')
}
