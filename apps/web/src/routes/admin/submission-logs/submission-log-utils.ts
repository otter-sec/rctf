import {
  SubmissionLogKind,
  SubmissionLogResult,
  SubmissionLogSortBy,
  SubmissionLogSortOrder,
} from '@rctf/types'

export const KIND_FILTERS = [
  SubmissionLogKind.FLAG,
  SubmissionLogKind.ADMIN_BOT,
] as const
export const RESULT_FILTERS = [
  SubmissionLogResult.CORRECT,
  SubmissionLogResult.INCORRECT,
  SubmissionLogResult.RATE_LIMITED,
  SubmissionLogResult.ALREADY_SOLVED,
  SubmissionLogResult.QUEUED,
  SubmissionLogResult.ACTIVE_JOB,
  SubmissionLogResult.INVALID_INPUT,
  SubmissionLogResult.BAD_INSTANCER_STATE,
] as const

export type SortBy = SubmissionLogSortBy
export type SortOrder = SubmissionLogSortOrder
export type DetailEntry = { label: string; value: string }
export type ResultTone = 'success' | 'warning' | 'danger'
export type ChallengeFilterOption = {
  id: string
  name: string
  category: string
}
export type TeamFilterOption = {
  id: string
  name: string
  avatarUrl: string | null
}

export type SubmissionLog = {
  id: string
  kind: SubmissionLogKind
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
  result: SubmissionLogResult
  details: Record<string, unknown>
  relatedId: string | null
  createdAt: string
}

export function resultLabel(result: string) {
  switch (result) {
    case SubmissionLogResult.CORRECT:
      return 'Correct'
    case SubmissionLogResult.INCORRECT:
      return 'Incorrect'
    case SubmissionLogResult.RATE_LIMITED:
      return 'Rate limited'
    case SubmissionLogResult.ALREADY_SOLVED:
      return 'Already solved'
    case SubmissionLogResult.QUEUED:
      return 'Queued'
    case SubmissionLogResult.ACTIVE_JOB:
      return 'Active job'
    case SubmissionLogResult.INVALID_INPUT:
      return 'Invalid input'
    case SubmissionLogResult.BAD_INSTANCER_STATE:
      return 'Bad instancer'
    default:
      return result
  }
}

export function kindLabel(kind: string) {
  switch (kind) {
    case SubmissionLogKind.FLAG:
      return 'Flag'
    case SubmissionLogKind.ADMIN_BOT:
      return 'Admin bot'
    default:
      return kind
  }
}

export function resultTone(result: string): ResultTone {
  switch (result) {
    case SubmissionLogResult.CORRECT:
    case SubmissionLogResult.QUEUED:
      return 'success'
    case SubmissionLogResult.RATE_LIMITED:
    case SubmissionLogResult.ALREADY_SOLVED:
    case SubmissionLogResult.ACTIVE_JOB:
      return 'warning'
    default:
      return 'danger'
  }
}

export function detailEntries(log: SubmissionLog): DetailEntry[] {
  const details = isRecord(log.details) ? log.details : {}

  if (log.kind === SubmissionLogKind.FLAG) {
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
  if (log.relatedId) {
    entries.push({ label: 'job', value: log.relatedId })
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
