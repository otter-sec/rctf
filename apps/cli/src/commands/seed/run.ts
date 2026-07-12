import { cacheLeaderboardAndGraph } from '@rctf/api/src/cache/leaderboard'
import { insertInChunks } from '@rctf/api/src/lib/db-bulk'
import { createToken, TokenKind } from '@rctf/api/src/lib/tokens'
import { calculateLeaderboard } from '@rctf/api/src/services/leaderboard'
import { config } from '@rctf/config'
import {
  adminBotJobs,
  challenges,
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

const resetAndSeedDatabase = async (db: DatabaseClient, data: SeedData) => {
  await db.transaction(async tx => {
    await tx.delete(adminBotJobs)
    await tx.delete(scoreEvents)
    await tx.delete(submissions)
    await tx.delete(solves)
    await tx.delete(userMembers)
    await tx.delete(challenges)
    await tx.delete(users)
    await tx.delete(settings)

    await insertInChunks(data.users, chunk => tx.insert(users).values(chunk))
    await insertInChunks(data.members, chunk =>
      tx.insert(userMembers).values(chunk)
    )
    await tx.insert(challenges).values(data.challenges)
    await insertInChunks(data.solves, chunk => tx.insert(solves).values(chunk))
    await insertInChunks(data.scoreEvents, chunk =>
      tx.insert(scoreEvents).values(chunk)
    )
    await insertInChunks(data.submissions, chunk =>
      tx.insert(submissions).values(chunk)
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
    const data = buildSeedData(config)

    await redis.flushdb()
    await resetAndSeedDatabase(db, data)
    await cacheLeaderboardAndGraph(db, redis, await calculateLeaderboard(db))

    const adminToken = await createToken(TokenKind.Team, data.admin.id)
    const teamToken = await createToken(TokenKind.Team, data.teams[0]!.id)

    console.log(`Admin login: ${loginUrl(config.origin, adminToken)}`)
    console.log(`Sample team login: ${loginUrl(config.origin, teamToken)}`)
  })
}
