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

export type TimeRangeMode = 'absolute' | 'relative'

export type TimeRangeFilter = {
  mode: TimeRangeMode
  start: string
  end: string
  relativeStart: string
  relativeEnd: string
}

export type TimeRangeResolution = {
  createdAfter?: string
  createdBefore?: string
  error?: string
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
  sortOrder: SubmissionLogSortOrder,
  ctfStartTime?: number | null
): SubmissionLogQueryParams {
  const params: SubmissionLogQueryParams = {
    sortBy,
    sortOrder,
  }

  for (const definition of SUBMISSION_LOG_VALUE_FILTERS) {
    definition.addParams(params, filters)
  }
  addTimeRangeParams(params, filters.time, ctfStartTime)

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
  filter.mode = 'absolute'
  filter.start = ''
  filter.end = ''
  filter.relativeStart = ''
  filter.relativeEnd = ''
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
  return activeTimeRangeValues(filter).some(value => value.trim() !== '')
}

export function resolveTimeRangeFilter(
  filter: TimeRangeFilter,
  ctfStartTime?: number | null
): TimeRangeResolution {
  const [fromValue, toValue] = activeTimeRangeValues(filter)

  if (!fromValue.trim() && !toValue.trim()) return {}
  if (
    filter.mode === 'relative' &&
    (ctfStartTime === null || ctfStartTime === undefined)
  ) {
    return { error: 'CTF start time is unavailable.' }
  }

  const createdAfter =
    filter.mode === 'relative'
      ? relativeOffsetToIso(fromValue, ctfStartTime)
      : localDateTimeToIso(fromValue)
  const createdBefore =
    filter.mode === 'relative'
      ? relativeOffsetToIso(toValue, ctfStartTime)
      : localDateTimeToIso(toValue)

  if (fromValue.trim() && !createdAfter) {
    return {
      error:
        filter.mode === 'relative'
          ? 'Enter a valid relative start time.'
          : 'Enter a valid start time.',
    }
  }
  if (toValue.trim() && !createdBefore) {
    return {
      error:
        filter.mode === 'relative'
          ? 'Enter a valid relative end time.'
          : 'Enter a valid end time.',
    }
  }
  if (createdAfter && createdBefore && createdAfter > createdBefore) {
    return { error: 'Start must happen before end.' }
  }

  return {
    createdAfter,
    createdBefore,
  }
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
    mode: 'absolute',
    start: '',
    end: '',
    relativeStart: '',
    relativeEnd: '',
  }
}

function filterFingerprint<T>(
  filter: MultiFilter<T>,
  valueFor: (option: T) => string
) {
  return `${filter.mode}:${filter.selected.map(valueFor).join(',')}`
}

function timeRangeFingerprint(filter: TimeRangeFilter) {
  return [
    filter.mode,
    filter.start.trim(),
    filter.end.trim(),
    filter.relativeStart.trim(),
    filter.relativeEnd.trim(),
  ].join(':')
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

function activeTimeRangeValues(filter: TimeRangeFilter): [string, string] {
  return filter.mode === 'relative'
    ? [filter.relativeStart, filter.relativeEnd]
    : [filter.start, filter.end]
}

function localDateTimeToIso(value: string) {
  if (!value.trim()) return undefined

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}

function relativeOffsetToIso(value: string, ctfStartTime?: number | null) {
  if (!value.trim()) return undefined
  if (ctfStartTime === null || ctfStartTime === undefined) return undefined

  const offset = parseRelativeOffset(value)
  return offset === undefined
    ? undefined
    : new Date(ctfStartTime + offset).toISOString()
}

function parseRelativeOffset(value: string) {
  let input = value.trim().toLowerCase().replace(/^t\s*/, '').replace(/,/g, ' ')
  let sign = 1

  if (input.startsWith('-')) {
    sign = -1
    input = input.slice(1).trim()
  } else if (input.startsWith('+')) {
    input = input.slice(1).trim()
  }

  if (/^\d+(?:\.\d+)?$/.test(input)) {
    return sign * Number(input) * 60_000
  }

  const units: Record<string, number> = {
    d: 86_400_000,
    day: 86_400_000,
    days: 86_400_000,
    h: 3_600_000,
    hr: 3_600_000,
    hrs: 3_600_000,
    hour: 3_600_000,
    hours: 3_600_000,
    m: 60_000,
    min: 60_000,
    mins: 60_000,
    minute: 60_000,
    minutes: 60_000,
    s: 1_000,
    sec: 1_000,
    secs: 1_000,
    second: 1_000,
    seconds: 1_000,
  }
  const matches = [...input.matchAll(/(\d+(?:\.\d+)?)\s*([a-z]+)/g)]
  const remaining = matches
    .reduce((current, match) => current.replace(match[0], ' '), input)
    .trim()

  if (!matches.length || remaining) {
    return undefined
  }

  let total = 0
  for (const match of matches) {
    const amount = Number(match[1])
    const unit = units[match[2]!]
    if (!Number.isFinite(amount) || unit === undefined) return undefined
    total += amount * unit
  }

  return sign * total
}
