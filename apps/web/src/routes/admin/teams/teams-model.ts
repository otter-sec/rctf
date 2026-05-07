import {
  AdminTeamSortBy,
  AdminTeamSortOrder,
  AdminTeamStatus,
} from '@rctf/types'

export type PendingVerification = {
  id: string
  name: string
  email: string
  division: string
  createdAt: number
  expiresAt: number
}

export type AdminTeam = {
  id: string
  name: string
  email: string | null
  division: string
  perms: number
  banned: boolean
  score: number
  solveCount: number
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  createdAt: string
}

export type AdminTeamSolve = {
  challengeId: string
  challengeName: string
  challengeCategory: string
  createdAt: string
}

export type AdminTeamDetails = AdminTeam & {
  solves: AdminTeamSolve[]
}

export type SortBy = AdminTeamSortBy
export type SortOrder = AdminTeamSortOrder
export type FilterMode = 'include' | 'exclude'
export type TeamStatusFilter = AdminTeamStatus | typeof UNVERIFIED_TEAM_STATUS
export type TeamDisplayStatus = TeamStatusFilter
export type MultiFilter<T> = {
  mode: FilterMode
  selected: T[]
}
export type DivisionFilterOption = {
  value: string
  label: string
}
export type TeamFilters = {
  search: string
  status: MultiFilter<TeamStatusFilter>
  division: MultiFilter<DivisionFilterOption>
}
export type TeamQueryParams = {
  search?: string
  sortBy: AdminTeamSortBy
  sortOrder: AdminTeamSortOrder
  statuses?: string
  excludeStatuses?: string
  divisions?: string
  excludeDivisions?: string
}
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
): status is AdminTeamStatus {
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

function addQueryFilter<T>(
  params: TeamQueryParams,
  filter: MultiFilter<T>,
  includeKey: 'statuses' | 'divisions',
  excludeKey: 'excludeStatuses' | 'excludeDivisions',
  keyFor: (option: T) => string
) {
  if (filter.selected.length === 0) return

  const value = filter.selected.map(keyFor).join(',')
  if (filter.mode === 'exclude') {
    params[excludeKey] = value
  } else {
    params[includeKey] = value
  }
}

export function teamFilterParams(
  filters: TeamFilters,
  sortBy: AdminTeamSortBy,
  sortOrder: AdminTeamSortOrder
): TeamQueryParams {
  const params: TeamQueryParams = { sortBy, sortOrder }
  const search = filters.search.trim()
  const registeredStatuses = selectedRegisteredStatuses(filters.status)

  if (search) params.search = search
  addQueryFilter(
    params,
    { mode: filters.status.mode, selected: registeredStatuses },
    'statuses',
    'excludeStatuses',
    status => status
  )
  addQueryFilter(
    params,
    filters.division,
    'divisions',
    'excludeDivisions',
    division => division.value
  )

  return params
}

export function defaultSortOrder(sortBy: SortBy): SortOrder {
  switch (sortBy) {
    case AdminTeamSortBy.SCORE:
    case AdminTeamSortBy.SOLVES:
    case AdminTeamSortBy.CREATED_AT:
      return AdminTeamSortOrder.DESC
    default:
      return AdminTeamSortOrder.ASC
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
  const direction = sortOrder === AdminTeamSortOrder.ASC ? 1 : -1

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
