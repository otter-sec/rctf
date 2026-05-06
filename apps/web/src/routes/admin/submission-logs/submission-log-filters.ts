import {
  type SubmissionLogKind,
  type SubmissionLogResult,
  type SubmissionLogSortBy,
  type SubmissionLogSortOrder,
} from '@rctf/types'
import type { ChallengeFilterOption, TeamFilterOption } from './submission-log-utils'

export type FilterMode = 'include' | 'exclude'

export type MultiFilter<T> = {
  mode: FilterMode
  selected: T[]
}

export type SearchFilter<T> = MultiFilter<T> & {
  search: string
}

export type SubmissionLogFilters = {
  challenge: SearchFilter<ChallengeFilterOption>
  team: SearchFilter<TeamFilterOption>
  kind: MultiFilter<SubmissionLogKind>
  result: MultiFilter<SubmissionLogResult>
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
}

type FilterParamKey = Exclude<keyof SubmissionLogQueryParams, 'sortBy' | 'sortOrder'>

export function createSubmissionLogFilters(): SubmissionLogFilters {
  return {
    challenge: createSearchFilter(),
    team: createSearchFilter(),
    kind: createFilter(),
    result: createFilter(),
  }
}

export function hasSubmissionLogFilters(filters: SubmissionLogFilters) {
  return (
    filters.challenge.selected.length > 0 ||
    filters.team.selected.length > 0 ||
    filters.kind.selected.length > 0 ||
    filters.result.selected.length > 0
  )
}

export function clearSubmissionLogFilters(filters: SubmissionLogFilters) {
  clearSearchFilter(filters.challenge)
  clearSearchFilter(filters.team)
  clearFilter(filters.kind)
  clearFilter(filters.result)
}

export function submissionLogFilterFingerprint(filters: SubmissionLogFilters) {
  return [
    filterFingerprint(filters.challenge, challenge => challenge.id),
    filterFingerprint(filters.team, team => team.id),
    filterFingerprint(filters.kind, kind => kind),
    filterFingerprint(filters.result, result => result),
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

  addFilterParams(
    params,
    filters.challenge,
    'challengeIds',
    'excludeChallengeIds',
    challenge => challenge.id
  )
  addFilterParams(params, filters.team, 'userIds', 'excludeUserIds', team => team.id)
  addFilterParams(params, filters.kind, 'kinds', 'excludeKinds', kind => kind)
  addFilterParams(params, filters.result, 'results', 'excludeResults', result => result)

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

function filterFingerprint<T>(
  filter: MultiFilter<T>,
  valueFor: (option: T) => string
) {
  return `${filter.mode}:${filter.selected.map(valueFor).join(',')}`
}

function addFilterParams<T>(
  params: SubmissionLogQueryParams,
  filter: MultiFilter<T>,
  includeKey: FilterParamKey,
  excludeKey: FilterParamKey,
  valueFor: (option: T) => string
) {
  if (filter.selected.length === 0) return

  params[filter.mode === 'include' ? includeKey : excludeKey] =
    filter.selected.map(valueFor).join(',')
}
