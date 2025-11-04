import type { Handler } from 'hono'
import type { AnyRouteDefinition, DeclaredRoute } from '@rctf/types'

import type { ApiContext, AppEnv } from '../types'

export interface RouteModule {
  router: DeclaredRoute<ApiContext, Response, AnyRouteDefinition>
  handler: Handler<AppEnv>
}
