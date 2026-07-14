import { z } from 'zod/mini'
import { example } from './example'

export enum ExposeKind {
  TCP = 'tcp',
  TCP_SSL = 'tcp-ssl',
  HTTP = 'http',
  HTTPS = 'https',
  RAW = 'raw',
}

export enum InstanceStatus {
  STOPPED = 'stopped',
  RUNNING = 'running',
  STARTING = 'starting',
  STOPPING = 'stopping',
  ERRORED = 'errored',
}

export const omitWhenNull = <T extends z.core.SomeType>(inner: T) =>
  z.pipe(
    z.nullish(inner),
    z.transform((v: z.output<T> | null | undefined) => v ?? undefined)
  )

export const ChallengeFileSchemaV1 = z.object({
  name: example(z.string(), 'chall.zip').check(z.describe('File name.')),
  url: example(z.string(), 'https://rctf.osec.io/uploads/chall.zip').check(
    z.describe('File download URL.')
  ),
})

export const ChallengePointsSchemaV1 = z.object({
  min: example(z.int(), 100).check(z.describe('Minimum (floor) point value.')),
  max: example(z.int(), 500).check(
    z.describe('Maximum (initial) point value.')
  ),
})

export const ChallengeFileSchemaV2 = z.object({
  name: example(z.string(), 'chall.zip').check(z.describe('File name.')),
  url: example(z.string(), 'https://rctf.osec.io/uploads/chall.zip').check(
    z.describe('File download URL.')
  ),
  // NOTE(es3n1n): optional for backwards compat with old data
  size: example(z.nullable(z.int()), 2048).check(
    z.describe('File size in bytes, or `null` when unknown.')
  ),
})

type SponsorIcons = {
  icon?: string
  iconLight?: string
  iconDark?: string
}

export function normalizeSponsorIcons<T extends SponsorIcons>(sponsor: T) {
  const { icon, iconLight, iconDark, ...rest } = sponsor
  const light = iconLight || icon || ''
  // no || icon because we'll invert the light one in this case
  const dark = iconDark || ''
  return { ...rest, icon: light || dark, iconLight: light, iconDark: dark }
}

export const SponsorSchemaV2 = z.object({
  name: example(z.string(), 'osec').check(z.describe('Sponsor name.')),
  icon: example(
    z.optional(z.string()),
    'https://rctf.osec.io/sponsors/osec-light.png'
  ).check(
    z.describe(
      'Deprecated. Mirrors `iconLight` (or `iconDark` when only it is set) for old clients.'
    )
  ),
  iconLight: example(
    z.optional(z.string()),
    'https://rctf.osec.io/sponsors/osec-light.png'
  ).check(
    z.describe(
      'Sponsor icon URL for light mode; may be absent on data from older versions.'
    )
  ),
  iconDark: example(
    z.optional(z.string()),
    'https://rctf.osec.io/sponsors/osec-dark.png'
  ).check(
    z.describe(
      'Sponsor icon URL for dark mode; may be absent on data from older versions.'
    )
  ),
  description: example(z.string(), 'Security research.').check(
    z.describe('Sponsor description.')
  ),
  url: example(z.optional(z.string()), 'https://osec.io').check(
    z.describe('Sponsor link, when present.')
  ),
})

export const SponsorUpdateSchemaV2 = z.pipe(
  z.extend(SponsorSchemaV2, {
    icon: example(
      z.optional(z.string()),
      'https://rctf.osec.io/sponsors/osec.png'
    ).check(
      z.describe(
        'Legacy icon URL used as the light-mode icon when the per-mode fields are unset.'
      )
    ),
    iconLight: example(
      z._default(z.string(), ''),
      'https://rctf.osec.io/sponsors/osec-light.png'
    ).check(z.describe('Sponsor icon URL for light mode, or empty string.')),
    iconDark: example(
      z._default(z.string(), ''),
      'https://rctf.osec.io/sponsors/osec-dark.png'
    ).check(z.describe('Sponsor icon URL for dark mode, or empty string.')),
  }),
  z.transform(normalizeSponsorIcons)
)

export const ChallengePointsSchema = z.object({
  min: example(z.int(), 100).check(z.describe('Minimum (floor) point value.')),
  max: example(z.int(), 500).check(
    z.describe('Maximum (initial) point value.')
  ),
})

export enum ChallengeScoringKind {
  DECAY = 'decay',
  DYNAMIC = 'dynamic',
}

export enum DynamicScoringTransport {
  WEBHOOK = 'webhook',
}

export const DynamicScoringSourceSchema = z.object({
  transport: z
    .literal(DynamicScoringTransport.WEBHOOK)
    .check(z.describe('Transport used to push dynamic scores.')),
  secret: example(z.string(), '<webhook-secret>').check(
    z.describe('Shared secret authenticating webhook calls.')
  ),
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
      userId: example(z.string(), 'team-1a2b3c').check(
        z.describe('Team ID the score applies to.')
      ),
      points: example(z.int(), 200)
        .check(z.gte(INT32_MIN))
        .check(z.lte(INT32_MAX))
        .check(z.describe('Point value to assign (32-bit signed integer).')),
    })
  ),
})

