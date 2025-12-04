import { z } from 'zod'

export enum ExposeKind {
  TCP = 'tcp',
  TCP_SSL = 'tcp-ssl',
  HTTP = 'http',
  HTTPS = 'https',
}

export enum InstanceStatus {
  STOPPED = 'stopped',
  RUNNING = 'running',
  STARTING = 'starting',
  ERRORED = 'errored',
}

export const ChallengeFileSchemaV1 = z.object({
  name: z.string(),
  url: z.string(),
})

export const ChallengePointsSchemaV1 = z.object({
  min: z.number().int(),
  max: z.number().int(),
})

export const ChallengeFileSchemaV2 = z.object({
  name: z.string(),
  url: z.string(),
  // NOTE(es3n1n): optional for backwards compat with old data
  size: z.number().int().nullable(),
})

export const ChallengePointsSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
})

export const EndpointSchema = z.object({
  kind: z.nativeEnum(ExposeKind),
  host: z.string(),
  port: z.number().int(),
})

export const ExposeSchema = z.object({
  kind: z.nativeEnum(ExposeKind),
  hostPrefix: z.string(),
  containerName: z.string(),
  containerPort: z.number().int(),
  shouldDisplay: z.boolean().optional(),
})

// NOTE(es3n1n): `config` is provider-specific
export const InstancerConfigSchema = z.object({
  challengeIntegrationId: z.string(),
  config: z.record(z.string(), z.any()),
  expose: z.array(ExposeSchema),
  timeoutMilliseconds: z.number().int(),
})

export const PartialInstancerConfigSchema = z.object({
  challengeIntegrationId: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
  expose: z.array(ExposeSchema).optional(),
  timeoutMilliseconds: z.number().int().optional(),
})
