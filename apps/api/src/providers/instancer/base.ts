import type { InstancerConfig } from '@rctf/db'
import { EndpointSchema, InstanceStatus } from '@rctf/types'
import { z } from 'zod/mini'

export { InstanceStatus }

export interface CreateInstanceOptions extends InstancerConfig {
  teamId: string
}

export interface InstanceQueryOptions {
  teamId: string
  challengeIntegrationId: string
  config: Record<string, unknown>
}

export interface ExtendInstanceOptions extends InstanceQueryOptions {
  timeoutMilliseconds: number
}

export const instanceDetailsSchema = z.object({
  kind: z.literal('instancerInstanceDetails'),
  status: z.enum(InstanceStatus),
  timeLeftMilliseconds: z.nullable(z.int()),
  endpoints: z.nullable(z.array(EndpointSchema)),
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
