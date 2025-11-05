import { createTypesRuntime } from '../lib/types-runtime'
import type { AnyRouteDefinition, DeclaredRoute } from '@rctf/types'

import type { RouteModule } from '../lib/route-module'
import type { ApiContext } from '../types'

import registerRouter from './register'
import challsRouter from './challs'

const createModule = <TRoute extends AnyRouteDefinition>(
  router: DeclaredRoute<ApiContext, Response, TRoute>
): RouteModule<TRoute> => ({
  router,
  handler: router.createHandler(createTypesRuntime<ApiContext, TRoute>()),
})

// TODO(es3n1n): Should we collect them dynamically somehow?
export const routeModules = [
  createModule(registerRouter),
  createModule(challsRouter),
]
