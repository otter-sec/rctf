import { createLogger } from './logger'

const logger = createLogger('platform')

interface InstancerInstance {
  type: string
  host: string
  port: number
  title?: string
  text?: string
}

export interface PulledJob {
  id: string
  challengeId: string
  configRevision: string
  userId: string
  submittedAt: string
  flag: string
  inputs: Record<string, string>
  instancerInstances: InstancerInstance[]
}

export interface ChallengeSource {
  sourceCode: string
  configRevision: string
}

interface PullResponse {
  kind: string
  data: {
    job: PulledJob | null
  }
}

interface UpdateResponse {
  kind: string
  data: {
    ok: boolean
  }
}

interface ChallengeSourceResponse {
  kind: string
  data: ChallengeSource
}

export class PlatformClient {
  private readonly baseUrl: string
  private readonly secretKey: string
  private readonly extraHeaders: Record<string, string>

  constructor(
    baseUrl: string,
    secretKey: string,
    extraHeaders?: Record<string, string>
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.secretKey = secretKey
    this.extraHeaders = extraHeaders ?? {}
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      ...this.extraHeaders,
      ...extra,
    }
  }

  async pullJob(): Promise<PulledJob | null> {
    const res = await fetch(
      `${this.baseUrl}/api/v2/admin/admin-bot/jobs/pull`,
      {
        method: 'POST',
        headers: this.headers(),
      }
    )

    if (!res.ok) {
      logger.error(
        { status: res.status, text: await res.text() },
        'failed to pull job'
      )
      return null
    }

    const body = (await res.json()) as PullResponse
    return body.data.job
  }

  async fetchChallengeSource(
    challengeId: string
  ): Promise<ChallengeSource | null> {
    const res = await fetch(
      `${this.baseUrl}/api/v2/admin/admin-bot/challenges/${encodeURIComponent(challengeId)}/source`,
      {
        method: 'GET',
        headers: this.headers(),
      }
    )

    if (!res.ok) {
      logger.error(
        { status: res.status, challengeId },
        'failed to fetch challenge source'
      )
      return null
    }

    const body = (await res.json()) as ChallengeSourceResponse
    return body.data
  }

  async completeJob(jobId: string, logs?: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/api/v2/admin/admin-bot/jobs/${jobId}/complete`,
      {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ logs }),
      }
    )

    if (!res.ok) {
      logger.error({ status: res.status, jobId }, 'failed to complete job')
      return false
    }

    const body = (await res.json()) as UpdateResponse
    return body.data.ok
  }

  async failJob(jobId: string, logs?: string): Promise<boolean> {
    const res = await fetch(
      `${this.baseUrl}/api/v2/admin/admin-bot/jobs/${jobId}/fail`,
      {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ logs }),
      }
    )

    if (!res.ok) {
      logger.error({ status: res.status, jobId }, 'failed to fail job')
      return false
    }

    const body = (await res.json()) as UpdateResponse
    return body.data.ok
  }
}
