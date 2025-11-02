import { pgTable, text, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core'
import type { DynamicPoints, ChallengeFile } from '@rctf/types'

export const challenges = pgTable(
  'challenges',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    author: text('author').notNull(),
    points: jsonb('points').$type<number | DynamicPoints>().notNull(),
    flag: text('flag').notNull(),
    files: jsonb('files').$type<ChallengeFile[]>().notNull().$defaultFn(() => []),
    tiebreakEligible: boolean('tiebreak_eligible').notNull().default(true),
    sortWeight: integer('sort_weight'),
  },
  (table) => [
    index('challenges_category_idx').on(table.category),
    index('challenges_sort_weight_idx').on(table.sortWeight),
  ]
)
