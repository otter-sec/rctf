/**
 * Pure state and shaping for the admin submissions audit table (R27-R30, AE7).
 * Everything here is DOM-free so it can be unit-tested apart from the Svelte
 * table shell: filter state, the query body serializer, the detail-pill
 * derivation, result tones, and the deep-link latch reducer.
 */
import {
  SubmissionKind,
  SubmissionResult,
  SubmissionSortBy,
  SubmissionSortOrder,
  SubmissionTeamStatus,
} from '@rctf/types'
import {
  clearFilter,
  clearSearchFilter,
  createFilter,
  createSearchFilter,
  filterFingerprint,
  type MultiFilter,
  type SearchFilter,
} from '$lib/filters/core'
import { addFilterParams, addTimeRangeParams } from '$lib/filters/query'
import {
  clearTimeRangeFilter,
  createTimeRangeFilter,
  hasTimeRangeFilter,
  timeRangeFingerprint,
  type TimeRangeFilter,
} from '$lib/filters/time'
import { PAGE_SIZE, type ResultTone } from '$lib/filters/ui'
import type { AdminSubmissionsQueryParams } from '$lib/query/keys'
import { isRecord } from '$lib/utils/is-record'
import type { SortOrder, SortState } from '../admin-table-logic'

export type ChallengeOption = { id: string; name: string; category: string }
export type TeamOption = { id: string; name: string; avatarUrl: string | null }
export type CategoryOption = { value: string; label: string }
export type DivisionOption = { value: string; label: string }

export type SubmissionFilters = {
  challenge: SearchFilter<ChallengeOption>
  team: SearchFilter<TeamOption>
  kind: MultiFilter<SubmissionKind>
  result: MultiFilter<SubmissionResult>
  teamStatus: MultiFilter<SubmissionTeamStatus>
  category: MultiFilter<CategoryOption>
  division: MultiFilter<DivisionOption>
  time: TimeRangeFilter
}

export type SubmissionSort = SortState<SubmissionSortBy>

export type Submission = {
  id: string
  kind: SubmissionKind
  challengeId: string
  challengeName: string
  challengeCategory: string
  userId: string
  userName: string
  userDivision: string
  userAvatarUrl: string | null
  userCountryCode: string | null
  userStatusText: string | null
  userBanned: boolean
  ip: string
  result: SubmissionResult
  details: Record<string, unknown>
  relatedId: string | null
  createdAt: string
}

// A pill in the expanded detail row. `wide` widens the error pill, whose value
// is the longest of the admin-bot fields.
export type DetailEntry = { label: string; value: string; wide?: boolean }

export const KIND_OPTIONS = [
  SubmissionKind.FLAG,
  SubmissionKind.ADMIN_BOT,
] as const
export const RESULT_OPTIONS = [
  SubmissionResult.CORRECT,
  SubmissionResult.QUEUED,
  SubmissionResult.ALREADY_SOLVED,
  SubmissionResult.ACTIVE_JOB,
  SubmissionResult.INCORRECT,
  SubmissionResult.INVALID_INPUT,
  SubmissionResult.BAD_INSTANCER_STATE,
] as const
export const TEAM_STATUS_OPTIONS = [
  SubmissionTeamStatus.BANNED,
  SubmissionTeamStatus.NOT_BANNED,
] as const

// createdAt sorts newest-first by default; every other column starts ascending,
// matching the teams table's toggle behaviour.
export const SUBMISSION_SORT_DEFAULTS: Record<SubmissionSortBy, SortOrder> = {
  [SubmissionSortBy.CREATED_AT]: 'desc',
  [SubmissionSortBy.CHALLENGE]: 'asc',
  [SubmissionSortBy.TEAM]: 'asc',
  [SubmissionSortBy.IP]: 'asc',
  [SubmissionSortBy.KIND]: 'asc',
  [SubmissionSortBy.RESULT]: 'asc',
}

export function initialSubmissionSort(): SubmissionSort {
  return { by: SubmissionSortBy.CREATED_AT, order: 'desc' }
}

