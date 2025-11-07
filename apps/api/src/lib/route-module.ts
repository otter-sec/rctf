import type { User } from '@rctf/db'
import { declareRouter as baseDeclareRouter } from '@rctf/types'
import type {
  AnyRouteDefinition,
  DeclaredRoute,
  RouteHandler,
} from '@rctf/types'
import type { Handler } from 'hono'
import type { ApiContext, AppEnv } from './app-env'
import { createTypesRuntime } from './types-runtime'

export type ApiDeclaredRoute<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> = DeclaredRoute<ApiContext, Response, User, TRoute>

export interface RouteModule<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> {
  router: ApiDeclaredRoute<TRoute>
  handler: Handler<AppEnv>
}

export interface RouterGroup {
  readonly routers: ApiDeclaredRoute<any>[]
  declareRouter: <TRoute extends AnyRouteDefinition>(
    definition: TRoute,
    handler: RouteHandler<ApiContext, User, TRoute>
  ) => ApiDeclaredRoute<TRoute>
}

export const createRouterGroup = (): RouterGroup => {
  const routers: ApiDeclaredRoute<any>[] = []
  return {
    routers,
    declareRouter: <TRoute extends AnyRouteDefinition>(
      definition: TRoute,
      handler: RouteHandler<ApiContext, User, TRoute>
    ) => {
      const router = baseDeclareRouter<ApiContext, Response, User, TRoute>(
        definition,
        handler
      )
      routers.push(router)
      return router
    },
  }
}

export const createModule = <TRoute extends AnyRouteDefinition>(
  router: ApiDeclaredRoute<TRoute>
): RouteModule<TRoute> => ({
  router,
  handler: router.createHandler(createTypesRuntime<TRoute>()),
})

export const createModules = (group: RouterGroup): RouteModule[] =>
  group.routers.map(router => createModule(router))
