import {
  AdminTeamSortBy,
  AdminTeamStatus,
  FilterAdminUsersRouteV2,
  GetAdminUserRouteV2,
  GetAdminUserVerificationsRouteV2,
  SortOrder,
  type RouteBody,
  type RouteQuery,
  type RouteResponseData,
} from '@rctf/types'

type AdminUsersQuery = RouteQuery<typeof FilterAdminUsersRouteV2>
type AdminUsersBody = RouteBody<typeof FilterAdminUsersRouteV2>
type AdminUsersFilterValue<TKey extends keyof AdminUsersBody> =
  NonNullable<AdminUsersBody[TKey]> extends {
    include?: (infer TValue)[] | null
  }
    ? TValue
    : never

export type PendingVerification = RouteResponseData<
  typeof GetAdminUserVerificationsRouteV2
>['verifications'][number]
export type AdminTeam = RouteResponseData<
  typeof FilterAdminUsersRouteV2
>['users'][number]
export type AdminTeamDetails = RouteResponseData<typeof GetAdminUserRouteV2>
export type AdminTeamSolve = AdminTeamDetails['solves'][number]
export type SortBy = NonNullable<AdminUsersQuery['sortBy']>
export type FilterMode = 'include' | 'exclude'
export type TeamStatusFilter =
  | AdminUsersFilterValue<'status'>
  | typeof UNVERIFIED_TEAM_STATUS
export type TeamDisplayStatus = TeamStatusFilter
export type MultiFilter<T> = {
  mode: FilterMode
  selected: T[]
}
export type DivisionFilterOption = {
  value: AdminUsersFilterValue<'division'>
  label: string
}
export type TeamFilters = {
  search: string
  status: MultiFilter<TeamStatusFilter>
  division: MultiFilter<DivisionFilterOption>
}
export type TeamQueryParams = Pick<
  AdminUsersQuery,
  'search' | 'sortBy' | 'sortOrder'
> &
  AdminUsersBody
export type RegisteredTeamRow = { kind: 'registered'; team: AdminTeam }
export type PendingTeamRow = {
  kind: 'pending'
  verification: PendingVerification
}
export type TeamRow = RegisteredTeamRow | PendingTeamRow

export const PAGE_SIZE = 100
export const ROW_HEIGHT = 48
export const UNVERIFIED_TEAM_STATUS = 'unverified' as const
export const TEAM_STATUS_FILTERS = [
  AdminTeamStatus.ACTIVE,
  AdminTeamStatus.BANNED,
  AdminTeamStatus.ADMIN,
  UNVERIFIED_TEAM_STATUS,
] as const

export function createFilter<T>(): MultiFilter<T> {
  return {
    mode: 'include',
    selected: [],
  }
}

export function createTeamFilters(): TeamFilters {
  return {
    search: '',
    status: createFilter<TeamStatusFilter>(),
    division: createFilter<DivisionFilterOption>(),
  }
}

export function hasTeamFilters(filters: TeamFilters) {
  return (
    filters.search.trim().length > 0 ||
    filters.status.selected.length > 0 ||
    filters.division.selected.length > 0
  )
}

export function clearFilter<T>(filter: MultiFilter<T>) {
  filter.mode = 'include'
  filter.selected = []
}

export function clearTeamFilters(filters: TeamFilters) {
  filters.search = ''
  clearFilter(filters.status)
  clearFilter(filters.division)
}

export function setFilterMode<T>(filter: MultiFilter<T>, mode: FilterMode) {
  filter.mode = mode
}

export function toggleFilterOption<T>(
  filter: MultiFilter<T>,
  option: T,
  keyFor: (option: T) => string
) {
  const key = keyFor(option)
  filter.selected = filter.selected.some(current => keyFor(current) === key)
    ? filter.selected.filter(current => keyFor(current) !== key)
    : [...filter.selected, option]
}

export function filterOperatorLabel(mode: FilterMode, count: number) {
  if (mode === 'exclude') return 'is not'
  return count > 1 ? 'is any of' : 'is'
}

function filterFingerprint<T>(
  filter: MultiFilter<T>,
  keyFor: (option: T) => string
) {
  return `${filter.mode}:${filter.selected.map(keyFor).sort().join(',')}`
}

export function teamFilterFingerprint(filters: TeamFilters) {
  return [
    filters.search.trim(),
    filterFingerprint(filters.status, status => status),
    filterFingerprint(filters.division, division => division.value),
  ].join(':')
}

function isRegisteredStatus(
  status: TeamStatusFilter
): status is AdminUsersFilterValue<'status'> {
  return status !== UNVERIFIED_TEAM_STATUS
}

function selectedRegisteredStatuses(
  statusFilter: MultiFilter<TeamStatusFilter>
) {
  return statusFilter.selected.filter(isRegisteredStatus)
}

export function registeredRowsMayMatch(
  statusFilter: MultiFilter<TeamStatusFilter>
) {
  if (statusFilter.selected.length === 0) return true

  const registeredStatuses = selectedRegisteredStatuses(statusFilter)
  if (statusFilter.mode === 'include') return registeredStatuses.length > 0

  const excludedStatuses = new Set(registeredStatuses)
  return Object.values(AdminTeamStatus).some(
    status => !excludedStatuses.has(status)
  )
}

type RouteSearchFilter<TValue extends string> =
  | { include: TValue[]; exclude?: never }
  | { include?: never; exclude: TValue[] }

