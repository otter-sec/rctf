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

export enum ChallengeScoringKind {
  DECAY = 'decay',
  DYNAMIC = 'dynamic',
}

export enum DynamicScoringTransport {
  WEBHOOK = 'webhook',
}

export const DynamicScoringSourceSchema = z.object({
  transport: z.literal(DynamicScoringTransport.WEBHOOK),
  secret: z.string(),
})

export const ChallengeScoringSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(ChallengeScoringKind.DECAY) }),
  z.object({
    kind: z.literal(ChallengeScoringKind.DYNAMIC),
    source: DynamicScoringSourceSchema,
  }),
])

// solves.points is a PG `integer` (32-bit signed)
const INT32_MIN = -2_147_483_648
const INT32_MAX = 2_147_483_647
export const DynamicScoresPayloadSchema = z.object({
  scores: z.array(
    z.object({
      userId: z.string(),
      points: z.int().check(z.gte(INT32_MIN)).check(z.lte(INT32_MAX)),
    })
  ),
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

export enum AdminTeamSortBy {
  CREATED_AT = 'createdAt',
  TEAM = 'team',
  EMAIL = 'email',
  DIVISION = 'division',
  SCORE = 'score',
  SOLVES = 'solves',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminTeamStatus {
  ACTIVE = 'active',
  BANNED = 'banned',
  ADMIN = 'admin',
}

export const searchFilter = <T extends z.core.SomeType>(t: T) =>
  z.object({
    include: z.nullish(z.array(t).check(z.maxLength(1024))),
    exclude: z.nullish(z.array(t).check(z.maxLength(1024))),
  })

export enum SubmissionKind {
  FLAG = 'flag',
  ADMIN_BOT = 'admin_bot',
}

export enum SubmissionSortBy {
  CREATED_AT = 'createdAt',
  CHALLENGE = 'challenge',
  TEAM = 'team',
  IP = 'ip',
  KIND = 'kind',
  RESULT = 'result',
}

export enum SubmissionSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SubmissionResult {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  ALREADY_SOLVED = 'already_solved',
  QUEUED = 'queued',
  ACTIVE_JOB = 'active_job',
  INVALID_INPUT = 'invalid_input',
  BAD_INSTANCER_STATE = 'bad_instancer_state',
}

export enum SubmissionTeamStatus {
  BANNED = 'banned',
  NOT_BANNED = 'not_banned',
}
