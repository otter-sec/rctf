import { type InstancerConfig } from '@rctf/db'
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

export interface InstancerProvider {
  createInstance: (
    options: CreateInstanceOptions
  ) => Promise<instanceDetailsOrError>
  getInstance: (
    options: InstanceQueryOptions
  ) => Promise<instanceDetailsOrError>
  deleteInstance: (
    options: InstanceQueryOptions
  ) => Promise<instanceDetailsOrError>
}
