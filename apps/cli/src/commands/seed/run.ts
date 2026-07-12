import { cacheLeaderboardAndGraph } from '@rctf/api/src/cache/leaderboard'
import { createToken, TokenKind } from '@rctf/api/src/lib/tokens'
import { calculateLeaderboard } from '@rctf/api/src/services/leaderboard'
import { config } from '@rctf/config'
import { withDbAndRedis } from '../../lib/context'
import { buildSeedData } from './data'
import { resetAndSeedDatabase } from './writer'

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

    const calculated = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(db, redis, calculated)

    const adminToken = await createToken(TokenKind.Team, data.admin.id)
    const sampleTeam = data.teams[0]!
    const sampleToken = await createToken(TokenKind.Team, sampleTeam.id)

    console.log(`Admin login: ${loginUrl(config.origin, adminToken)}`)
    console.log(`Sample team login: ${loginUrl(config.origin, sampleToken)}`)
  })
}
