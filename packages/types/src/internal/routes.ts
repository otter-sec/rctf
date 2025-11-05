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
  TQuery extends SchemaLike | undefined = undefined
> {
  readonly method: TMethod
  readonly path: string
  readonly body: TBody
  readonly responses: TResponses
  readonly authRequired: boolean
  readonly params: TParams
  readonly query: TQuery
  readonly permissions: Permissions | undefined
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

export function defineRoute<TDefinition extends RouteConfig>(
  definition: TDefinition
): RouteDefinition<
  TDefinition['method'],
  OptionalSchema<TDefinition['body']>,
  TDefinition['responses'],
  OptionalSchema<TDefinition['params']>,
  OptionalSchema<TDefinition['query']>
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
    authRequired,
    body: (body ?? undefined) as OptionalSchema<TDefinition['body']>,
    params: (params ?? undefined) as OptionalSchema<TDefinition['params']>,
    query: (query ?? undefined) as OptionalSchema<TDefinition['query']>,
    permissions: permissions ?? undefined,
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

export interface RouteHandlerContext<
  TContext,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> {
  context: TContext
  auth?: unknown
  params: RouteParams<TRoute>
  query: RouteQuery<TRoute>
  permissions: RoutePermissions<TRoute>
}

export interface RouteHandlerArgs<
  TContext,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> {
  res: ResponseHelpers<TRoute['responses']>
  body: RouteBody<TRoute>
  params: RouteParams<TRoute>
  query: RouteQuery<TRoute>
  auth: RouteHandlerContext<TContext, TRoute>['auth']
  context: RouteHandlerContext<TContext, TRoute>
  permissions: RoutePermissions<TRoute>
}

export type RouteHandler<
  TContext,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> = (
  args: RouteHandlerArgs<TContext, TRoute>
) => RouteHandlerResult<TRoute> | Promise<RouteHandlerResult<TRoute>>

export type RouteHandlerResult<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> = ResponseResult<TRoute['responses'][number]>

export type RouteValidationSource = 'body' | 'query' | 'params'

export interface RouteRuntime<
  TContext,
  TResult,
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
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
  ensureAuth: (
    context: TContext,
    permissions: Permissions | undefined
  ) => Promise<unknown>
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
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
> {
  readonly definition: TRoute
  readonly handler: RouteHandler<TContext, TRoute>
  createHandler(
    runtime: RouteRuntime<TContext, TResult, TRoute>
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
  TRoute extends AnyRouteDefinition = AnyRouteDefinition
>(
  definition: TRoute,
  handler: RouteHandler<TContext, TRoute>
): DeclaredRoute<TContext, TResult, TRoute> => {
  const responders = buildResponders(definition.responses)

  const createHandler =
    (
      runtime: RouteRuntime<TContext, TResult, TRoute>
    ): RouteExecutor<TContext, TResult> =>
    async context => {
      const executionContext: RouteHandlerContext<TContext, typeof definition> =
        {
          context,
          params: undefined as RouteParams<typeof definition>,
          query: undefined as RouteQuery<typeof definition>,
          permissions: definition.permissions ?? undefined,
        }

      if (definition.authRequired || (definition.permissions ?? 0) != 0) {
        executionContext.auth = await runtime.ensureAuth(
          context,
          definition.permissions
        )
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

      const malformedBodyHandler = runtime.handleMalformedBody
      const bodyOutcome = await parseSection(
        'body',
        definition.body,
        runtime.readBody,
        error => malformedBodyHandler(context, error)
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

      const handlerArgs: RouteHandlerArgs<TContext, typeof definition> = {
        res: responders,
        body: parsedBody,
        params: parsedParams,
        query: parsedQuery,
        auth: executionContext.auth,
        context: executionContext,
        permissions: executionContext.permissions,
      }

      const routeResult = await handler(handlerArgs)
      return await runtime.send(context, routeResult)
    }

  return {
    definition,
    handler,
    createHandler,
  }
}
