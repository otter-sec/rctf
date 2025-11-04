import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.RCTF_DATABASE_URL ??
      (() => {
        throw new Error('RCTF_DATABASE_URL must be set for Drizzle commands')
      })(),
  },
  verbose: true,
  strict: true,
})