export function createSubmissionFilters(): SubmissionFilters {
  return {
    challenge: createSearchFilter<ChallengeOption>(),
    team: createSearchFilter<TeamOption>(),
    kind: createFilter<SubmissionKind>(),
    result: createFilter<SubmissionResult>(),
    teamStatus: createFilter<SubmissionTeamStatus>(),
    category: createFilter<CategoryOption>(),
    division: createFilter<DivisionOption>(),
    time: createTimeRangeFilter(),
  }
}

export function hasSubmissionFilters(filters: SubmissionFilters): boolean {
  return (
    filters.challenge.selected.length > 0 ||
    filters.team.selected.length > 0 ||
    filters.kind.selected.length > 0 ||
    filters.result.selected.length > 0 ||
    filters.teamStatus.selected.length > 0 ||
    filters.category.selected.length > 0 ||
    filters.division.selected.length > 0 ||
    hasTimeRangeFilter(filters.time)
  )
}

export function clearSubmissionFilters(filters: SubmissionFilters): void {
  clearSearchFilter(filters.challenge)
  clearSearchFilter(filters.team)
  clearFilter(filters.kind)
  clearFilter(filters.result)
  clearFilter(filters.teamStatus)
  clearFilter(filters.category)
  clearFilter(filters.division)
  clearTimeRangeFilter(filters.time)
}

export function submissionFilterFingerprint(
  filters: SubmissionFilters
): string {
  return [
    filterFingerprint(filters.challenge, option => option.id),
    filterFingerprint(filters.team, option => option.id),
    filterFingerprint(filters.kind, kind => kind),
    filterFingerprint(filters.result, result => result),
    filterFingerprint(filters.teamStatus, status => status),
    filterFingerprint(filters.category, option => option.value),
    filterFingerprint(filters.division, option => option.value),
    timeRangeFingerprint(filters.time),
  ].join('|')
}

/**
 * Composed fingerprint that changes on any filter or sort change. The shell
 * keys its scroll-reset and expansion-collapse effects off this string.
 */
export function submissionQueryFingerprint(
  filters: SubmissionFilters,
  sort: SubmissionSort
): string {
  return `${sort.by}:${sort.order}:${submissionFilterFingerprint(filters)}`
}

/**
 * Serializes the active filters and sort into the POST body for
 * `/v2/admin/submissions`. Include/exclude filters emit `{include|exclude:[…]}`;
 * an invalid time range emits no `createdAfter`/`createdBefore` (the editor
 * surfaces the error instead of silently querying a bad range).
 */
export function buildSubmissionsBody(
  filters: SubmissionFilters,
  sort: SubmissionSort,
  ctfStartTime?: number | null
): AdminSubmissionsQueryParams {
  const params: Record<string, unknown> = {
    limit: PAGE_SIZE,
    sortBy: sort.by,
    sortOrder: sort.order as SubmissionSortOrder,
  }

  addFilterParams(params, 'challenge', filters.challenge, option => option.id)
  addFilterParams(params, 'team', filters.team, option => option.id)
  addFilterParams(params, 'kind', filters.kind, kind => kind)
  addFilterParams(params, 'result', filters.result, result => result)
  addFilterParams(params, 'teamStatus', filters.teamStatus, status => status)
  addFilterParams(params, 'category', filters.category, option => option.value)
  addFilterParams(params, 'division', filters.division, option => option.value)
  addTimeRangeParams(params, filters.time, ctfStartTime)

  return params as AdminSubmissionsQueryParams
}

export function resultLabel(result: string): string {
  switch (result) {
    case SubmissionResult.CORRECT:
      return 'Correct'
    case SubmissionResult.INCORRECT:
      return 'Incorrect'
    case SubmissionResult.ALREADY_SOLVED:
      return 'Already solved'
    case SubmissionResult.QUEUED:
      return 'Queued'
    case SubmissionResult.ACTIVE_JOB:
      return 'Active job'
    case SubmissionResult.INVALID_INPUT:
      return 'Invalid input'
    case SubmissionResult.BAD_INSTANCER_STATE:
      return 'Bad instancer'
    default:
      return result
  }
}

