import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { challenges } from './challenges'
import { users } from './users'

export const scoreEventSourceValues = [
  'flag',
  'decay-recompute',
  'feed',
  'algo-change',
  'ban',
  'delete',
] as const
export type ScoreEventSource = (typeof scoreEventSourceValues)[number]

export const scoreEvents = pgTable(
  'score_events',
  {
    id: text().primaryKey().notNull(),
    challengeid: text().notNull(),
    userid: text().notNull(),
    pointsDelta: integer('points_delta').notNull(),
    eventAt: timestamp('event_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    source: text().$type<ScoreEventSource>().notNull(),
  },
  table => [
    index('score_events_event_at_index').using(
      'btree',
      table.eventAt.asc().op('timestamptz_ops'),
      table.id.asc().op('text_ops')
    ),
    index('score_events_userid_event_at_index').using(
      'btree',
      table.userid.asc().op('text_ops'),
      table.eventAt.asc().op('timestamptz_ops')
    ),
    index('score_events_challengeid_index').using(
      'btree',
      table.challengeid.asc().op('text_ops')
    ),
    foreignKey({
      columns: [table.userid],
      foreignColumns: [users.id],
      name: 'score_events_userid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.challengeid],
      foreignColumns: [challenges.id],
      name: 'score_events_challengeid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
