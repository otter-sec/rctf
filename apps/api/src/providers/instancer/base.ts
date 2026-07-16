import type { InstancerConfig, User } from '@rctf/db'
import { ExposeKind, InstanceStatus } from '@rctf/types'
import { z } from 'zod/mini'

export { InstanceStatus }

export interface CreateInstanceOptions extends InstancerConfig {
  user: User
  // NOTE(sy1vi3): the flag delivered to this instance — the per-team signed
  //  flag for dynamic-flag challenges, otherwise the challenge's static flag.
  //  Providers that support it deliver this to the instance (e.g. k8s via the
  //  downward API); other providers may ignore it. Undefined when the challenge
  //  has no flag configured.
  flag?: string
}

export interface InstanceQueryOptions {
  teamId: string
  challengeIntegrationId: string
  config: Record<string, unknown>
}

export interface ExtendInstanceOptions extends InstanceQueryOptions {
  timeoutMilliseconds: number
}

const instancerEndpointSchema = z.object({
  kind: z.enum(ExposeKind),
  host: z.string(),
  port: z.int().check(z.gte(0), z.lte(65535)),
  title: z.optional(z.string()),
  text: z.optional(z.string()),
  bypassExpose: z.optional(z.boolean()),
})

export const instanceDetailsSchema = z.object({
  kind: z.literal('instancerInstanceDetails'),
  status: z.enum(InstanceStatus),
  timeLeftMilliseconds: z.nullable(z.int()),
  endpoints: z.nullable(z.array(instancerEndpointSchema)),
})

export const instancerErrorSchema = z.object({
  kind: z.literal('instancerError'),
  message: z.string(),
})

export type instanceDetailsOrError =
  | z.output<typeof instanceDetailsSchema>
  | z.output<typeof instancerErrorSchema>

export const instancerActionResultSchema = z.object({
  kind: z.literal('instancerActionResult'),
  message: z.optional(z.string()),
  submitFlag: z.optional(z.string()),
})

export type instancerActionOutcome =
  | z.output<typeof instancerActionResultSchema>
  | z.output<typeof instancerErrorSchema>

export type ProviderConfig = Record<string, unknown>

export interface InstancerCapabilities {
  canStop: boolean
  canExtend: boolean
}

export interface InstancerActionDefinition {
  id: string
  label: string
  rateLimit?: { burst: number; intervalMilliseconds: number }
}

export interface InstancerProvider {
  readonly configSchema: z.ZodMiniType<ProviderConfig, unknown>
  readonly capabilities: InstancerCapabilities

  getDefaults: () => ProviderConfig

  createInstance: (
    options: CreateInstanceOptions
  ) => Promise<instanceDetailsOrError>

  // NOTE(es3n1n): Providers are guaranteed to return endpoints in the same order as the expose config
  getInstance: (
    options: InstanceQueryOptions
  ) => Promise<instanceDetailsOrError>

  deleteInstance: (
    options: InstanceQueryOptions
  ) => Promise<instanceDetailsOrError>

  extendInstance: (
    options: ExtendInstanceOptions
  ) => Promise<instanceDetailsOrError>

  readonly actions?: InstancerActionDefinition[]
  runAction?: (
    actionId: string,
    options: InstanceQueryOptions
  ) => Promise<instancerActionOutcome>
}
