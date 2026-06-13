import {
  ChallengeScoringKind,
  DynamicScoringTransport,
  ExposeKind,
} from '@rctf/types'
import { sql } from 'drizzle-orm'
import { index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export { ChallengeScoringKind, DynamicScoringTransport, ExposeKind }

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
  instancer?: string
  config: Record<string, unknown>
  expose: InstancerExpose[]
  timeoutMilliseconds: number
  extendable?: boolean
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

export interface DynamicScoringSource {
  transport: DynamicScoringTransport
  secret: string
}

export type ChallengeScoring =
  | { kind: ChallengeScoringKind.DECAY }
  | { kind: ChallengeScoringKind.DYNAMIC; source: DynamicScoringSource }

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
  tags?: string[]
  instancerConfig?: InstancerConfig
  adminBotConfig?: AdminBotConfig
  hidden?: boolean
  releaseTime?: number | null
  scoring?: ChallengeScoring
}

export const challenges = pgTable(
  'challenges',
  {
    id: text().primaryKey().notNull(),
    data: jsonb().$type<ChallengeData>().notNull(),
    score: integer().notNull().default(0),
    solveCount: integer('solve_count').notNull().default(0),
  },
  table => [
    index('challenges_sortweight_index').using(
      'btree',
      sql`((${table.data} ->> 'sortWeight')::int)`
    ),
    index('challenges_hidden_index').using(
      'btree',
      sql`(COALESCE((${table.data} ->> 'hidden')::boolean, false))`
    ),
    index('challenges_scoring_kind_index').using(
      'btree',
      sql`((${table.data} -> 'scoring' ->> 'kind'))`
    ),
  ]
)
