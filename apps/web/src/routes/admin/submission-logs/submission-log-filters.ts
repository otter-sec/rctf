import {
  type SubmissionLogKind,
  type SubmissionLogResult,
  type SubmissionLogSortBy,
  type SubmissionLogSortOrder,
  type SubmissionLogTeamStatus,
} from '@rctf/types'
import type {
  CategoryFilterOption,
  ChallengeFilterOption,
  DivisionFilterOption,
  TeamFilterOption,
} from './submission-log-utils'

export type FilterMode = 'include' | 'exclude'

export type MultiFilter<T> = {
  mode: FilterMode
  selected: T[]
}

export type SearchFilter<T> = MultiFilter<T> & {
  search: string
}

export type TimeRangeFilter = {
  start: string
  end: string
}

export type ValueFilterMap = {
  challenge: SearchFilter<ChallengeFilterOption>
  team: SearchFilter<TeamFilterOption>
  kind: MultiFilter<SubmissionLogKind>
  result: MultiFilter<SubmissionLogResult>
  teamStatus: MultiFilter<SubmissionLogTeamStatus>
  category: MultiFilter<CategoryFilterOption>
  division: MultiFilter<DivisionFilterOption>
}

export type ValueFilterId = keyof ValueFilterMap

export type SubmissionLogFilters = ValueFilterMap & {
  time: TimeRangeFilter
}

export type SubmissionLogQueryParams = {
  sortBy: SubmissionLogSortBy
  sortOrder: SubmissionLogSortOrder
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
  keyof SubmissionLogQueryParams,
  'sortBy' | 'sortOrder'
>

type ValueFilterDefinition<Id extends ValueFilterId, T> = {
  id: Id
  create: () => ValueFilterMap[Id]
  has: (filters: SubmissionLogFilters) => boolean
  clear: (filters: SubmissionLogFilters) => void
  fingerprint: (filters: SubmissionLogFilters) => string
  addParams: (
    params: SubmissionLogQueryParams,
    filters: SubmissionLogFilters
  ) => void
}

export const SUBMISSION_LOG_VALUE_FILTERS = [
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
    (kind: SubmissionLogKind) => kind,
    () => createFilter<SubmissionLogKind>()
  ),
  defineValueFilter(
    'result',
    'results',
    'excludeResults',
    (result: SubmissionLogResult) => result,
    () => createFilter<SubmissionLogResult>()
  ),
  defineValueFilter(
    'teamStatus',
    'teamStatuses',
    'excludeTeamStatuses',
    (status: SubmissionLogTeamStatus) => status,
    () => createFilter<SubmissionLogTeamStatus>()
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

export function createSubmissionLogFilters(): SubmissionLogFilters {
  const filters = Object.fromEntries(
    SUBMISSION_LOG_VALUE_FILTERS.map(definition => [
      definition.id,
      definition.create(),
    ])
  ) as ValueFilterMap

  return {
    ...filters,
    time: createTimeRangeFilter(),
  }
}

export function hasSubmissionLogFilters(filters: SubmissionLogFilters) {
  return (
    SUBMISSION_LOG_VALUE_FILTERS.some(definition => definition.has(filters)) ||
    hasTimeRangeFilter(filters.time)
  )
}

export function clearSubmissionLogFilters(filters: SubmissionLogFilters) {
  for (const definition of SUBMISSION_LOG_VALUE_FILTERS) {
    definition.clear(filters)
  }
  clearTimeRangeFilter(filters.time)
}

export function submissionLogFilterFingerprint(filters: SubmissionLogFilters) {
  return [
    ...SUBMISSION_LOG_VALUE_FILTERS.map(definition =>
      definition.fingerprint(filters)
    ),
    timeRangeFingerprint(filters.time),
  ].join(':')
}

export function submissionLogFilterParams(
  filters: SubmissionLogFilters,
  sortBy: SubmissionLogSortBy,
  sortOrder: SubmissionLogSortOrder
): SubmissionLogQueryParams {
  const params: SubmissionLogQueryParams = {
    sortBy,
    sortOrder,
  }

  for (const definition of SUBMISSION_LOG_VALUE_FILTERS) {
    definition.addParams(params, filters)
  }
  addTimeRangeParams(params, filters.time)

  return params
}

export function setFilterMode<T>(filter: MultiFilter<T>, mode: FilterMode) {
  filter.mode = mode
}

export function clearFilter<T>(filter: MultiFilter<T>) {
  filter.mode = 'include'
  filter.selected = []
}

export function clearSearchFilter<T>(filter: SearchFilter<T>) {
  clearFilter(filter)
  filter.search = ''
}

export function clearTimeRangeFilter(filter: TimeRangeFilter) {
  filter.start = ''
  filter.end = ''
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
  return includeOperatorLabel(count)
}

export function includeOperatorLabel(count: number) {
  return count > 1 ? 'is any of' : 'is'
}

export function hasTimeRangeFilter(filter: TimeRangeFilter) {
  return filter.start.trim() !== '' || filter.end.trim() !== ''
}

function defineValueFilter<Id extends ValueFilterId, T>(
  id: Id,
  includeKey: FilterParamKey,
  excludeKey: FilterParamKey,
  valueFor: (option: T) => string,
  create: () => ValueFilterMap[Id]
): ValueFilterDefinition<Id, T> {
  const getFilter = (filters: SubmissionLogFilters) =>
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

function createFilter<T>(): MultiFilter<T> {
  return {
    mode: 'include',
    selected: [],
  }
}

function createSearchFilter<T>(): SearchFilter<T> {
  return {
    ...createFilter<T>(),
    search: '',
  }
}

function createTimeRangeFilter(): TimeRangeFilter {
  return {
    start: '',
    end: '',
  }
}

function filterFingerprint<T>(
  filter: MultiFilter<T>,
  valueFor: (option: T) => string
) {
  return `${filter.mode}:${filter.selected.map(valueFor).join(',')}`
}

function timeRangeFingerprint(filter: TimeRangeFilter) {
  return `${filter.start.trim()}:${filter.end.trim()}`
}

function addFilterParams<T>(
  params: SubmissionLogQueryParams,
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
  params: SubmissionLogQueryParams,
  filter: TimeRangeFilter
) {
  const createdAfter = localDateTimeToIso(filter.start)
  const createdBefore = localDateTimeToIso(filter.end)

  if (createdAfter) params.createdAfter = createdAfter
  if (createdBefore) params.createdBefore = createdBefore
}

function localDateTimeToIso(value: string) {
  if (!value.trim()) return undefined

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}
