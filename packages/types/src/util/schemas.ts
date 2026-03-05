import { z } from 'zod/mini'

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
  STOPPING = 'stopping',
  ERRORED = 'errored',
}

export const ChallengeFileSchemaV1 = z.object({
  name: z.string(),
  url: z.string(),
})

export const ChallengePointsSchemaV1 = z.object({
  min: z.int(),
  max: z.int(),
})

export const ChallengeFileSchemaV2 = z.object({
  name: z.string(),
  url: z.string(),
  // NOTE(es3n1n): optional for backwards compat with old data
  size: z.nullable(z.int()),
})

export const ChallengePointsSchema = z.object({
  min: z.int(),
  max: z.int(),
})

export const EndpointSchema = z.object({
  kind: z.enum(ExposeKind),
  host: z.string(),
  port: z.int(),
  title: z.optional(z.string()),
})

export const ExposeSchema = z.object({
  kind: z.enum(ExposeKind),
  hostPrefix: z.string(),
  containerName: z.string(),
  containerPort: z.int(),
  shouldDisplay: z.optional(z.boolean()),
  title: z.optional(z.string()),
})

// NOTE(es3n1n): `config` is provider-specific
export const InstancerConfigSchema = z.object({
  challengeIntegrationId: z.string(),
  config: z.record(z.string(), z.any()),
  expose: z.array(ExposeSchema),
  timeoutMilliseconds: z.int(),
  extendable: z.optional(z.boolean()),
})

export const PartialInstancerConfigSchema = z.object({
  challengeIntegrationId: z.optional(z.string()),
  config: z.optional(z.record(z.string(), z.any())),
  expose: z.optional(z.array(ExposeSchema)),
  timeoutMilliseconds: z.optional(z.int()),
  extendable: z.optional(z.boolean()),
})

export const RegexRuleSchema = z.object({
  pattern: z.string(),
  flags: z.optional(z.string()),
})

export const AdminBotConfigSchema = z.object({
  code: z.string(),
  inputs: z.record(z.string(), RegexRuleSchema),
  revision: z.string(),
  timeoutMilliseconds: z.int(),
  requireInstancerInstancesRunning: z.optional(z.boolean()),
})

export enum AdminBotJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
