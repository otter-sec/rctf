import { z } from 'zod'
import type { Permissions } from '../enums'
import type {
  ResponseDefinition,
  ResponseHelper,
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

export interface RouteDefinition<
  TMethod extends HttpMethod = HttpMethod,
  TBody extends SchemaLike | undefined = undefined,
  TResponses extends ResponseCollection = ResponseCollection,
  TParams extends SchemaLike | undefined = undefined,
  TQuery extends SchemaLike | undefined = undefined,
  TAuthRequired extends boolean = boolean,
  TPermissions extends Permissions | undefined = Permissions | undefined,
> {
  readonly method: TMethod
  readonly path: string
  readonly body: TBody
  readonly responses: TResponses
  readonly authRequired: TAuthRequired
  readonly params: TParams
  readonly query: TQuery
  readonly permissions: TPermissions
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
}

type NormalizedAuthRequired<TDefinition extends RouteConfig> =
  TDefinition['authRequired'] extends boolean
    ? TDefinition['authRequired']
    : false

type NormalizedPermissions<TDefinition extends RouteConfig> =
  TDefinition['permissions'] extends Permissions
    ? TDefinition['permissions']
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
  NormalizedPermissions<TDefinition>
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
  } = definition

  return {
    method,
    path,
    responses,
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

export type RouteParams<TRoute extends AnyRouteDefinition> = SchemaOutput<
  TRoute['params']
>

export type RouteQuery<TRoute extends AnyRouteDefinition> = SchemaOutput<
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

type MutableRouteHandlerContext<
  TContext,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = {
  context: TContext
  user?: TUser
  params: RouteParams<TRoute>
  query: RouteQuery<TRoute>
  permissions: RoutePermissions<TRoute>
}

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

export interface RouteRuntime<
  TContext,
  TResult,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> {
  readBody: (context: TContext) => Promise<unknown>
  readParams: (context: TContext) => Promise<unknown>
  readQuery: (context: TContext) => Promise<unknown>
  handleMalformedBody: (
    context: TContext,
    error: unknown
  ) => TResult | Promise<TResult>
  handleValidationError: (
    src: RouteValidationSource,
    context: TContext,
    error: z.ZodError<unknown>
  ) => TResult | Promise<TResult>
  ensureAuth: (context: TContext) => Promise<TUser | undefined>
  ensurePerms: (user: TUser, permissions: Permissions) => Promise<boolean>
  handleUnauthorized: (context: TContext) => Promise<TResult>
  handleAccessDenied: (context: TContext) => Promise<TResult>
  send: (
    context: TContext,
    result: RouteHandlerResult<TRoute>
  ) => TResult | Promise<TResult>
}

export type RouteExecutor<TContext, TResult> = (
  context: TContext
) => Promise<TResult>

export interface DeclaredRoute<
  TContext,
  TResult,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> {
  readonly definition: TRoute
  readonly handler: RouteHandler<TContext, TUser, TRoute>
  createHandler(
    runtime: RouteRuntime<TContext, TResult, TUser, TRoute>
  ): RouteExecutor<TContext, TResult>
}

const buildResponders = <TResponses extends ResponseCollection>(
  responses: TResponses
): ResponseHelpers<TResponses> => {
  const responders = Object.create(null) as Record<string, ResponseHelper<any>>

  for (const definition of responses) {
    const helper: ResponseHelper<typeof definition> = (payload?: unknown) => {
      // TODO(es3n1n): Running parse two times per call definitely adds some overhead
      const data = definition.dataSchema
        ? definition.dataSchema.parse(payload)
        : null

      return {
        status: definition.status,
        body: definition.schema.parse({
          kind: definition.kind,
          message: definition.message,
          data,
        }),
        definition,
      }
    }

    responders[definition.kind] = helper
  }

  return responders as ResponseHelpers<TResponses>
}

enum ParseState {
  Skipped = 0,
  Success = 1,
  Error = 2,
}

type ParseOutcome<TSchema extends SchemaLike | undefined, TResult> =
  | { state: ParseState.Skipped; value: undefined }
  | { state: ParseState.Success; value: SchemaOutput<TSchema> }
  | { state: ParseState.Error; result: TResult }

export const declareRouter = <
  TContext,
  TResult,
  TUser,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
>(
  definition: TRoute,
  handler: RouteHandler<TContext, TUser, TRoute>
): DeclaredRoute<TContext, TResult, TUser, TRoute> => {
  const responders = buildResponders(definition.responses)

  const createHandler =
    (
      runtime: RouteRuntime<TContext, TResult, TUser, TRoute>
    ): RouteExecutor<TContext, TResult> =>
    async context => {
      const executionContext: MutableRouteHandlerContext<
        TContext,
        TUser,
        typeof definition
      > = {
        context,
        params: undefined as RouteParams<typeof definition>,
        query: undefined as RouteQuery<typeof definition>,
        permissions: definition.permissions ?? undefined,
      }

      const requiresAuth =
        definition.authRequired || (definition.permissions ?? 0) != 0

      if (requiresAuth) {
        executionContext.user = await runtime.ensureAuth(context)
        if (!executionContext.user) {
          return await runtime.handleUnauthorized(context)
        }

        if (
          definition.permissions &&
          !(await runtime.ensurePerms(
            executionContext.user,
            definition.permissions
          ))
        ) {
          return await runtime.handleAccessDenied(context)
        }
      }

      const handleResponseIssue = async (
        error: z.ZodError<unknown>
      ): Promise<TResult | undefined> => {
        for (const issue of error.issues) {
          const scopedIssue = issue as z.ZodIssue & {
            params?: Record<string, unknown>
          }
          if (!scopedIssue.params) {
            continue
          }

          const response = scopedIssue.params.response
          if (!response) {
            continue
          }

          const kind = (response as { kind: string })
            .kind as keyof typeof responders
          const responder = responders[kind]
          if (!responder) {
            continue
          }

          const routeResult = (
            responder as () => ResponseResult<any>
          )() as ResponseResult<any>
          return await runtime.send(context, routeResult)
        }

        return undefined
      }

      const parseSection = async <TSchema extends SchemaLike | undefined>(
        source: RouteValidationSource,
        schema: TSchema,
        reader: (ctx: TContext) => Promise<unknown>,
        onReadError?: (error: unknown) => TResult | Promise<TResult>
      ): Promise<ParseOutcome<TSchema, TResult>> => {
        if (!schema) {
          return { state: ParseState.Skipped, value: undefined }
        }

        let raw: unknown
        try {
          raw = await reader(context)
        } catch (error) {
          if (!onReadError) {
            throw error
          }

          return {
            state: ParseState.Error,
            result: await onReadError(error),
          }
        }

        const result = schema.safeParse(raw)
        if (!result.success) {
          const responseResult = await handleResponseIssue(result.error)
          if (responseResult !== undefined) {
            return {
              state: ParseState.Error,
              result: responseResult,
            }
          }

          return {
            state: ParseState.Error,
            result: await runtime.handleValidationError(
              source,
              context,
              result.error
            ),
          }
        }

        return {
          state: ParseState.Success,
          value: result.data as SchemaOutput<TSchema>,
        }
      }

      const bodyOutcome = await parseSection(
        'body',
        definition.body,
        runtime.readBody,
        error => runtime.handleMalformedBody(context, error)
      )
      if (bodyOutcome.state === ParseState.Error) {
        return bodyOutcome.result
      }

      const paramsOutcome = await parseSection(
        'params',
        definition.params,
        runtime.readParams
      )
      if (paramsOutcome.state === ParseState.Error) {
        return paramsOutcome.result
      }

      const queryOutcome = await parseSection(
        'query',
        definition.query,
        runtime.readQuery
      )
      if (queryOutcome.state === ParseState.Error) {
        return queryOutcome.result
      }

      const parsedBody = bodyOutcome.value as RouteBody<typeof definition>
      const parsedParams = paramsOutcome.value as RouteParams<typeof definition>
      const parsedQuery = queryOutcome.value as RouteQuery<typeof definition>

      executionContext.params = parsedParams
      executionContext.query = parsedQuery

      const handlerArgsBase = {
        res: responders,
        body: parsedBody,
        params: parsedParams,
        query: parsedQuery,
        ctx: executionContext.context,
        permissions: executionContext.permissions,
      }

      const handlerArgs = (
        requiresAuth
          ? { ...handlerArgsBase, user: executionContext.user as TUser }
          : handlerArgsBase
      ) as RouteHandlerArgs<TContext, TUser, typeof definition>

      const routeResult = await handler(handlerArgs)
      return await runtime.send(context, routeResult)
    }

  return {
    definition,
    handler,
    createHandler,
  }
}
