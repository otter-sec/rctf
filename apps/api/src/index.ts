import { config } from '@rctf/config'
import { BadEndpoint, ErrorInternal } from '@rctf/types'
import { Hono, type MiddlewareHandler } from 'hono'
import { pinoLogger } from 'hono-pino'
import { compress } from 'hono/compress'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import pino from 'pino'
import type { AppEnv } from './lib/app-env'
import { runMigrationsOnStartup } from './lib/migrations'
import { appEnvMiddleware } from './middlewares/app-env'
import { dynamicChallengeAuthMiddleware } from './middlewares/dynamic-challenge-auth'
import {
  adminBotProvider,
  analyticsProvider,
  uploadProvider,
} from './providers'
import { routeModules } from './routes'
import { analyticsScriptHandler } from './routes/v2/integrations/routes/get-analytics-script'
import { startDynamicScoresWorker, startLeaderboardWorker } from './workers'

const logger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'info' : 'trace'),
})

const createApp = () => {
  const app = new Hono<AppEnv>()

  if (process.env.NODE_ENV === 'production') {
    app.use(compress())
  }
  app.use(pinoLogger({ pino: logger }))
  app.use(appEnvMiddleware)

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

const registerErrorHandlers = (app: Hono<AppEnv>) => {
  app.notFound(c =>
    c.json(
      { kind: BadEndpoint.kind, message: BadEndpoint.message, data: null },
      BadEndpoint.status as ContentfulStatusCode
    )
  )

  app.onError((err, c) => {
    c.var.logger.error({ err })
    return c.json(
      { kind: ErrorInternal.kind, message: ErrorInternal.message, data: null },
      ErrorInternal.status as ContentfulStatusCode
    )
  })
}

export const setupApp = async () => {
  const app = createApp()

  const badEndpointMiddleware: MiddlewareHandler = async (c, _) => {
    return c.json(
      { kind: BadEndpoint.kind, message: BadEndpoint.message, data: null },
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

  const app = await setupApp()

  if (config.instanceType === 'leaderboard' || config.instanceType === 'all') {
    startLeaderboardWorker(logger)
    startDynamicScoresWorker(logger)
  }

  if (config.instanceType === 'frontend' || config.instanceType === 'all') {
    const port = Number(process.env.PORT ?? 3000)
    logger.info(`Listening on :${port}`)
    Bun.serve({ port, fetch: app.fetch })
  }
}

export default main
if (import.meta.main) {
  main()
}