export const EndpointSchema = z.object({
  kind: example(z.enum(ExposeKind), 'tcp').check(
    z.describe('Exposure protocol.')
  ),
  host: example(z.string(), 'baby-rev.rctf.osec.io').check(
    z.describe('Reachable host name.')
  ),
  port: example(z.int(), 1337)
    .check(z.gte(0), z.lte(65535))
    .check(z.describe('Reachable port.')),
  title: example(z.optional(z.string()), 'nc').check(
    z.describe('Short label for the endpoint, when present.')
  ),
  text: example(z.optional(z.string()), 'nc baby-rev.rctf.osec.io 1337').check(
    z.describe('Connection hint shown to players, when present.')
  ),
})

export const ExposeSchema = z.object({
  kind: example(z.enum(ExposeKind), 'tcp').check(
    z.describe('Exposure protocol.')
  ),
  hostPrefix: example(z.string(), 'baby-rev')
    .check(z.regex(/^[a-z0-9-]+$/), z.maxLength(63))
    .check(z.describe('Subdomain/host prefix for the exposed service.')),
  containerName: example(z.string(), 'main').check(
    z.describe('Container to expose.')
  ),
  containerPort: example(z.int(), 1337)
    .check(z.gte(1), z.lte(65535))
    .check(z.describe('Container port to expose.')),
  shouldDisplay: example(z.optional(z.boolean()), true).check(
    z.describe('Whether to show the endpoint to players.')
  ),
  title: example(z.optional(z.string()), 'nc').check(
    z.describe('Short label for the endpoint, when present.')
  ),
})

// NOTE(es3n1n): `config` is provider-specific
export const InstancerConfigSchema = z.object({
  challengeIntegrationId: example(z.string(), 'baby-rev').check(
    z.describe('Challenge integration ID this config belongs to.')
  ),
  instancer: example(z.optional(z.string()), 'kubernetes').check(
    z.describe('Instancer to use, or the default when omitted.')
  ),
  config: z
    .record(z.string(), z.any())
    .check(z.describe('Provider-specific instancer configuration.')),
  expose: z.optional(z.array(ExposeSchema)),
  timeoutMilliseconds: example(z.int(), 600000).check(
    z.describe('Instance lifetime in milliseconds.')
  ),
  extendable: example(z.optional(z.boolean()), true).check(
    z.describe('Whether the instance lifetime can be extended.')
  ),
})

export const PartialInstancerConfigSchema = z.object({
  challengeIntegrationId: example(z.optional(z.string()), 'baby-rev').check(
    z.describe('Challenge integration ID this config belongs to.')
  ),
  instancer: example(z.optional(z.string()), 'kubernetes').check(
    z.describe('Instancer to use, or the default when omitted.')
  ),
  config: z
    .optional(z.record(z.string(), z.any()))
    .check(z.describe('Provider-specific instancer configuration.')),
  expose: z.optional(z.array(ExposeSchema)),
  timeoutMilliseconds: example(z.optional(z.int()), 600000).check(
    z.describe('Instance lifetime in milliseconds.')
  ),
  extendable: example(z.optional(z.boolean()), true).check(
    z.describe('Whether the instance lifetime can be extended.')
  ),
})

export const RegexRuleSchema = z.object({
  pattern: example(z.string(), '^https?://.*$').check(
    z.describe('Regular expression source the input must match.')
  ),
  flags: example(z.optional(z.string()), 'i').check(
    z.describe('Regular expression flags, when present.')
  ),
})

export const AdminBotConfigSchema = z.object({
  code: example(z.string(), 'admin-bot').check(
    z.describe('Admin-bot code identifier.')
  ),
  inputs: z.record(z.string(), RegexRuleSchema),
  revision: example(z.string(), 'v1').check(
    z.describe('Config revision identifier.')
  ),
  timeoutMilliseconds: example(z.int(), 30000).check(
    z.describe('Per-job timeout in milliseconds.')
  ),
  requireInstancerInstancesRunning: example(
    z.optional(z.boolean()),
    false
  ).check(
    z.describe('Whether a running instance is required to submit a job.')
  ),
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
    include: z
      .nullish(z.array(t).check(z.maxLength(1024)))
      .check(
        z.describe(
          'Keep only rows matching one of these values; omitted or `null` applies no allowlist.'
        )
      ),
    exclude: z
      .nullish(z.array(t).check(z.maxLength(1024)))
      .check(
        z.describe(
          'Drop rows matching any of these values; omitted or `null` applies no denylist.'
        )
      ),
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
