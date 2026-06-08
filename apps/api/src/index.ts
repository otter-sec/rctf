import { config } from '@rctf/config'
import { BadEndpoint, ErrorInternal } from '@rctf/types'
import { Hono, type MiddlewareHandler } from 'hono'
import { pinoLogger } from 'hono-pino'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import pino from 'pino'
import type { AppEnv } from './lib/app-env'
import { runMigrationsOnStartup } from './lib/migrations'
import { appEnvMiddleware, client, redis } from './middlewares/app-env'
import { dynamicChallengeAuthMiddleware } from './middlewares/dynamic-challenge-auth'
import {
  adminBotProvider,
  analyticsProvider,
  uploadProvider,
} from './providers'
import { routeModules } from './routes'
import { analyticsScriptHandler } from './routes/v2/integrations/routes/get-analytics-script'
import { startLeaderboardWorker, stopWorkers } from './workers'

const logger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'info' : 'trace'),
})

const createApp = (healthOnly: boolean) => {
  const app = new Hono<AppEnv>()

  registerHealthRoutes(app)
  if (!healthOnly) {
    app.use(pinoLogger({ pino: logger }))
    app.use(appEnvMiddleware)
  }

  return app
}

const registerApiRoutes = (
  app: Hono<AppEnv>,
  serviceAuth: Partial<Record<string, MiddlewareHandler>>
) => {
  for (const { router, handler } of routeModules) {
    const path = `/api${router.definition.path}`
    const middlewareName = router.definition.serviceAuth
    const middleware = middlewareName
      ? serviceAuth[router.definition.serviceAuth]
      : undefined

    if (middlewareName && !middleware) {
      throw new Error(`Unsupported API middleware: ${middlewareName}`)
    }

    if (middleware) {
      app.on(router.definition.method, path, middleware, handler)
    } else {
      app.on(router.definition.method, path, handler)
    }
  }
}

export const registerHealthRoutes = (app: Hono<AppEnv>): void => {
  app.get('/api/healthz', c => c.text('ok'))
  app.get('/api/readyz', async c => {
    const [dbOk, redisOk] = await Promise.all([
      client`SELECT 1`.then(() => true).catch(() => false),
      redis
        .ping()
        .then(pong => pong === 'PONG')
        .catch(() => false),
    ])

    if (!dbOk) {
      return c.text('unhealthy db', 503)
    }

    if (!redisOk) {
      return c.text('unhealthy redis', 503)
    }

    return c.text('ok')
  })
}

const registerErrorHandlers = (app: Hono<AppEnv>) => {
  app.notFound(c =>
    c.json(
      { kind: BadEndpoint.kind, message: BadEndpoint.message },
      BadEndpoint.status as ContentfulStatusCode
    )
  )

  app.onError((err, c) => {
    c.var.logger.error({ err })
    return c.json(
      { kind: ErrorInternal.kind, message: ErrorInternal.message },
      ErrorInternal.status as ContentfulStatusCode
    )
  })
}

export const setupApp = async () => {
  const app = createApp(false)

  const badEndpointMiddleware: MiddlewareHandler = async (c, _) => {
    return c.json(
      { kind: BadEndpoint.kind, message: BadEndpoint.message },
      BadEndpoint.status as ContentfulStatusCode
    )
  }

  app.get(
    '/api/v2/integrations/analytics/script',
    analyticsProvider ? analyticsScriptHandler : badEndpointMiddleware
  )
  registerApiRoutes(app, {
    adminBot: adminBotProvider?.authMiddleware || badEndpointMiddleware,
    dynamicChallenge: dynamicChallengeAuthMiddleware,
  })
  await uploadProvider.startupWebPart(app)
  if (adminBotProvider) {
    await adminBotProvider.startupWebPart(app)
  }
  registerErrorHandlers(app)

  return app
}

const main = async () => {
  if (config.database?.migrate !== 'never') {
    await runMigrationsOnStartup(logger)
    if (config.database?.migrate === 'only') {
      return
    }
  }

  if (config.instanceType === 'leaderboard' || config.instanceType === 'all') {
    startLeaderboardWorker(logger)
  }

  const app =
    config.instanceType != 'leaderboard' ? await setupApp() : createApp(true)

  const port = Number(process.env.PORT ?? 3000)
  logger.info(`Listening on :${port}`)

  const server = Bun.serve({
    port,
    fetch: app.fetch,
    idleTimeout: config.idleTimeout,
  })

  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    logger.info({ signal }, 'shutting down')

    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out; forcing exit')
      process.exit(1)
    }, config.shutdownTimeout)
    forceExit.unref?.()

    try {
      await server.stop()
    } catch (err) {
      logger.error({ err }, 'error stopping server')
    }
    try {
      await stopWorkers()
    } catch (err) {
      logger.error({ err }, 'error stopping workers')
    }

    clearTimeout(forceExit)
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

export default main
if (import.meta.main) {
  main()
}