function routeSearchFilter<TOption, TValue extends string>(
  filter: MultiFilter<TOption>,
  keyFor: (option: TOption) => TValue
): RouteSearchFilter<TValue> | undefined {
  if (filter.selected.length === 0) return undefined

  const value = filter.selected.map(keyFor)
  if (filter.mode === 'exclude') {
    return { exclude: value }
  }
  return { include: value }
}

export function teamFilterParams(
  filters: TeamFilters,
  sortBy: SortBy,
  sortOrder: SortOrder
): TeamQueryParams {
  const params: TeamQueryParams = { sortBy, sortOrder }
  const search = filters.search.trim()
  const registeredStatuses = selectedRegisteredStatuses(filters.status)
  const status = routeSearchFilter(
    { mode: filters.status.mode, selected: registeredStatuses },
    status => status
  )
  const division = routeSearchFilter(
    filters.division,
    division => division.value
  )

  if (search) params.search = search
  if (status) params.status = status
  if (division) params.division = division

  return params
}

export function defaultSortOrder(sortBy: SortBy): SortOrder {
  switch (sortBy) {
    case AdminTeamSortBy.SCORE:
    case AdminTeamSortBy.SOLVES:
      return SortOrder.DESC
    default:
      return SortOrder.ASC
  }
}

export function teamStatus(team: Pick<AdminTeam, 'banned' | 'perms'>) {
  if (team.perms > 0) return AdminTeamStatus.ADMIN
  if (team.banned) return AdminTeamStatus.BANNED
  return AdminTeamStatus.ACTIVE
}

export function teamStatusLabel(status: TeamDisplayStatus | string) {
  switch (status) {
    case AdminTeamStatus.ACTIVE:
      return 'Active'
    case AdminTeamStatus.BANNED:
      return 'Banned'
    case AdminTeamStatus.ADMIN:
      return 'Admin'
    case UNVERIFIED_TEAM_STATUS:
      return 'Unverified'
    default:
      return status
  }
}

export function statusTone(status: TeamDisplayStatus) {
  switch (status) {
    case AdminTeamStatus.ACTIVE:
      return 'success'
    case AdminTeamStatus.ADMIN:
      return 'accent'
    case AdminTeamStatus.BANNED:
      return 'danger'
    case UNVERIFIED_TEAM_STATUS:
      return 'warning'
  }
}

export function pendingVerificationMatchesFilters(
  verification: PendingVerification,
  filters: TeamFilters,
  divisions: Record<string, string> | undefined
) {
  if (filters.status.selected.length > 0) {
    const selected = filters.status.selected.includes(UNVERIFIED_TEAM_STATUS)
    if (filters.status.mode === 'include' ? !selected : selected) return false
  }

  if (filters.division.selected.length > 0) {
    const selected = filters.division.selected.some(
      division => division.value === verification.division
    )
    if (filters.division.mode === 'include' ? !selected : selected) return false
  }

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
  ]
    .filter(Boolean)
    .some(value => value.toLowerCase().includes(search))
}

export function teamRowName(row: TeamRow) {
  return row.kind === 'registered' ? row.team.name : row.verification.name
}

export function teamRowEmail(row: TeamRow) {
  return row.kind === 'registered' ? row.team.email : row.verification.email
}

export function teamRowDivision(row: TeamRow) {
  return row.kind === 'registered'
    ? row.team.division
    : row.verification.division
}

export function teamRowStatus(row: TeamRow): TeamDisplayStatus {
  return row.kind === 'registered'
    ? teamStatus(row.team)
    : UNVERIFIED_TEAM_STATUS
}

export function teamRowCreatedAt(row: TeamRow) {
  return row.kind === 'registered'
    ? new Date(row.team.createdAt).getTime()
    : row.verification.createdAt
}

export function rowTime(row: TeamRow) {
  return row.kind === 'registered'
    ? new Date(row.team.createdAt).getTime()
    : row.verification.expiresAt
}

export function sortTeamRows(
  rows: TeamRow[],
  sortBy: SortBy,
  sortOrder: SortOrder
) {
  const direction = sortOrder === SortOrder.ASC ? 1 : -1

  return [...rows].sort((a, b) => {
    const result = compareTeamRows(a, b, sortBy)
    if (result !== 0) return result * direction
    return teamRowName(a).localeCompare(teamRowName(b))
  })
}

function compareTeamRows(a: TeamRow, b: TeamRow, sortBy: SortBy) {
  switch (sortBy) {
    case AdminTeamSortBy.TEAM:
      return teamRowName(a).localeCompare(teamRowName(b))
    case AdminTeamSortBy.EMAIL:
      return (teamRowEmail(a) ?? '').localeCompare(teamRowEmail(b) ?? '')
    case AdminTeamSortBy.DIVISION:
      return teamRowDivision(a).localeCompare(teamRowDivision(b))
    case AdminTeamSortBy.STATUS:
      return teamStatusLabel(teamRowStatus(a)).localeCompare(
        teamStatusLabel(teamRowStatus(b))
      )
    case AdminTeamSortBy.SCORE:
      return rowScore(a) - rowScore(b)
    case AdminTeamSortBy.SOLVES:
      return rowSolves(a) - rowSolves(b)
    case AdminTeamSortBy.CREATED_AT:
      return teamRowCreatedAt(a) - teamRowCreatedAt(b)
  }
}

function rowScore(row: TeamRow) {
  return row.kind === 'registered' ? row.team.score : -1
}

function rowSolves(row: TeamRow) {
  return row.kind === 'registered' ? row.team.solveCount : -1
}

export function selectedCountLabel(label: string, count: number) {
  return `${count} ${label}${count === 1 ? '' : label.endsWith('s') ? 'es' : 's'}`
}
