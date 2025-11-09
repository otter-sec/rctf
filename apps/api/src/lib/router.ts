import type { User } from '@rctf/db'
import type {
  AnyRouteDefinition,
  Permissions,
  ResponseDefinition,
  ResponseHelper,
  ResponseHelpers,
  ResponseResult,
  RouteBody,
  RouteHandler,
  RouteHandlerArgs,
  RouteParams,
  RoutePermissions,
  RouteQuery,
  RouteValidationSource,
  SchemaLike,
} from '@rctf/types'
import { BadBody, BadJson, BadPerms, BadToken } from '@rctf/types'
import type { Handler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'
import { getUser } from '../services/users'
import type { ApiContext, AppEnv } from './app-env'
import { parseToken, TokenKind } from './tokens'

const AUTH_PREFIX = 'Bearer '
type JsonLike = Record<string, unknown>

type ResponseCollection = readonly ResponseDefinition<
  string,
  z.ZodTypeAny | undefined
>[]

type SchemaOutput<T extends SchemaLike | undefined> = T extends SchemaLike
  ? z.output<T>
  : undefined

type RouteRequiresAuth<TRoute extends AnyRouteDefinition> =
  TRoute['authRequired'] extends true
    ? true
    : TRoute['permissions'] extends Permissions
      ? true
      : false

type MutableRouteHandlerContext<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> = {
  context: ApiContext
  user?: User
  params: RouteParams<TRoute>
  query: RouteQuery<TRoute>
  permissions: RoutePermissions<TRoute>
}

export interface DeclaredRoute<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> {
  readonly definition: TRoute
  readonly handler: RouteHandler<ApiContext, User, TRoute>
  createHandler(): Handler<AppEnv>
}

const buildResponders = <TResponses extends ResponseCollection>(
  responses: TResponses
): ResponseHelpers<TResponses> => {
  const responders = Object.create(null) as Record<string, ResponseHelper<any>>

  for (const definition of responses) {
    const helper: ResponseHelper<typeof definition> = (payload?: unknown) => {
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

type ParseOutcome<TSchema extends SchemaLike | undefined> =
  | { state: ParseState.Skipped; value: undefined }
  | { state: ParseState.Success; value: SchemaOutput<TSchema> }
  | { state: ParseState.Error; result: Response }

const malformedJson = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadJson.kind,
    message: BadJson.message,
    data: null,
  },
  BadJson.status as ContentfulStatusCode,
]

const validationError = (
  src: RouteValidationSource,
  error: z.ZodError<unknown>
): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadBody.kind,
    message: BadBody.message,
    data: {
      reason:
        error.issues.length > 0
          ? `${src}:${error.issues[0]?.path.join('.')}: ${
              error.issues[0]?.message
            }`
          : null,
    },
  },
  BadBody.status as ContentfulStatusCode,
]

const accessDenied = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadPerms.kind,
    message: BadPerms.message,
    data: null,
  },
  BadPerms.status as ContentfulStatusCode,
]

const unauthorized = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadToken.kind,
    message: BadToken.message,
    data: null,
  },
  BadToken.status as ContentfulStatusCode,
]

const ensureAuth = async (context: ApiContext): Promise<User | undefined> => {
  const authHeader = context.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith(AUTH_PREFIX)) {
    return undefined
  }

  const userId = await parseToken(
    TokenKind.Auth,
    authHeader.slice(AUTH_PREFIX.length)
  )
  if (!userId) {
    return undefined
  }

  return await getUser(context.var.db, userId)
}

const ensurePerms = async (user: User, permissions: Permissions) => {
  return (user.perms & permissions) !== 0
}

export const declareRouter = <
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
>(
  definition: TRoute,
  handler: RouteHandler<ApiContext, User, TRoute>
): DeclaredRoute<TRoute> => {
  const responders = buildResponders(definition.responses)

  const createHandler = (): Handler<AppEnv> => async context => {
    const executionContext: MutableRouteHandlerContext<typeof definition> = {
      context,
      params: undefined as RouteParams<typeof definition>,
      query: undefined as RouteQuery<typeof definition>,
      permissions: definition.permissions ?? undefined,
    }

    const requiresAuth =
      definition.authRequired || (definition.permissions ?? 0) !== 0

    if (requiresAuth) {
      executionContext.user = await ensureAuth(context)
      if (!executionContext.user) {
        return context.json(...unauthorized())
      }

      if (
        definition.permissions &&
        !(await ensurePerms(executionContext.user, definition.permissions))
      ) {
        return context.json(...accessDenied())
      }
    }

    const handleResponseIssue = async (
      error: z.ZodError<unknown>
    ): Promise<Response | undefined> => {
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
        return context.json(routeResult.body, routeResult.status as never)
      }

      return undefined
    }

    const parseSection = async <TSchema extends SchemaLike | undefined>(
      source: RouteValidationSource,
      schema: TSchema,
      reader: (ctx: ApiContext) => Promise<unknown>,
      onReadError?: (error: unknown) => Promise<Response>
    ): Promise<ParseOutcome<TSchema>> => {
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
          result: context.json(...validationError(source, result.error)),
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
      async ctx => ctx.req.json(),
      async () => context.json(...malformedJson())
    )
    if (bodyOutcome.state === ParseState.Error) {
      return bodyOutcome.result
    }

    const paramsOutcome = await parseSection(
      'params',
      definition.params,
      async ctx => ctx.req.param()
    )
    if (paramsOutcome.state === ParseState.Error) {
      return paramsOutcome.result
    }

    const queryOutcome = await parseSection(
      'query',
      definition.query,
      async ctx => ctx.req.query()
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
        ? { ...handlerArgsBase, user: executionContext.user as User }
        : handlerArgsBase
    ) as RouteHandlerArgs<ApiContext, User, typeof definition>

    const routeResult = await handler(handlerArgs)
    return context.json(routeResult.body, routeResult.status as never)
  }

  return {
    definition,
    handler,
    createHandler,
  }
}
