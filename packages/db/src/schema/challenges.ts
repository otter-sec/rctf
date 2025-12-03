import { ExposeKind } from '@rctf/types'
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

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

export interface InstancerConfig {
  challengeIntegrationId: string
  pods: {
    name: string
    image: string
    env: Record<string, string>
    egress: boolean
    security: {
      readOnlyFs: boolean
      dockerSecurityOpt: string[]
      capAdd: string[]
      capDrop: string[]
    }
    limits: {
      memoryBytes: number
      cpusNano: number
      pidsLimit: number
      ulimits: {
        name: string
        soft: number
        hard: number
      }[]
    }
  }[]
  expose: {
    kind: ExposeKind
    podName: string
    podPort: number
  }[]
  timeoutMilliseconds: number
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
}

export const challenges = pgTable('challenges', {
  id: text().primaryKey().notNull(),
  data: jsonb().$type<ChallengeData>().notNull(),
})
