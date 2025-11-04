import { createHonoRuntime } from '../lib/honoRuntime'
import type { RouteModule } from '../lib/routeModule'
import type { ApiContext } from '../types'

import registerRouter from './register'

// TODO(es3n1n): Should we collect them dynamically somehow?
const routers = [registerRouter] as const

const createModule = <TRouter extends RouteModule['router']>(
  router: TRouter
): RouteModule => ({
  router,
  handler: router.createHandler(
    createHonoRuntime<ApiContext, TRouter['definition']>()
  ),
})
export const routeModules: RouteModule[] = routers.map(createModule)
