import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export interface ChallengePoints {
  min: number
  max: number
}

export interface ChallengeFile {
  name: string
  url: string
  size: number
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
}

export const challenges = pgTable('challenges', {
  id: text().primaryKey().notNull(),
  data: jsonb().$type<ChallengeData>().notNull(),
})
