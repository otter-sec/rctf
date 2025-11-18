import { config } from '@rctf/config'
import { BadEndpoint, ErrorInternal } from '@rctf/types'
import { Hono } from 'hono'
import { pinoLogger } from 'hono-pino'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import pino from 'pino'
import type { AppEnv } from './lib/app-env'
import { appEnvMiddleware } from './middlewares/app-env'
import { uploadProvider } from './providers'
import { routeModules } from './routes'
import { startLeaderboardWorker } from './workers'

const app = new Hono<AppEnv>()

const pinoObject = pino({
  level: 'trace',
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
  // Logging the exception for the second time to make sure we capture the stacktrace :shrug:
  c.var.logger.error({ err })
  return c.json(
    {
      kind: ErrorInternal.kind,
      message: ErrorInternal.message,
      data: null,
    },
    ErrorInternal.status as ContentfulStatusCode
  )
})

const main = async () => {
  await uploadProvider.startupWebPart(app)

  if (config.instanceType === 'leaderboard' || config.instanceType === 'all') {
    startLeaderboardWorker(pinoObject)
  }

  if (config.instanceType === 'frontend' || config.instanceType === 'all') {
    const port = Number(process.env.PORT ?? 3000)
    pinoObject.info(`Listening on :${port}`)
    Bun.serve({
      port,
      fetch: app.fetch,
    })
  }
}

export default main
if (import.meta.main) {
  main()
}
