import path from 'path'
import { PGlite } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'
import { mock } from 'bun:test'
import { DrizzleQueryError } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import RedisMock from 'ioredis-mock'
import { loadLuaCommands } from '../../apps/api/src/cache/scripts'
import * as schema from '../../packages/db/src/schema'

const testConfigDir = path.resolve(import.meta.dir, 'data/rctf.d')
const migrationsFolder = path.resolve(
  import.meta.dir,
  '../../packages/db/migrations'
)
process.env.LOG_LEVEL = 'silent'

const pgliteClient = new PGlite({
  extensions: { citext },
})
await pgliteClient.waitReady

const rawPgliteDb = drizzle(pgliteClient, { schema })
await migrate(rawPgliteDb, { migrationsFolder })

// pglite's execute returns { rows: [...] } while postgres-js returns [...] directly
const wrapExecute = (target: any) =>
  new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'execute') {
        return async (...args: any[]) => {
          const result = await target.execute(...args)
          if (result && typeof result === 'object' && 'rows' in result) {
            return result.rows
          }
          return result
        }
      }
      if (prop === 'transaction') {
        return async (fn: any, ...rest: any[]) => {
          return target.transaction((tx: any) => fn(wrapExecute(tx)), ...rest)
        }
      }
      return Reflect.get(target, prop, receiver)
    },
  })
const pgliteDb = wrapExecute(rawPgliteDb)

// pglite errors have a different structure than postgres-js errors
const getErrorConstraint = (error: any): string | undefined => {
  if (!(error instanceof DrizzleQueryError)) {
    return undefined
  }
  const cause = error.cause as any
  if (cause?.constraint_name) {
    return cause.constraint_name
  }
  if (cause?.constraint) {
    return cause.constraint
  }
  const message = cause?.message || ''
  if (message.includes('unique constraint')) {
    const match = message.match(/unique constraint "([^"]+)"/)
    if (match) {
      return match[1]
    }
  }
  if (message.includes('foreign key constraint')) {
    const match = message.match(/foreign key constraint "([^"]+)"/)
    if (match) {
      return match[1]
    }
  }
  return undefined
}

const takeUnique = <T extends any[]>(values: T): T[number] | undefined => {
  if (values.length !== 1) {
    return undefined
  }
  return values[0]
}

mock.module('@rctf/db', () => {
  return {
    ...schema,
    createDatabase: () => {
      return { client: pgliteClient, db: pgliteDb }
    },
  }
})

mock.module('@rctf/db/util', () => {
  return {
    getErrorConstraint,
    takeUnique,
  }
})

mock.module('@rctf/config', () => {
  const { loadFileConfigs } = require('../../packages/config/src/loader')
  const { ServerConfigSchema } = require('../../packages/config/src/types')
  const config = ServerConfigSchema.parse(loadFileConfigs(testConfigDir)[0])
  return { config }
})

mock.module('../../apps/api/src/util/redis', () => {
  return {
    createRedis: async () => {
      const mockRedisInstance = new RedisMock()
      const typedMockRedis = await loadLuaCommands(mockRedisInstance)
      return typedMockRedis
    },
  }
})

export { pgliteClient, pgliteDb }
