import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { cacheLeaderboardAndGraph } from '../cache/leaderboard'
import { calculateLeaderboard } from '../services/leaderboard'
import { createRedis } from '../util/redis'

const { db } = createDatabase(config.database.sql)
const redis = await createRedis()

let running = false
const tick = async () => {
  if (running) {
    return
  }

  running = true
  try {
    const calculated = await calculateLeaderboard(db)
    await cacheLeaderboardAndGraph(redis, calculated)
  } catch (err) {
    console.error('leaderboard update failed', err)
  } finally {
    running = false
  }
}

tick()
setInterval(tick, config.leaderboard.updateInterval)

// @ts-ignore TS2322
onmessage = (ev: any) => {
  if (ev?.data?.type === 'force-update') {
    tick()
  }
}
