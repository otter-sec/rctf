import {
  type SubmissionKind,
  type SubmissionResult,
  type SubmissionSortBy,
  type SubmissionSortOrder,
  type SubmissionTeamStatus,
} from '@rctf/types'
import {
  clearFilter,
  createFilter,
  createSearchFilter,
  filterFingerprint,
  type MultiFilter,
  type SearchFilter,
} from './submissions-filter-core'
import {
  clearTimeRangeFilter,
  createTimeRangeFilter,
  hasTimeRangeFilter,
  resolveTimeRangeFilter,
  timeRangeFingerprint,
  type TimeRangeFilter,
} from './submissions-time-filter'
import type {
  CategoryFilterOption,
  ChallengeFilterOption,
  DivisionFilterOption,
  TeamFilterOption,
} from './submissions-utils'

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

export type SubmissionQueryParams = {
  sortBy: SubmissionSortBy
  sortOrder: SubmissionSortOrder
  challengeIds?: string
  excludeChallengeIds?: string
  userIds?: string
  excludeUserIds?: string
  kinds?: string
  excludeKinds?: string
  results?: string
  excludeResults?: string
  teamStatuses?: string
  excludeTeamStatuses?: string
  categories?: string
  excludeCategories?: string
  divisions?: string
  excludeDivisions?: string
  createdAfter?: string
  createdBefore?: string
}

type FilterParamKey = Exclude<
  keyof SubmissionQueryParams,
  'sortBy' | 'sortOrder'
>

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
    'challengeIds',
    'excludeChallengeIds',
    (challenge: ChallengeFilterOption) => challenge.id,
    () => createSearchFilter<ChallengeFilterOption>()
  ),
  defineValueFilter(
    'team',
    'userIds',
    'excludeUserIds',
    (team: TeamFilterOption) => team.id,
    () => createSearchFilter<TeamFilterOption>()
  ),
  defineValueFilter(
    'kind',
    'kinds',
    'excludeKinds',
    (kind: SubmissionKind) => kind,
    () => createFilter<SubmissionKind>()
  ),
  defineValueFilter(
    'result',
    'results',
    'excludeResults',
    (result: SubmissionResult) => result,
    () => createFilter<SubmissionResult>()
  ),
  defineValueFilter(
    'teamStatus',
    'teamStatuses',
    'excludeTeamStatuses',
    (status: SubmissionTeamStatus) => status,
    () => createFilter<SubmissionTeamStatus>()
  ),
  defineValueFilter(
    'category',
    'categories',
    'excludeCategories',
    (category: CategoryFilterOption) => category.value,
    () => createFilter<CategoryFilterOption>()
  ),
  defineValueFilter(
    'division',
    'divisions',
    'excludeDivisions',
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
  includeKey: FilterParamKey,
  excludeKey: FilterParamKey,
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
      addFilterParams(
        params,
        getFilter(filters),
        includeKey,
        excludeKey,
        valueFor
      ),
  }
}

function addFilterParams<T>(
  params: SubmissionQueryParams,
  filter: MultiFilter<T>,
  includeKey: FilterParamKey,
  excludeKey: FilterParamKey,
  valueFor: (option: T) => string
) {
  if (filter.selected.length === 0) return

  params[filter.mode === 'include' ? includeKey : excludeKey] = filter.selected
    .map(valueFor)
    .join(',')
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
