import {
  type RouteBody,
  type SubmissionKind,
  type SubmissionResult,
  type SubmissionSortBy,
  type SubmissionSortOrder,
  type SubmissionTeamStatus,
} from '@rctf/types'
import type { FilterAdminSubmissionsRouteV2 } from '@rctf/types'
import type {
  CategoryFilterOption,
  ChallengeFilterOption,
  DivisionFilterOption,
  TeamFilterOption,
} from '../submissions-utils'
import {
  clearFilter,
  createFilter,
  createSearchFilter,
  filterFingerprint,
  type MultiFilter,
  type SearchFilter,
} from './core'
import {
  clearTimeRangeFilter,
  createTimeRangeFilter,
  hasTimeRangeFilter,
  resolveTimeRangeFilter,
  timeRangeFingerprint,
  type TimeRangeFilter,
} from './time'

export type ValueFilterMap = {
  challenge: SearchFilter<ChallengeFilterOption>
  team: SearchFilter<TeamFilterOption>
  kind: MultiFilter<SubmissionKind>
  result: MultiFilter<SubmissionResult>
  teamStatus: MultiFilter<SubmissionTeamStatus>
  category: MultiFilter<CategoryFilterOption>
  division: MultiFilter<DivisionFilterOption>
}

export type ValueFilterId = keyof ValueFilterMap

export type SubmissionFilters = ValueFilterMap & {
  time: TimeRangeFilter
}

type FilterBody = RouteBody<typeof FilterAdminSubmissionsRouteV2>
type FilterBodyKey = keyof Omit<FilterBody, 'createdAfter' | 'createdBefore'>

export type SubmissionQueryParams = {
  sortBy: SubmissionSortBy
  sortOrder: SubmissionSortOrder
} & FilterBody

type ValueFilterDefinition<Id extends ValueFilterId, T> = {
  id: Id
  create: () => ValueFilterMap[Id]
  has: (filters: SubmissionFilters) => boolean
  clear: (filters: SubmissionFilters) => void
  fingerprint: (filters: SubmissionFilters) => string
  addParams: (params: SubmissionQueryParams, filters: SubmissionFilters) => void
}

export const SUBMISSION_VALUE_FILTERS = [
  defineValueFilter(
    'challenge',
    'challenge',
    (challenge: ChallengeFilterOption) => challenge.id,
    () => createSearchFilter<ChallengeFilterOption>()
  ),
  defineValueFilter(
    'team',
    'team',
    (team: TeamFilterOption) => team.id,
    () => createSearchFilter<TeamFilterOption>()
  ),
  defineValueFilter(
    'kind',
    'kind',
    (kind: SubmissionKind) => kind,
    () => createFilter<SubmissionKind>()
  ),
  defineValueFilter(
    'result',
    'result',
    (result: SubmissionResult) => result,
    () => createFilter<SubmissionResult>()
  ),
  defineValueFilter(
    'teamStatus',
    'teamStatus',
    (status: SubmissionTeamStatus) => status,
    () => createFilter<SubmissionTeamStatus>()
  ),
  defineValueFilter(
    'category',
    'category',
    (category: CategoryFilterOption) => category.value,
    () => createFilter<CategoryFilterOption>()
  ),
  defineValueFilter(
    'division',
    'division',
    (division: DivisionFilterOption) => division.value,
    () => createFilter<DivisionFilterOption>()
  ),
] as const

export function createSubmissionFilters(): SubmissionFilters {
  const filters = Object.fromEntries(
    SUBMISSION_VALUE_FILTERS.map(definition => [
      definition.id,
      definition.create(),
    ])
  ) as ValueFilterMap

  return {
    ...filters,
    time: createTimeRangeFilter(),
  }
}

export function hasSubmissionFilters(filters: SubmissionFilters) {
  return (
    SUBMISSION_VALUE_FILTERS.some(definition => definition.has(filters)) ||
    hasTimeRangeFilter(filters.time)
  )
}

export function clearSubmissionFilters(filters: SubmissionFilters) {
  for (const definition of SUBMISSION_VALUE_FILTERS) {
    definition.clear(filters)
  }
  clearTimeRangeFilter(filters.time)
}

export function submissionFilterFingerprint(filters: SubmissionFilters) {
  return [
    ...SUBMISSION_VALUE_FILTERS.map(definition =>
      definition.fingerprint(filters)
    ),
    timeRangeFingerprint(filters.time),
  ].join(':')
}

export function submissionFilterParams(
  filters: SubmissionFilters,
  sortBy: SubmissionSortBy,
  sortOrder: SubmissionSortOrder,
  ctfStartTime?: number | null
): SubmissionQueryParams {
  const params: SubmissionQueryParams = {
    sortBy,
    sortOrder,
  }

  for (const definition of SUBMISSION_VALUE_FILTERS) {
    definition.addParams(params, filters)
  }
  addTimeRangeParams(params, filters.time, ctfStartTime)

  return params
}

function defineValueFilter<Id extends ValueFilterId, T>(
  id: Id,
  bodyKey: FilterBodyKey,
  valueFor: (option: T) => string,
  create: () => ValueFilterMap[Id]
): ValueFilterDefinition<Id, T> {
  const getFilter = (filters: SubmissionFilters) =>
    filters[id] as MultiFilter<T>

  return {
    id,
    create,
    has: filters => getFilter(filters).selected.length > 0,
    clear: filters => clearFilter(getFilter(filters)),
    fingerprint: filters => filterFingerprint(getFilter(filters), valueFor),
    addParams: (params, filters) =>
      addFilterParams(params, getFilter(filters), bodyKey, valueFor),
  }
}

function addFilterParams<T>(
  params: SubmissionQueryParams,
  filter: MultiFilter<T>,
  bodyKey: FilterBodyKey,
  valueFor: (option: T) => string
) {
  if (filter.selected.length === 0) return

  const values = filter.selected.map(valueFor)
  const entry =
    filter.mode === 'include' ? { include: values } : { exclude: values }
  ;(params as Record<string, unknown>)[bodyKey] = entry
}

function addTimeRangeParams(
  params: SubmissionQueryParams,
  filter: TimeRangeFilter,
  ctfStartTime?: number | null
) {
  const { createdAfter, createdBefore, error } = resolveTimeRangeFilter(
    filter,
    ctfStartTime
  )

  if (error) return

  if (createdAfter) params.createdAfter = createdAfter
  if (createdBefore) params.createdBefore = createdBefore
}
