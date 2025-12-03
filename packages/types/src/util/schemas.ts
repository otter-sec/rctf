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

export const UlimitSchema = z.object({
  name: z.string(),
  soft: z.number().int(),
  hard: z.number().int(),
})

export const PodLimitsSchema = z.object({
  memoryBytes: z.number().int(),
  cpusNano: z.number().int(),
  pidsLimit: z.number().int(),
  ulimits: z.array(UlimitSchema),
})

export const PodSecuritySchema = z.object({
  readOnlyFs: z.boolean(),
  dockerSecurityOpt: z.array(z.string()),
  capAdd: z.array(z.string()),
  capDrop: z.array(z.string()),
})

export const PodSchema = z.object({
  name: z.string(),
  image: z.string(),
  env: z.record(z.string(), z.string()),
  egress: z.boolean(),
  security: PodSecuritySchema,
  limits: PodLimitsSchema,
})

export const ExposeSchema = z.object({
  kind: z.nativeEnum(ExposeKind),
  podName: z.string(),
  podPort: z.number().int(),
})

export const EndpointSchema = z.object({
  kind: z.nativeEnum(ExposeKind),
  host: z.string(),
  port: z.number().int(),
})

export const InstancerConfigSchema = z.object({
  challengeIntegrationId: z.string(),
  pods: z.array(PodSchema),
  expose: z.array(ExposeSchema),
  timeoutMilliseconds: z.number().int(),
})

export const PartialInstancerConfigSchema = z.object({
  challengeIntegrationId: z.string().optional(),
  pods: z.array(PodSchema).optional(),
  expose: z.array(ExposeSchema).optional(),
  timeoutMilliseconds: z.number().int().optional(),
})