export function kindLabel(kind: string): string {
  switch (kind) {
    case SubmissionKind.FLAG:
      return 'Flag'
    case SubmissionKind.ADMIN_BOT:
      return 'Admin bot'
    default:
      return kind
  }
}

export function teamStatusLabel(status: string): string {
  switch (status) {
    case SubmissionTeamStatus.BANNED:
      return 'Banned'
    case SubmissionTeamStatus.NOT_BANNED:
      return 'Not banned'
    default:
      return status
  }
}

/**
 * Result tone for all seven outcomes: correct and queued read as success,
 * already-solved and active-job as a cautionary warning, and every failure
 * (incorrect, invalid input, bad instancer) as danger.
 */
export function resultTone(result: string): ResultTone {
  switch (result) {
    case SubmissionResult.CORRECT:
    case SubmissionResult.QUEUED:
      return 'success'
    case SubmissionResult.ALREADY_SOLVED:
    case SubmissionResult.ACTIVE_JOB:
      return 'warning'
    default:
      return 'danger'
  }
}

/**
 * Pills shown in the expanded detail row. A flag submission carries only its
 * submitted flag; an admin-bot job carries its config revision, related job id,
 * each supplied input, an error, and an instance count — each omitted when the
 * corresponding field is absent.
 */
export function detailEntries(submission: Submission): DetailEntry[] {
  const details = isRecord(submission.details) ? submission.details : {}

  if (submission.kind === SubmissionKind.FLAG) {
    return [{ label: 'flag', value: formatDetailValue(details.submittedFlag) }]
  }

  const entries: DetailEntry[] = []
  if (typeof details.configRevision === 'string') {
    entries.push({ label: 'revision', value: details.configRevision })
  }
  if (submission.relatedId) {
    entries.push({ label: 'job', value: submission.relatedId })
  }
  if (isRecord(details.inputs)) {
    for (const [key, value] of Object.entries(details.inputs)) {
      entries.push({ label: key, value: formatDetailValue(value) })
    }
  }
  if (typeof details.error === 'string') {
    entries.push({ label: 'error', value: details.error, wide: true })
  }
  if (Array.isArray(details.instancerInstances)) {
    entries.push({
      label: 'instances',
      value: formatDetailValue(details.instancerInstances),
    })
  }

  return entries
}

// Blank and the placeholder 'unknown' aren't routable IPs, so their badge is
// inert rather than linking to the external lookup.
export function isRealIp(ip: string): boolean {
  return ip.trim() !== '' && ip !== 'unknown'
}

export function ipInfoUrl(ip: string): string {
  return `https://check-host.net/ip-info?host=${encodeURIComponent(ip)}&lang=en`
}

export type DeepLinkLatch = { team: boolean; challenge: boolean }

export function createDeepLinkLatch(): DeepLinkLatch {
  return { team: false, challenge: false }
}

/**
 * Applies a deep-linked team and/or challenge as include filters exactly once
 * each — as each referenced entity resolves. The latch records which sides have
 * fired so a later refetch of the resolved entity never re-overwrites a filter
 * the admin has since edited.
 *
 * @param filters - Filter state, mutated in place when a side first resolves.
 * @param latch - Which sides have already been applied.
 * @param resolved - The resolved team/challenge (undefined until they load).
 * @returns The next latch state to store.
 */
export function applyDeepLinkFilters(
  filters: SubmissionFilters,
  latch: DeepLinkLatch,
  resolved: { team?: TeamOption | null; challenge?: ChallengeOption | null }
): DeepLinkLatch {
  let { team, challenge } = latch

  if (!team && resolved.team) {
    filters.team.mode = 'include'
    filters.team.selected = [resolved.team]
    team = true
  }
  if (!challenge && resolved.challenge) {
    filters.challenge.mode = 'include'
    filters.challenge.selected = [resolved.challenge]
    challenge = true
  }

  return { team, challenge }
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return 'none'
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
