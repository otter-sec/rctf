import { NumericString, ProtectedAction } from '@rctf/types'
import { z } from 'zod'

export { ProtectedAction }

export const ProviderConfigSchema = z.object({
  name: z.string(),
  options: z.unknown(),
})

export const SponsorSchema = z.object({
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  small: z.boolean().optional(),
})

// Division access control: matches field `match` against `value`, applies to listed divisions
export const ACLSchema = z.object({
  match: z.string(),
  value: z.string(),
  divisions: z.array(z.string()),
})

export const ServerConfigSchema = z.object({
  // Core
  ctfName: z.string(),
  origin: z.string(),
  tokenKey: z.string(),
  instanceType: z.enum(['leaderboard', 'all', 'frontend']).default('all'),

  // Database
  database: z.object({
    sql: z.union([
      z.string(), // connection string
      z.object({
        host: z.string(),
        port: z.number().optional(),
        user: z.string(),
        password: z.string(),
        database: z.string(),
      }),
    ]),
    redis: z.union([
      z.string(), // connection string
      z.object({
        host: z.string(),
        port: z.number().optional(),
        password: z.string().optional(),
        database: z.number().optional(),
      }),
    ]),
    migrate: z.enum(['before', 'only', 'never']).default('never'),
  }),

  // CTF timing
  startTime: z.number(), // unix ms
  endTime: z.number(), // unix ms

  // Divisions
  divisions: z.record(z.string(), z.string()).default({open: 'Open'}), // id -> display name
  defaultDivision: z.string().optional(),
  divisionACLs: z.array(ACLSchema).optional(),

  // Auth
  registrationsEnabled: z.boolean().default(true),
  userMembers: z.boolean().default(true),
  loginTimeout: z.number().default(3_600_000),
  ctftime: z
    .object({
      clientId: NumericString,
      clientSecret: z.string(),
    })
    .optional(),

  // Captcha
  captcha: z
    .object({
      provider: ProviderConfigSchema.optional(),
      protectedEndpoints: z.array(z.nativeEnum(ProtectedAction)).optional(),
    })
    .optional(),

  // Backport for v1 recaptcha config
  recaptcha: z
    .object({
      siteKey: z.string().optional(),
      secretKey: z.string().optional(),
      protectedActions: z.array(z.nativeEnum(ProtectedAction)).optional(),
    })
    .optional(),

  // Providers
  uploadProvider: ProviderConfigSchema.default({ name: 'uploads/local' }),
  scoreProvider: ProviderConfigSchema.default({ name: 'scores/classic' }),
  instancerProvider: ProviderConfigSchema.optional(),
  email: z
    .object({
      provider: ProviderConfigSchema,
      from: z.string(),
      logoUrl: z.string().optional(),
    })
    .optional(),

  // UI
  homeContent: z.string().default('Home content. Markdown supported.'),
  sponsors: z.array(SponsorSchema).default([]),
  meta: z
    .object({
      description: z.string().default('rCTF event description'),
      imageUrl: z.string().default(''),
    })
    .default({}),
  faviconUrl: z
    .string()
    .default('https://redpwn.storage.googleapis.com/branding/rctf-favicon.ico'),

  // TODO(es3n1n): use this for analytics
  globalSiteTag: z.string().optional(),

  // Limits
  maxAvatarSize: z.number().default(1024 * 1024),
  leaderboard: z
    .object({
      maxLimit: z.number().default(100),
      maxOffset: z.number().default(4294967296),
      updateInterval: z.number().default(10_000), // 10s
      graphMaxTeams: z.number().default(10),
      graphSampleTime: z.number().default(1_800_000), // 30min
    })
    .default({}),

  // Proxy
  proxy: z
    .object({
      cloudflare: z.boolean().default(false),
      trust: z
        .union([z.boolean(), z.string(), z.array(z.string()), z.number()])
        .default(false),
    })
    .default({}),
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type Sponsor = z.infer<typeof SponsorSchema>
export type ACL = z.infer<typeof ACLSchema>
export type ServerConfig = z.infer<typeof ServerConfigSchema>
