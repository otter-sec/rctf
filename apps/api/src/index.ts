import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import { db } from '@rctf/db'

import { config } from './config'
import type { AppEnv } from './types'
import { authRoutes } from './routes/auth'
import { usersRoutes } from './routes/users'

const app = new Hono<AppEnv>()

app.use('*', logger())
app.use('*', prettyJSON())

app.use('*', async (c, next) => {
  c.set('db', db)
  return next()
})

app.get('/healthz', c => c.json({ ok: true }))

app.route('/auth', authRoutes)
app.route('/users', usersRoutes)

app.notFound(c => c.json({ message: 'Not Found' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json({ message: err.message ?? 'Internal Server Error' }, 500)
})

export default app

if (import.meta.main) {
  const port = config.port
  console.log(`Starting API server on port ${port}`)
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}
