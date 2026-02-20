import { ExposeKind } from '@rctf/types'
import { sql } from 'drizzle-orm'
import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export { ExposeKind }

export interface ChallengePoints {
  min: number
  max: number
}

export interface ChallengeFile {
  name: string
  url: string
  // NOTE(es3n1n): undefined because this is a v2 change,
  //  if we have challenges from v1 they dont have this field
  size?: number
}

export interface InstancerExpose {
  kind: ExposeKind
  hostPrefix: string
  containerName: string
  containerPort: number
  shouldDisplay?: boolean
  title?: string
}

// NOTE(es3n1n): `config` is provider-specific
export interface InstancerConfig {
  challengeIntegrationId: string
  config: Record<string, unknown>
  expose: InstancerExpose[]
  timeoutMilliseconds: number
}

export interface RegexRule {
  pattern: string
  flags?: string
}

export interface AdminBotConfig {
  code: string
  inputs: Record<string, RegexRule>
  revision: string
  timeoutMilliseconds: number
  requireInstancerInstancesRunning: boolean
}

export interface ChallengeData {
  name: string
  description: string
  category: string
  author: string
  files: ChallengeFile[]
  points: ChallengePoints
  flag: string
  tiebreakEligible: boolean
  sortWeight?: number
  instancerConfig?: InstancerConfig
  adminBotConfig?: AdminBotConfig
  hidden?: boolean
  releaseTime?: number | null
}

export const challenges = pgTable(
  'challenges',
  {
    id: text().primaryKey().notNull(),
    data: jsonb().$type<ChallengeData>().notNull(),
  },
  table => [
    index('challenges_sortweight_index').using(
      'btree',
      sql`((${table.data} ->> 'sortWeight')::int)`
    ),
  ]
)
