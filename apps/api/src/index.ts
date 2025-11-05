import { Hono } from 'hono'
import type { AppEnv } from './types'
import { routeModules } from './routes'
import { BadEndpoint, ErrorInternal } from '@rctf/types'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

const app = new Hono<AppEnv>()

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
  console.log(`API listening on http://localhost:${port}`)
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}
