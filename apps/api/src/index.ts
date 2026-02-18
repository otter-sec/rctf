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
import { adminBotProvider, uploadProvider } from './providers'
import { routeModules } from './routes'
import { startLeaderboardWorker } from './workers'

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

const registerApiRoutes = (app: Hono<AppEnv>) => {
  for (const { router, handler } of routeModules) {
    app.on(router.definition.method, `/api${router.definition.path}`, handler)
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

  // For some context, if we only applied the middleware when admin bot provider is configured, it would still let you
  // fetch existing pending jobs without authentication (e.g. consider someone disabling admin bot temporarily). The /pull
  // endpoint does not require admin bot provider either, and it's safer to just always enforce this.
  // TODO(es3n1n): I don't like doing this, but what are the alternatives
  const adminBotAuthMiddleware: MiddlewareHandler = adminBotProvider
    ? adminBotProvider.authMiddleware
    : async (c, next) => {
        return c.json(
          { kind: BadEndpoint.kind, message: BadEndpoint.message, data: null },
          BadEndpoint.status as ContentfulStatusCode
        )
      }
  app.use('/api/v2/admin/admin-bot/jobs/*', adminBotAuthMiddleware)
  app.use('/api/v2/admin/admin-bot/challenges/*', adminBotAuthMiddleware)

  registerApiRoutes(app)
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
