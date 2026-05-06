import { createRedis } from '../../apps/api/src/util/redis'
import { config } from '../../packages/config/src/index'
import { createDatabase } from '../../packages/db/src/index'

const timeoutMs = 60_000
const intervalMs = 1_000
const startedAt = Date.now()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function waitForPostgres() {
  for (;;) {
    const { client } = createDatabase(config.database.sql)
    try {
      await client`select 1`
      await client.end({ timeout: 1 })
      return
    } catch (error) {
      await client.end({ timeout: 1 }).catch(() => {})
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Postgres did not become ready: ${String(error)}`)
      }
      await sleep(intervalMs)
    }
  }
}

async function waitForRedis() {
  for (;;) {
    const redis = await createRedis()
    try {
      await redis.ping()
      await redis.quit()
      return
    } catch (error) {
      await redis.quit().catch(() => {})
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Redis did not become ready: ${String(error)}`)
      }
      await sleep(intervalMs)
    }
  }
}

await waitForPostgres()
await waitForRedis()

console.log('Postgres and Redis are ready.')
