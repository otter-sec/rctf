import {
  pgTable,
  text,
  integer,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core'
import type { DynamicPoints, ChallengeFile } from '@rctf/types'

export const challenges = pgTable('challenges', {
  id: text().primaryKey().notNull(),
  data: jsonb().notNull(),
})
