import { ExposeKind } from '@rctf/types'
import * as z from 'zod/mini'
import {
  InstancerProvider,
  InstanceStatus,
  type CreateInstanceOptions,
  type ExtendInstanceOptions,
  type instanceDetailsOrError,
  type InstanceQueryOptions,
  type instancerActionOutcome,
  type ProviderConfig,
} from './base'

const rpcInstanceSchema = z.object({
  http: z.string(),
  ws: z.string(),
})

const launchedInstanceSchema = z.object({
  expires_at: z.number(),
  expires_in_sec: z.number(),
  rpc_endpoints: z.record(z.string(), rpcInstanceSchema),
  player_private_key: z.string(),
  contracts: z.record(z.string(), z.object({ address: z.string() })),
})

type LaunchedInstance = z.output<typeof launchedInstanceSchema>

const stoppedDetails = (): instanceDetailsOrError => ({
  kind: 'instancerInstanceDetails',
  status: InstanceStatus.STOPPED,
  timeLeftMilliseconds: 0,
  endpoints: [],
})

const misconfigured = () => ({
  kind: 'instancerError' as const,
  message: 'Instancer is missing a valid apiUrl in the challenge config',
})

export default class ParadigmctfInstancerProvider extends InstancerProvider {
  readonly configSchema = z.object({
    apiUrl: z
      .string()
      .check(
        z.regex(/^https?:\/\//, 'Must be an http(s) URL'),
        z.describe('Base URL of the paradigmctf-py API server')
      ),
    apiToken: z.optional(
      z
        .string()
        .check(
          z.describe(
            'Bearer token (API_AUTH_TOKEN) for the API launcher; leave empty if it runs unauthenticated'
          )
        )
    ),
  })
  readonly capabilities = { canStop: true, canExtend: false }
  override readonly actions = [
    {
      id: 'get-flag',
      label: 'Get flag',
      rateLimit: { burst: 3, intervalMilliseconds: 30_000 },
    },
  ]

  constructor(_options: unknown) {
    super()
  }

  getDefaults = (): ProviderConfig => ({ apiUrl: '', apiToken: '' })

  private resolveApiUrl(config: Record<string, unknown>): string | null {
    const apiUrl = config.apiUrl
    if (typeof apiUrl !== 'string' || apiUrl.length === 0) {
      return null
    }
    return apiUrl.replace(/\/$/, '')
  }

  private resolveApiToken(config: Record<string, unknown>): string | undefined {
    const apiToken = config.apiToken
    if (typeof apiToken !== 'string' || apiToken.length === 0) {
      return undefined
    }
    return apiToken
  }

  private toDetails(instance: LaunchedInstance): instanceDetailsOrError {
    const raw = (title: string, text: string) => ({
      kind: ExposeKind.RAW,
      host: '',
      port: 0,
      title,
      text,
      bypassExpose: true,
    })

    const endpoints = [
      ...Object.entries(instance.rpc_endpoints).flatMap(([name, rpc]) => [
        raw(`RPC (${name}) HTTP`, rpc.http),
        raw(`RPC (${name}) WS`, rpc.ws),
      ]),
      raw('Player private key', instance.player_private_key),
      ...Object.entries(instance.contracts).map(([name, contract]) =>
        raw(`Contract: ${name}`, contract.address)
      ),
    ]

    return {
      kind: 'instancerInstanceDetails',
      status: InstanceStatus.RUNNING,
      timeLeftMilliseconds: Math.max(
        0,
        Math.round(instance.expires_in_sec * 1000)
      ),
      endpoints,
    }
  }

  private async request(
    apiUrl: string,
    path: string,
    init: RequestInit,
    apiToken?: string
  ): Promise<{ status: number; body: unknown } | null> {
    try {
      const headers = new Headers(init.headers)
      if (apiToken) {
        headers.set('Authorization', `Bearer ${apiToken}`)
      }
      const response = await fetch(`${apiUrl}${path}`, { ...init, headers })
      const body = await response.json().catch(() => undefined)
      return { status: response.status, body }
    } catch (err) {
      console.error('Failed to reach the paradigmctf instancer', err)
      return null
    }
  }

  private toDetailsOrError(
    result: { status: number; body: unknown } | null,
    notFoundIsStopped: boolean
  ): instanceDetailsOrError {
    if (!result) {
      return {
        kind: 'instancerError',
        message: 'Failed to reach the instancer',
      }
    }

    if (result.status === 200) {
      const parsed = launchedInstanceSchema.safeParse(result.body)
      if (!parsed.success) {
        return {
          kind: 'instancerError',
          message: 'Received an invalid response from the instancer',
        }
      }
      return this.toDetails(parsed.data)
    }

    if (result.status === 400 && notFoundIsStopped) {
      return stoppedDetails()
    }

    const detail = (result.body as { detail?: unknown } | undefined)?.detail
    return {
      kind: 'instancerError',
      message: typeof detail === 'string' ? detail : 'Instancer request failed',
    }
  }

  createInstance = async (
    options: CreateInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    const apiUrl = this.resolveApiUrl(options.config)
    if (!apiUrl) {
      return misconfigured()
    }

    const result = await this.request(
      apiUrl,
      '/v1/instance',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: options.user.id }),
      },
      this.resolveApiToken(options.config)
    )
    return this.toDetailsOrError(result, false)
  }

  getInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    const apiUrl = this.resolveApiUrl(options.config)
    if (!apiUrl) {
      return misconfigured()
    }

    const result = await this.request(
      apiUrl,
      `/v1/instance?team_id=${encodeURIComponent(options.teamId)}`,
      { method: 'GET' },
      this.resolveApiToken(options.config)
    )
    return this.toDetailsOrError(result, true)
  }

  deleteInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    const apiUrl = this.resolveApiUrl(options.config)
    if (!apiUrl) {
      return misconfigured()
    }

    await this.request(
      apiUrl,
      `/v1/instance?team_id=${encodeURIComponent(options.teamId)}`,
      { method: 'DELETE' },
      this.resolveApiToken(options.config)
    )
    return stoppedDetails()
  }

  extendInstance = async (
    _options: ExtendInstanceOptions
  ): Promise<instanceDetailsOrError> => ({
    kind: 'instancerError',
    message: 'This instancer does not support extending instances',
  })

  override runAction = async (
    actionId: string,
    options: InstanceQueryOptions
  ): Promise<instancerActionOutcome> => {
    if (actionId !== 'get-flag') {
      return { kind: 'instancerError', message: 'Unknown action' }
    }

    const apiUrl = this.resolveApiUrl(options.config)
    if (!apiUrl) {
      return misconfigured()
    }

    const result = await this.request(
      apiUrl,
      `/v1/pwn/flag?team_id=${encodeURIComponent(options.teamId)}`,
      { method: 'GET' },
      this.resolveApiToken(options.config)
    )
    if (!result) {
      return {
        kind: 'instancerError',
        message: 'Failed to reach the instancer',
      }
    }

    if (result.status === 200) {
      const flag = (result.body as { flag?: unknown } | undefined)?.flag
      if (typeof flag !== 'string') {
        return {
          kind: 'instancerError',
          message: 'Received an invalid response from the instancer',
        }
      }
      return { kind: 'instancerActionResult', submitFlag: flag }
    }

    const detail = (result.body as { detail?: unknown } | undefined)?.detail
    return {
      kind: 'instancerError',
      message:
        typeof detail === 'string' ? detail : 'Could not retrieve the flag',
    }
  }
}
