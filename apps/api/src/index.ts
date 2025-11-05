import { BadEndpoint, ErrorInternal } from '@rctf/types'
import { Hono } from 'hono'
import { pinoLogger } from 'hono-pino'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import pino from 'pino'
import type { AppEnv } from './lib/app-env'
import { appEnvMiddleware } from './middlewares/app-env'
import { routeModules } from './routes'

const app = new Hono<AppEnv>()

// TODO(es3n1n): this is for dev env, for production see
//  https://github.com/maou-shonen/hono-pino#usage
const pinoObject = pino({
  base: null,
  level: 'trace',
  transport: {
    target: 'hono-pino/debug-log',
  },
  timestamp: pino.stdTimeFunctions.epochTime,
})
app.use(
  pinoLogger({
    pino: pinoObject,
  })
)
app.use(appEnvMiddleware)

// TODO(es3n1n): all this stuff should moved to some setup function
for (const { router, handler } of routeModules) {
  app.on(router.definition.method, `/api${router.definition.path}`, handler)
}

// TODO(es3n1n): we need some util to do this instead of manually writing
app.notFound(c =>
  c.json(
    {
      kind: BadEndpoint.kind,
      message: BadEndpoint.message,
      data: null,
    },
    BadEndpoint.status as ContentfulStatusCode
  )
)

app.onError((err, c) => {
  console.error(err)
  return c.json(
    {
      kind: ErrorInternal.kind,
      message: ErrorInternal.message,
      data: null,
    },
    ErrorInternal.status as ContentfulStatusCode
  )
})

export default app

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000)
  pinoObject.info(`Listening on :${port}`)
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}
