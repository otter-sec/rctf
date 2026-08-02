import { cacheLeaderboardAndGraph } from '@rctf/api/src/cache/leaderboard'
import { insertInChunks } from '@rctf/api/src/lib/db-bulk'
import { createToken, TokenKind } from '@rctf/api/src/lib/tokens'
import { calculateLeaderboard } from '@rctf/api/src/services/leaderboard-calculation'
import { config } from '@rctf/config'
import {
  challenges,
  dynamicFlags,
  scoreEvents,
  settings,
  solves,
  submissions,
  userMembers,
  users,
  type DatabaseClient,
} from '@rctf/db'
import { withDbAndRedis } from '../../lib/context'
import { buildSeedData, type SeedData } from './data'

const step = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const startedAt = performance.now()
  const result = await fn()
  console.log(`${label}: ${Math.round(performance.now() - startedAt)}ms`)
  return result
}

const resetAndSeedDatabase = async (db: DatabaseClient, data: SeedData) => {
  await db.transaction(async tx => {
    await tx.execute(
      `TRUNCATE TABLE
        "admin_bot_jobs", "score_events", "submission_logs", "solves",
        "dynamic_flags", "user_members", "challenges", "users", "settings"
      CASCADE`
    )

    await insertInChunks(
      data.users,
      chunk => tx.insert(users).values(chunk),
      2000
    )
    await insertInChunks(
      data.members,
      chunk => tx.insert(userMembers).values(chunk),
      10_000
    )
    await tx.insert(challenges).values(data.challenges)
    await insertInChunks(
      data.dynamicFlags,
      chunk => tx.insert(dynamicFlags).values(chunk),
      5000
    )
    await insertInChunks(
      data.solves,
      chunk => tx.insert(solves).values(chunk),
      5000
    )
    await insertInChunks(
      data.scoreEvents,
      chunk => tx.insert(scoreEvents).values(chunk),
      8000
    )
    await insertInChunks(
      data.submissions,
      chunk => tx.insert(submissions).values(chunk),
      5000
    )
    await tx.insert(settings).values(data.settings)
  })
}

const loginUrl = (origin: string, token: string) => {
  const url = new URL('/login', origin)
  url.searchParams.set('token', token)
  return url.toString()
}

export const runSeed = async () => {
  await withDbAndRedis(async ({ db, redis }) => {
    const data = await step('build seed data', async () =>
      buildSeedData(config)
    )

    await step('reset redis', () => redis.flushdb())
    await step('reset and insert', () => resetAndSeedDatabase(db, data))
    await step('leaderboard cache', async () =>
      cacheLeaderboardAndGraph(db, redis, await calculateLeaderboard(db))
    )

    const adminToken = await createToken(TokenKind.Team, data.admin.id)
    const teamToken = await createToken(TokenKind.Team, data.teams[0]!.id)

    console.log(`Admin login: ${loginUrl(config.origin, adminToken)}`)
    console.log(`Sample team login: ${loginUrl(config.origin, teamToken)}`)
  })
}
