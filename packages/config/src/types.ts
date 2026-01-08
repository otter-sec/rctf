import { NumericString, ProtectedAction } from '@rctf/types'
import { z } from 'zod/mini'

export { ProtectedAction }

export const ProviderConfigSchema = z.object({
  name: z.string(),
  options: z._default(z.unknown(), {}),
})

export const SponsorSchema = z.object({
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  small: z.optional(z.boolean()),
})

// Division access control: matches field `match` against `value`, applies to listed divisions
export const ACLSchema = z.object({
  match: z.string(),
  value: z.string(),
  divisions: z.array(z.string()),
})

export const SqlDatabaseSchema = z.union([
  z.string(), // connection string
  z.object({
    host: z.string(),
    port: z.optional(z.number()),
    user: z.string(),
    password: z.string(),
    database: z.string(),
    maxPoolSize: z._default(z.int(), 20),
    idleTimeout: z._default(z.int(), 30_000),
    connectTimeout: z._default(z.int(), 3_000),
  }),
])

export const RedisDatabaseSchema = z.union([
  z.string(), // connection string
  z.object({
    host: z.string(),
    port: z.optional(z.number()),
    password: z.optional(z.string()),
    database: z.optional(z.number()),
  }),
])

export const ServerConfigSchema = z.object({
  // Core
  ctfName: z.string(),
  origin: z.string(),
  tokenKey: z.string(),
  instanceType: z._default(z.enum(['leaderboard', 'all', 'frontend']), 'all'),

  // Database
  database: z.object({
    sql: SqlDatabaseSchema,
    redis: RedisDatabaseSchema,
    migrate: z._default(z.enum(['before', 'only', 'never']), 'never'),
  }),

  // CTF timing
  startTime: z.number(), // unix ms
  endTime: z.number(), // unix ms

  // Divisions
  divisions: z._default(z.record(z.string(), z.string()), { open: 'Open' }), // id -> display name
  defaultDivision: z.optional(z.string()),
  divisionACLs: z.optional(z.array(ACLSchema)),

  // Auth
  registrationsEnabled: z._default(z.boolean(), true),
  userMembers: z._default(z.boolean(), true),
  loginTimeout: z._default(z.number(), 3_600_000),
  ctftime: z.optional(
    z.object({
      clientId: NumericString,
      clientSecret: z.string(),
    })
  ),

  // Captcha
  captcha: z.optional(
    z.object({
      provider: z.optional(ProviderConfigSchema),
      protectedEndpoints: z.optional(z.array(z.enum(ProtectedAction))),
    })
  ),

  // Backport for v1 recaptcha config
  recaptcha: z.optional(
    z.object({
      siteKey: z.optional(z.string()),
      secretKey: z.optional(z.string()),
      protectedActions: z.optional(z.array(z.enum(ProtectedAction))),
    })
  ),

  // Providers
  uploadProvider: z.prefault(ProviderConfigSchema, {
    name: 'uploads/local',
  }),
  scoreProvider: z.prefault(ProviderConfigSchema, {
    name: 'scores/classic',
  }),
  instancerProvider: z.optional(ProviderConfigSchema),
  email: z.optional(
    z.object({
      provider: ProviderConfigSchema,
      from: z.string(),
      logoUrl: z.optional(z.string()),
    })
  ),

  // UI
  homeContent: z._default(z.string(), 'Home content. Markdown supported.'),
  sponsors: z._default(z.array(SponsorSchema), []),
  meta: z.prefault(
    z.object({
      description: z.prefault(z.string(), 'rCTF event description'),
      imageUrl: z.prefault(z.string(), ''),
    }),
    {}
  ),
  faviconUrl: z._default(
    z.string(),
    'https://redpwn.storage.googleapis.com/branding/rctf-favicon.ico'
  ),

  // TODO(es3n1n): use this for analytics
  globalSiteTag: z.optional(z.string()),

  // Limits
  maxAvatarSize: z._default(z.number(), 1024 * 1024),
  leaderboard: z.prefault(
    z.object({
      maxLimit: z._default(z.number(), 100),
      maxOffset: z._default(z.number(), 4294967296),
      updateInterval: z._default(z.number(), 10_000), // 10s
      graphMaxTeams: z._default(z.number(), 10),
      graphSampleTime: z._default(z.number(), 1_800_000), // 30min
      graphWithListLimit: z._default(z.number(), 100),
    }),
    {}
  ),

  // Moderation
  avatarsModeration: z.optional(
    z.object({
      provider: ProviderConfigSchema,
      allowOnInternalError: z._default(z.boolean(), true),
    })
  ),

  // Proxy
  proxy: z.prefault(
    z.object({
      cloudflare: z._default(z.boolean(), false),
      trust: z._default(
        z.union([z.boolean(), z.string(), z.array(z.string()), z.number()]),
        false
      ),
    }),
    {}
  ),

  // First blood messages
  bloodbot: z.optional(
    z.object({
      bloodsCount: z._default(z.number().check(z.minimum(1), z.maximum(3)), 1),
      destinations: z.pipe(
        z
          .array(
            z.object({
              provider: ProviderConfigSchema,
              messageTemplate: z.optional(z.string()),
            })
          )
          .check(z.minLength(1)),
        z.transform(val =>
          val.map(({ provider, messageTemplate }) => {
            // Telegram does not support [`...`](https://...) links, lol
            // we also need to escape the ! character for telegram
            const isTelegram = provider.name === 'messages/telegram'
            return {
              provider,
              messageTemplate:
                (messageTemplate ?? isTelegram)
                  ? 'Congratulations to [*{{teamName}}*]({{teamUrl}}) for {{bloodNumSentence}} blood on `{{challengeCategory}}/{{challengeName}}`\\!'
                  : 'Congratulations to [`{{teamName}}`]({{teamUrl}}) for {{bloodNumSentence}} blood on `{{challengeCategory}}/{{challengeName}}`!',
            }
          })
        )
      ),
    })
  ),
})
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type Sponsor = z.infer<typeof SponsorSchema>
export type ACL = z.infer<typeof ACLSchema>
export type ServerConfig = z.infer<typeof ServerConfigSchema>
