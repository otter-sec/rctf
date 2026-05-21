import { z } from 'zod/mini'
import type { Permissions, ProtectedAction } from '../enums'
import type {
  ResponseBody,
  ResponseDefinition,
  ResponseHelpers,
  ResponseResult,
} from './responses'
import type { HttpMethod, Infer, InferInput, Schema } from './utils'

export type BodyFormat = 'json' | 'form-data'
export type ResponseCollection = readonly ResponseDefinition[]

export interface RouteConfig {
  method: HttpMethod
  path: string
  goodResponses: ResponseCollection
  badResponses?: ResponseCollection
  authRequired?: boolean
  optionalAuth?: boolean
  body?: Schema
  params?: Schema
  query?: Schema
  permissions?: Permissions
  onlyWhenStarted?: boolean
  onlyWhenStartedPermissionsBypass?: Permissions
  onlyWhenNotFinished?: boolean
  rejectBanned?: boolean
  returnBodyAsIs?: boolean
  bodyFormat?: BodyFormat
  captchaAction?: ProtectedAction
  serviceAuth?: 'adminBot'
}

export interface RouteDefinition<T extends RouteConfig = RouteConfig> {
  readonly method: T['method']
  readonly path: string
  readonly body: T['body']
  readonly goodResponses: T['goodResponses']
  readonly badResponses: T['badResponses'] extends ResponseCollection
    ? T['badResponses']
    : readonly []
  readonly authRequired: T['authRequired'] extends boolean
    ? T['authRequired']
    : false
  readonly optionalAuth: T['optionalAuth'] extends boolean
    ? T['optionalAuth']
    : false
  readonly params: T['params']
  readonly query: T['query']
  readonly permissions: T['permissions']
  readonly onlyWhenStarted: T['onlyWhenStarted'] extends boolean
    ? T['onlyWhenStarted']
    : false
  readonly onlyWhenStartedPermissionsBypass: T['onlyWhenStartedPermissionsBypass']
  readonly onlyWhenNotFinished: T['onlyWhenNotFinished'] extends boolean
    ? T['onlyWhenNotFinished']
    : false
  readonly rejectBanned: T['rejectBanned'] extends boolean
    ? T['rejectBanned']
    : false
  readonly returnBodyAsIs: T['returnBodyAsIs'] extends boolean
    ? T['returnBodyAsIs']
    : false
  readonly bodyFormat: T['bodyFormat'] extends BodyFormat
    ? T['bodyFormat']
    : 'json'
  readonly captchaAction: T['captchaAction']
  readonly serviceAuth: T['serviceAuth']
}

export function defineRoute<const T extends RouteConfig>(
  config: T
): RouteDefinition<T> {
  return {
    method: config.method,
    path: config.path,
    body: config.body,
    goodResponses: config.goodResponses,
    badResponses: (config.badResponses ??
      []) as RouteDefinition<T>['badResponses'],
    authRequired: (config.authRequired ??
      false) as RouteDefinition<T>['authRequired'],
    optionalAuth: (config.optionalAuth ??
      false) as RouteDefinition<T>['optionalAuth'],
    params: config.params,
    query: config.query,
    permissions: config.permissions,
    onlyWhenStarted: (config.onlyWhenStarted ??
      false) as RouteDefinition<T>['onlyWhenStarted'],
    onlyWhenStartedPermissionsBypass: config.onlyWhenStartedPermissionsBypass,
    onlyWhenNotFinished: (config.onlyWhenNotFinished ??
      false) as RouteDefinition<T>['onlyWhenNotFinished'],
    rejectBanned: (config.rejectBanned ??
      false) as RouteDefinition<T>['rejectBanned'],
    returnBodyAsIs: (config.returnBodyAsIs ??
      false) as RouteDefinition<T>['returnBodyAsIs'],
    bodyFormat: (config.bodyFormat ??
      'json') as RouteDefinition<T>['bodyFormat'],
    captchaAction: config.captchaAction,
    serviceAuth: config.serviceAuth,
  } as RouteDefinition<T>
}

export type AnyRouteDefinition = RouteDefinition<any>
type AllResponses<T extends AnyRouteDefinition> = readonly [
  ...T['goodResponses'],
  ...T['badResponses'],
]

export type RouteBody<T extends AnyRouteDefinition> = Infer<T['body']>
export type RouteBodyInput<T extends AnyRouteDefinition> = InferInput<T['body']>
export type RouteParams<T extends AnyRouteDefinition> = Infer<T['params']>
export type RouteParamsInput<T extends AnyRouteDefinition> = InferInput<
  T['params']
>
export type RouteQuery<T extends AnyRouteDefinition> = Infer<T['query']>
export type RouteQueryInput<T extends AnyRouteDefinition> = InferInput<
  T['query']
>
export type RoutePermissions<T extends AnyRouteDefinition> = T['permissions']
export type RouteBodyFormat<T extends AnyRouteDefinition> = T['bodyFormat']

type RequiresAuth<T extends AnyRouteDefinition> = T['authRequired'] extends true
  ? true
  : T['permissions'] extends Permissions
    ? true
    : false

type HasOptionalAuth<T extends AnyRouteDefinition> =
  T['optionalAuth'] extends true ? true : false

type AuthFields<T extends AnyRouteDefinition, TUser> =
  RequiresAuth<T> extends true
    ? { user: TUser }
    : HasOptionalAuth<T> extends true
      ? { user: TUser | undefined }
      : {}

export type RouteHandlerContext<
  TContext,
  TUser,
  T extends AnyRouteDefinition = AnyRouteDefinition,
> = {
  context: TContext
  params: RouteParams<T>
  query: RouteQuery<T>
  permissions: RoutePermissions<T>
} & AuthFields<T, TUser>

export type RouteHandlerArgs<
  TContext,
  TUser,
  T extends AnyRouteDefinition = AnyRouteDefinition,
> = {
  res: ResponseHelpers<[...T['goodResponses'], ...T['badResponses']]>
  body: RouteBody<T>
  params: RouteParams<T>
  query: RouteQuery<T>
  ctx: TContext
  permissions: RoutePermissions<T>
} & AuthFields<T, TUser>

export type RouteHandler<
  TContext,
  TUser,
  T extends AnyRouteDefinition = AnyRouteDefinition,
> = (
  args: RouteHandlerArgs<TContext, TUser, T>
) => RouteHandlerResult<T> | Promise<RouteHandlerResult<T>>

export type RouteHandlerResult<
  T extends AnyRouteDefinition = AnyRouteDefinition,
> = ResponseResult<AllResponses<T>[number]>

export type RouteValidationSource = 'body' | 'query' | 'params'

export type RouteSuccessResponse<
  T extends AnyRouteDefinition = AnyRouteDefinition,
> = ResponseBody<T['goodResponses'][number]>

export type RouteErrorResponse<
  T extends AnyRouteDefinition = AnyRouteDefinition,
> = ResponseBody<T['badResponses'][number]>

export type RouteResponseData<
  T extends AnyRouteDefinition = AnyRouteDefinition,
> =
  T['goodResponses'][number] extends ResponseDefinition<string, infer TSchema>
    ? TSchema extends z.ZodMiniType<any, any>
      ? z.output<TSchema>
      : void
    : void

export type RouteResponse<T extends AnyRouteDefinition = AnyRouteDefinition> =
  ResponseBody<AllResponses<T>[number]>
