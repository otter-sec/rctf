import {
  SubmissionKind,
  SubmissionResult,
  SubmissionSortBy,
  SubmissionSortOrder,
  SubmissionTeamStatus,
} from '@rctf/types'

export const KIND_FILTERS = [
  SubmissionKind.FLAG,
  SubmissionKind.ADMIN_BOT,
] as const
export const RESULT_FILTERS = [
  SubmissionResult.CORRECT,
  SubmissionResult.QUEUED,
  SubmissionResult.RATE_LIMITED,
  SubmissionResult.ALREADY_SOLVED,
  SubmissionResult.ACTIVE_JOB,
  SubmissionResult.INCORRECT,
  SubmissionResult.INVALID_INPUT,
  SubmissionResult.BAD_INSTANCER_STATE,
] as const
export const TEAM_STATUS_FILTERS = [
  SubmissionTeamStatus.BANNED,
  SubmissionTeamStatus.NOT_BANNED,
] as const

export type SortBy = SubmissionSortBy
export type SortOrder = SubmissionSortOrder
export type DetailEntry = { label: string; value: string }
export type ResultTone = 'success' | 'warning' | 'danger'
export type CategoryFilterOption = {
  value: string
  label: string
}
export type ChallengeFilterOption = {
  id: string
  name: string
  category: string
}
export type DivisionFilterOption = {
  value: string
  label: string
}
export type TeamFilterOption = {
  id: string
  name: string
  avatarUrl: string | null
}

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

export function resultLabel(result: string) {
  switch (result) {
    case SubmissionResult.CORRECT:
      return 'Correct'
    case SubmissionResult.INCORRECT:
      return 'Incorrect'
    case SubmissionResult.RATE_LIMITED:
      return 'Rate limited'
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

export function kindLabel(kind: string) {
  switch (kind) {
    case SubmissionKind.FLAG:
      return 'Flag'
    case SubmissionKind.ADMIN_BOT:
      return 'Admin bot'
    default:
      return kind
  }
}

export function teamStatusLabel(status: string) {
  switch (status) {
    case SubmissionTeamStatus.BANNED:
      return 'Banned'
    case SubmissionTeamStatus.NOT_BANNED:
      return 'Not banned'
    default:
      return status
  }
}

export function resultTone(result: string): ResultTone {
  switch (result) {
    case SubmissionResult.CORRECT:
    case SubmissionResult.QUEUED:
      return 'success'
    case SubmissionResult.RATE_LIMITED:
    case SubmissionResult.ALREADY_SOLVED:
    case SubmissionResult.ACTIVE_JOB:
      return 'warning'
    default:
      return 'danger'
  }
}

export function detailEntries(submission: Submission): DetailEntry[] {
  const details = isRecord(submission.details) ? submission.details : {}

  if (submission.kind === SubmissionKind.FLAG) {
    return [
      {
        label: 'flag',
        value: formatDetailValue(details.submittedFlag),
      },
    ]
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
    entries.push({ label: 'error', value: details.error })
  }
  if (Array.isArray(details.instancerInstances)) {
    entries.push({
      label: 'instances',
      value: formatDetailValue(details.instancerInstances),
    })
  }

  return entries.length > 0 ? entries : [{ label: 'details', value: 'none' }]
}

export function canInspectIp(ip: string) {
  return ip.trim() !== '' && ip !== 'unknown'
}

export function ipInfoUrl(ip: string) {
  return `https://check-host.net/ip-info?host=${encodeURIComponent(ip)}&lang=en`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return 'none'
  if (Array.isArray(value))
    return `${value.length} item${value.length === 1 ? '' : 's'}`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
