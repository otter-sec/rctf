import type { User } from '@rctf/db'
import type { AnyRouteDefinition, RouteHandler } from '@rctf/types'
import type { Handler } from 'hono'
import type { ApiContext, AppEnv } from './app-env'
import type { DeclaredRoute } from './router'
import { declareRouter } from './router'

export type ApiDeclaredRoute<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = DeclaredRoute<TRoute>

export interface RouteModule<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> {
  router: ApiDeclaredRoute<TRoute>
  handler: Handler<AppEnv>
}

export interface RouterGroup {
  readonly routers: ApiDeclaredRoute<any>[]
  route: <TRoute extends AnyRouteDefinition>(
    definition: TRoute,
    handler: RouteHandler<ApiContext, User, TRoute>
  ) => ApiDeclaredRoute<TRoute>
}

export const createRouterGroup = (): RouterGroup => {
  const routers: ApiDeclaredRoute<any>[] = []
  return {
    routers,
    route: <TRoute extends AnyRouteDefinition>(
      definition: TRoute,
      handler: RouteHandler<ApiContext, User, TRoute>
    ) => {
      const router = declareRouter<TRoute>(definition, handler)
      routers.push(router)
      return router
    },
  }
}

export const createModule = <TRoute extends AnyRouteDefinition>(
  router: ApiDeclaredRoute<TRoute>
): RouteModule<TRoute> => ({
  router,
  handler: router.createHandler(),
})

export const createModules = (group: RouterGroup): RouteModule[] =>
  group.routers.map(router => createModule(router))
