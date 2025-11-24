import { z } from 'zod'
import type { Permissions } from '../enums'
import type {
  ResponseBody,
  ResponseDefinition,
  ResponseHelpers,
  ResponseResult,
} from './responses'
import type { HttpMethod, SchemaLike } from './utils'

type ResponseCollection = readonly ResponseDefinition<
  string,
  z.ZodTypeAny | undefined
>[]

type OptionalSchema<T> = T extends SchemaLike ? T : undefined
type SchemaOutput<T extends SchemaLike | undefined> = T extends SchemaLike
  ? z.output<T>
  : undefined
type SchemaInput<T extends SchemaLike | undefined> = T extends SchemaLike
  ? z.input<T>
  : undefined

export interface RouteDefinition<
  TMethod extends HttpMethod = HttpMethod,
  TBody extends SchemaLike | undefined = undefined,
  TResponses extends ResponseCollection = ResponseCollection,
  TParams extends SchemaLike | undefined = undefined,
  TQuery extends SchemaLike | undefined = undefined,
  TAuthRequired extends boolean = boolean,
  TPermissions extends Permissions | undefined = Permissions | undefined,
  TOnlyWhenStarted extends boolean = boolean,
  TOnlyWhenStartedPermissionsBypass extends Permissions | undefined =
    | Permissions
    | undefined,
> {
  readonly method: TMethod
  readonly path: string
  readonly body: TBody
  readonly responses: TResponses
  readonly authRequired: TAuthRequired
  readonly params: TParams
  readonly query: TQuery
  readonly permissions: TPermissions
  readonly onlyWhenStarted: TOnlyWhenStarted
  readonly onlyWhenStartedPermissionsBypass: TOnlyWhenStartedPermissionsBypass
}

type RouteConfig = {
  method: HttpMethod
  path: string
  responses: ResponseCollection
  authRequired?: boolean
  body?: SchemaLike
  params?: SchemaLike
  query?: SchemaLike
  permissions?: Permissions
  onlyWhenStarted?: boolean
  onlyWhenStartedPermissionsBypass?: Permissions
}

type NormalizedAuthRequired<TDefinition extends RouteConfig> =
  TDefinition['authRequired'] extends boolean
    ? TDefinition['authRequired']
    : false

type NormalizedPermissions<TDefinition extends RouteConfig> =
  TDefinition['permissions'] extends Permissions
    ? TDefinition['permissions']
    : undefined

type NormalizedOnlyWhenStarted<TDefinition extends RouteConfig> =
  TDefinition['onlyWhenStarted'] extends boolean
    ? TDefinition['onlyWhenStarted']
    : false

type NormalizedOnlyWhenStartedPermissionsBypass<
  TDefinition extends RouteConfig,
> = TDefinition['onlyWhenStartedPermissionsBypass'] extends Permissions
  ? TDefinition['onlyWhenStartedPermissionsBypass']
  : undefined

export function defineRoute<TDefinition extends RouteConfig>(
  definition: TDefinition
): RouteDefinition<
  TDefinition['method'],
  OptionalSchema<TDefinition['body']>,
  TDefinition['responses'],
  OptionalSchema<TDefinition['params']>,
  OptionalSchema<TDefinition['query']>,
  NormalizedAuthRequired<TDefinition>,
  NormalizedPermissions<TDefinition>,
  NormalizedOnlyWhenStarted<TDefinition>,
  NormalizedOnlyWhenStartedPermissionsBypass<TDefinition>
> {
  const {
    method,
    path,
    responses,
    authRequired = false,
    body,
    params,
    query,
    permissions,
    onlyWhenStarted,
    onlyWhenStartedPermissionsBypass,
  } = definition

  return {
    method,
    path,
    responses,
    onlyWhenStarted: (onlyWhenStarted ??
      false) as NormalizedOnlyWhenStarted<TDefinition>,
    onlyWhenStartedPermissionsBypass: (onlyWhenStartedPermissionsBypass ??
      undefined) as NormalizedOnlyWhenStartedPermissionsBypass<TDefinition>,
    authRequired: (authRequired ??
      false) as NormalizedAuthRequired<TDefinition>,
    body: (body ?? undefined) as OptionalSchema<TDefinition['body']>,
    params: (params ?? undefined) as OptionalSchema<TDefinition['params']>,
    query: (query ?? undefined) as OptionalSchema<TDefinition['query']>,
    permissions: (permissions ??
      undefined) as NormalizedPermissions<TDefinition>,
  }
}

export type AnyRouteDefinition = RouteDefinition<
  HttpMethod,
  SchemaLike | undefined,
  ResponseCollection,
  SchemaLike | undefined,
  SchemaLike | undefined
>

export type RouteBody<TRoute extends AnyRouteDefinition> = SchemaOutput<
  TRoute['body']
>

export type RouteBodyInput<TRoute extends AnyRouteDefinition> = SchemaInput<
  TRoute['body']
>

export type RouteParams<TRoute extends AnyRouteDefinition> = SchemaOutput<
  TRoute['params']
>

export type RouteParamsInput<TRoute extends AnyRouteDefinition> = SchemaInput<
  TRoute['params']
>

export type RouteQuery<TRoute extends AnyRouteDefinition> = SchemaOutput<
  TRoute['query']
>

export type RouteQueryInput<TRoute extends AnyRouteDefinition> = SchemaInput<
  TRoute['query']
>

export type RoutePermissions<TRoute extends AnyRouteDefinition> =
  TRoute['permissions']

type RouteRequiresAuth<TRoute extends AnyRouteDefinition> =
  TRoute['authRequired'] extends true
    ? true
    : TRoute['permissions'] extends Permissions
      ? true
      : false

type RouteAuthFields<TRoute extends AnyRouteDefinition, TUser> =
  RouteRequiresAuth<TRoute> extends true ? { user: TUser } : {}

export type RouteHandlerContext<
  TContext,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = {
  context: TContext
  params: RouteParams<TRoute>
  query: RouteQuery<TRoute>
  permissions: RoutePermissions<TRoute>
} & RouteAuthFields<TRoute, TUser>

export type RouteHandlerArgs<
  TContext,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = {
  res: ResponseHelpers<TRoute['responses']>
  body: RouteBody<TRoute>
  params: RouteParams<TRoute>
  query: RouteQuery<TRoute>
  ctx: TContext
  permissions: RoutePermissions<TRoute>
} & RouteAuthFields<TRoute, TUser>

export type RouteHandler<
  TContext,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = (
  args: RouteHandlerArgs<TContext, TUser, TRoute>
) => RouteHandlerResult<TRoute> | Promise<RouteHandlerResult<TRoute>>

export type RouteHandlerResult<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = ResponseResult<TRoute['responses'][number]>

export type RouteValidationSource = 'body' | 'query' | 'params'

type ExtractSuccessResponse<TResponses extends ResponseCollection> = Extract<
  TResponses[number],
  ResponseDefinition<`good${string}`, z.ZodTypeAny | undefined>
>

type SuccessResponseData<TDefinition> =
  TDefinition extends ResponseDefinition<string, infer TSchema>
    ? TSchema extends z.ZodTypeAny
      ? z.output<TSchema>
      : void
    : void

export type RouteResponseData<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = SuccessResponseData<ExtractSuccessResponse<TRoute['responses']>>

export type RouteResponse<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = ResponseBody<TRoute['responses'][number]>
