import { Hono } from 'hono'
import type { AppEnv } from './types'
import { routeModules } from './routes'

const app = new Hono<AppEnv>()

// TODO(es3n1n): all this stuff should moved to some setup function
for (const { router, handler } of routeModules) {
  app.on(router.definition.method, router.definition.path, handler)
}

// TODO(es3n1n): should use the actual schema
app.notFound(c =>
  c.json(
    {
      kind: 'NotFound',
      message: 'Resource not found',
    },
    404
  )
)

// TODO(es3n1n): should use the actual schema
app.onError((err, c) => {
  console.error(err)
  return c.json(
    {
      kind: 'InternalError',
      message: 'Internal Server Error',
    },
    500
  )
})

export default app

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000)
  console.log(`API listening on http://localhost:${port}`)
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}
