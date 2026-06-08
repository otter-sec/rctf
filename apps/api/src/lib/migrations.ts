import path from 'node:path'
import { config } from '@rctf/config'
import { createDatabase, createSingleConnectionClient } from '@rctf/db'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type pino from 'pino'

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'packages/db/migrations')
const MIGRATION_LOCK_KEY = 8836913

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
    await lockClient`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY}::bigint)`
    await migrate(db, { migrationsFolder: path.normalize(MIGRATIONS_FOLDER) })
    logger.info('Database migrations complete')
  } catch (err) {
    logger.error({ err }, 'Database migrations failed')
    throw err
  } finally {
    await lockClient.end()
    await client.end()
  }
}
