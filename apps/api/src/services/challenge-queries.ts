import { challenges, users } from '@rctf/db'
import { ChallengeScoringKind } from '@rctf/types'
import { and, eq, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

export const userIsNotBanned = eq(users.banned, false)
export const nonBannedUserJoin = (ownerId: PgColumn) =>
  and(eq(users.id, ownerId), userIsNotBanned)

export const challengeIsPublicSql = and(
  sql`COALESCE((${challenges.data} ->> 'hidden')::boolean, false) = false`,
  sql`COALESCE((${challenges.data} ->> 'releaseTime')::bigint, 0) <= ${sql.raw('extract(epoch from now())::bigint * 1000')}`
)!

export const scoringKindOf = (data: {
  scoring?: { kind: ChallengeScoringKind } | null
}): ChallengeScoringKind => data.scoring?.kind ?? ChallengeScoringKind.DECAY

export const isDecayKind = sql`COALESCE(${challenges.data} -> 'scoring' ->> 'kind', ${ChallengeScoringKind.DECAY}) = ${ChallengeScoringKind.DECAY}`
