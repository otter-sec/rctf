import { config } from '@rctf/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials:
    typeof config.database.sql === 'string'
      ? {
          url: config.database.sql,
        }
      : {
          host: config.database.sql.host,
          port: config.database.sql.port,
          user: config.database.sql.user,
          password: config.database.sql.password,
          database: config.database.sql.database,
        },
  verbose: true,
  strict: true,
})
