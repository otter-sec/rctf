import { createRedis } from '../../apps/api/src/util/redis'
import { config } from '../../packages/config/src/index'
import { createDatabase } from '../../packages/db/src/index'

const timeoutMs = 60_000
const intervalMs = 1_000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function waitForService(name: string, probe: () => Promise<void>) {
  const startedAt = Date.now()
  let lastError: unknown

  for (;;) {
    try {
      await probe()
      return
    } catch (error) {
      lastError = error
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`${name} did not become ready: ${String(lastError)}`)
      }
      await sleep(intervalMs)
    }
  }
}

async function probePostgres() {
  const { client } = createDatabase(config.database.sql)
  try {
    await client`select 1`
  } finally {
    await client.end({ timeout: 1 }).catch(() => {})
  }
}

async function probeRedis() {
  const redis = await createRedis()
  try {
    await redis.ping()
  } finally {
    await redis.quit().catch(() => {})
  }
}

await Promise.all([
  waitForService('Postgres', probePostgres),
  waitForService('Redis', probeRedis),
])

console.log('Postgres and Redis are ready.')
