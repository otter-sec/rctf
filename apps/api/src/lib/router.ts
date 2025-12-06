import { config } from '@rctf/config'
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
import {
  BadBody,
  BadCaptcha,
  BadEnded,
  BadJson,
  BadNotStarted,
  BadPerms,
  BadRecaptchaCode,
  BadToken,
} from '@rctf/types'
import type { Handler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'
import { getCachedUser, setCachedUser } from '../cache/auth-cache'
import { getUser } from '../services/users'
import { validateCaptcha } from '../util/captcha'
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
    const helper = (payload?: unknown): ResponseResult<typeof definition> => {
      const body = definition.dataSchema
        ? {
            kind: definition.kind,
            message: definition.message,
            data: definition.dataSchema.parse(payload),
          }
        : {
            kind: definition.kind,
            message: definition.message,
          }

      return {
        status: definition.status,
        body,
        definition,
      } as ResponseResult<typeof definition>
    }

    responders[definition.kind] = helper as ResponseHelper<any>
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
  },
  BadJson.status as ContentfulStatusCode,
]

const malformedFormData = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadBody.kind,
    message: BadBody.message,
    data: {
      reason: 'body:formData:malformed',
    },
  },
  BadBody.status as ContentfulStatusCode,
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
  },
  BadPerms.status as ContentfulStatusCode,
]

const unauthorized = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadToken.kind,
    message: BadToken.message,
  },
  BadToken.status as ContentfulStatusCode,
]

const notStarted = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadNotStarted.kind,
    message: BadNotStarted.message,
  },
  BadNotStarted.status as ContentfulStatusCode,
]

const alreadyFinished = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadEnded.kind,
    message: BadEnded.message,
  },
  BadEnded.status as ContentfulStatusCode,
]

// NOTE(es3n1n): v2 response
const badCaptcha = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadCaptcha.kind,
    message: BadCaptcha.message,
  },
  BadCaptcha.status as ContentfulStatusCode,
]

// NOTE(es3n1n): v1 backwards compatibility
const badRecaptchaCode = (): [JsonLike, ContentfulStatusCode] => [
  {
    kind: BadRecaptchaCode.kind,
    message: BadRecaptchaCode.message,
  },
  BadRecaptchaCode.status as ContentfulStatusCode,
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

  const cachedUser = await getCachedUser(context.var.redis, userId)
  if (cachedUser) {
    return cachedUser
  }

  const user = await getUser(context.var.db, userId)
  if (user) {
    // Cache in background
    setCachedUser(context.var.redis, user).catch(() => {})
  }

  return user
}

const ensurePerms = (user: User, permissions: Permissions) => {
  return (user.perms & permissions) !== 0
}

const ensureStarted = (
  user: User | undefined,
  bypassPermissions: Permissions | undefined
): boolean => {
  if (bypassPermissions && user && ensurePerms(user, bypassPermissions)) {
    return true
  }

  return Date.now() >= config.startTime
}

const ensureNotFinished = (): boolean => {
  return Date.now() < config.endTime
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
        !ensurePerms(executionContext.user, definition.permissions)
      ) {
        return context.json(...accessDenied())
      }
    }

    if (
      definition.onlyWhenStarted &&
      !ensureStarted(
        executionContext.user,
        definition.onlyWhenStartedPermissionsBypass
      )
    ) {
      return context.json(...notStarted())
    }

    if (definition.onlyWhenNotFinished && !ensureNotFinished()) {
      return context.json(...alreadyFinished())
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

    const expectsFormData = definition.bodyFormat === 'form-data'
    const bodyOutcome = await parseSection(
      'body',
      definition.body,
      expectsFormData
        ? async ctx => await ctx.req.parseBody({ all: true })
        : async ctx => ctx.req.json(),
      async () =>
        expectsFormData
          ? context.json(...malformedFormData())
          : context.json(...malformedJson())
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

    if (definition.captchaAction) {
      // NOTE(es3n1n): v1 uses recaptchaCode, v2 uses captchaCode
      const isV1 = definition.path.startsWith('/v1/')
      const bodyWithCaptcha = parsedBody as
        | { captchaCode?: string; recaptchaCode?: string }
        | undefined
      const captchaCode = isV1
        ? bodyWithCaptcha?.recaptchaCode
        : bodyWithCaptcha?.captchaCode

      const isValid = await validateCaptcha(
        definition.captchaAction,
        captchaCode,
        context.var.ip
      )
      if (!isValid) {
        return context.json(...(isV1 ? badRecaptchaCode() : badCaptcha()))
      }
    }

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
    if (definition.returnBodyAsIs) {
      return context.json(
        (routeResult.body as { data: unknown })?.data,
        routeResult.status as never
      )
    }
    return context.json(routeResult.body, routeResult.status as never)
  }

  return {
    definition,
    handler,
    createHandler,
  }
}
