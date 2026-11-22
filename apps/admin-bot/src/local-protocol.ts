import type { RegexRule } from './core/pac'
import type { SubmissionOverrides } from './core/runner'
import type { JobMetadata } from './types'

export interface LocalInspection {
  inputs: Record<string, RegexRule>
  timeoutMilliseconds: number
  requireInstancerInstancesRunning: boolean
  hasDomainRestrictions: boolean
  browser: 'chrome' | 'firefox'
}

export type LocalJob = Omit<JobMetadata, 'submittedAt'> & {
  submittedAt: string
}

export type LocalRunnerRequest =
  | {
      action: 'inspect'
      source: string
    }
  | {
      action: 'run'
      source: string
      inputs: Record<string, string>
      job: LocalJob
      options: SubmissionOverrides & {
        live: boolean
      }
    }

export interface LocalRunResult {
  succeeded: boolean
  logs: string
}

export type LocalRunnerEvent =
  | { type: 'inspection'; inspection: LocalInspection }
  | { type: 'log'; line: string }
  | ({ type: 'result' } & LocalRunResult)
  | { type: 'error'; message: string }

export const LOCAL_RUNNER_EVENT_PREFIX = '@@rctf-admin-bot-event:'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isInspection = (value: unknown): value is LocalInspection =>
  isRecord(value) &&
  isRecord(value.inputs) &&
  typeof value.timeoutMilliseconds === 'number' &&
  typeof value.requireInstancerInstancesRunning === 'boolean' &&
  typeof value.hasDomainRestrictions === 'boolean' &&
  (value.browser === 'chrome' || value.browser === 'firefox')

const isLocalRunnerEvent = (value: unknown): value is LocalRunnerEvent => {
  if (!isRecord(value)) return false

  switch (value.type) {
    case 'inspection':
      return isInspection(value.inspection)
    case 'log':
      return typeof value.line === 'string'
    case 'result':
      return (
        typeof value.succeeded === 'boolean' && typeof value.logs === 'string'
      )
    case 'error':
      return typeof value.message === 'string'
    default:
      return false
  }
}

export const encodeLocalRunnerEvent = (event: LocalRunnerEvent): string =>
  `${LOCAL_RUNNER_EVENT_PREFIX}${JSON.stringify(event)}`

export const decodeLocalRunnerEvent = (
  line: string
): LocalRunnerEvent | undefined => {
  if (!line.startsWith(LOCAL_RUNNER_EVENT_PREFIX)) {
    return undefined
  }

  let value: unknown
  try {
    value = JSON.parse(line.slice(LOCAL_RUNNER_EVENT_PREFIX.length))
  } catch {
    throw new Error('Invalid JSON from local runner')
  }
  if (!isLocalRunnerEvent(value)) {
    throw new Error('Invalid event from local runner')
  }
  return value
}
