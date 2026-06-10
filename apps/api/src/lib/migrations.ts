import path from 'node:path'
import { config } from '@rctf/config'
import {
  ADVISORY_LOCK_KEYS,
  createDatabase,
  createSingleConnectionClient,
} from '@rctf/db'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type pino from 'pino'

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'packages/db/migrations')

export const runMigrationsOnStartup = async (logger: pino.Logger) => {
  const dbConfig = config.database
  if (!dbConfig.sql) {
    logger.warn('No SQL database configuration found; skipping migrations')
    return
  }

  const { client, db } = createDatabase(dbConfig.sql)
  const lockClient = createSingleConnectionClient(dbConfig.sql)

  logger.info('Running database migrations')
  try {
    const [lock] = await lockClient<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEYS.migrations}::bigint) AS locked
    `
    if (!lock?.locked) {
      logger.info('Another instance is migrating; waiting for the lock')
      await lockClient`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEYS.migrations}::bigint)`
    }
    await migrate(db, { migrationsFolder: path.normalize(MIGRATIONS_FOLDER) })
    logger.info('Database migrations complete')
  } catch (err) {
    logger.error({ err }, 'Database migrations failed')
    throw err
  } finally {
    await Promise.allSettled([lockClient.end(), client.end()])
  }
}
