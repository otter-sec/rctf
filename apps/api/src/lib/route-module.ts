import type { Handler } from 'hono'
import type { AnyRouteDefinition, DeclaredRoute } from '@rctf/types'

import type { ApiContext, AppEnv } from '../types'

export interface RouteModule<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> {
  router: DeclaredRoute<ApiContext, Response, TRoute>
  handler: Handler<AppEnv>
}
