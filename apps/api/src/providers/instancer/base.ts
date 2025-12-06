import type { InstancerConfig } from '@rctf/db'
import { EndpointSchema, InstanceStatus } from '@rctf/types'
import { z } from 'zod'

export { InstanceStatus }

export interface CreateInstanceOptions extends InstancerConfig {
  teamId: string
}

export interface InstanceQueryOptions {
  teamId: string
  challengeIntegrationId: string
}

export interface ExtendInstanceOptions extends InstanceQueryOptions {
  timeoutMilliseconds: number
}

export const instanceDetailsSchema = z.object({
  kind: z.literal('instancerInstanceDetails'),
  status: z.nativeEnum(InstanceStatus),
  timeLeftMilliseconds: z.number().int().nullable(),
  endpoints: z.array(EndpointSchema).nullable(),
})

export const instancerErrorSchema = z.object({
  kind: z.literal('instancerError'),
  message: z.string(),
})

export type instanceDetailsOrError =
  | z.output<typeof instanceDetailsSchema>
  | z.output<typeof instancerErrorSchema>

export type ProviderConfig = Record<string, unknown>

export interface InstancerProvider {
  readonly configSchema: z.ZodType<ProviderConfig, z.ZodTypeDef, unknown>

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
}
