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
  Schema,
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
import { z } from 'zod/mini'
import { getCachedUser, setCachedUser } from '../cache/auth-cache'
import {
  getCompetitionTiming,
  type CompetitionTiming,
} from '../services/settings'
import { getUser } from '../services/users'
import { validateCaptcha } from '../util/captcha'
import type { ApiContext, AppEnv } from './app-env'
import { parseToken, TokenKind } from './tokens'

const AUTH_PREFIX = 'Bearer '
type JsonResponse = [Record<string, unknown>, ContentfulStatusCode]

export interface DeclaredRoute<
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
> {
  readonly definition: TRoute
  readonly handler: RouteHandler<ApiContext, User, TRoute>
  createHandler(): Handler<AppEnv>
}

const buildResponders = <TResponses extends readonly ResponseDefinition[]>(
  responses: TResponses
): ResponseHelpers<TResponses> => {
  const responders = Object.create(null) as Record<string, ResponseHelper<any>>

  for (const def of responses) {
    responders[def.kind] = (payload?: unknown): ResponseResult<typeof def> => {
      const body = def.dataSchema
        ? {
            kind: def.kind,
            message: def.message,
            data: def.dataSchema.parse(payload),
          }
        : { kind: def.kind, message: def.message }

      return { status: def.status, body, definition: def } as ResponseResult<
        typeof def
      >
    }
  }

  return responders as ResponseHelpers<TResponses>
}

const respond = {
  malformedJson: (): JsonResponse => [
    { kind: BadJson.kind, message: BadJson.message },
    BadJson.status as ContentfulStatusCode,
  ],

  malformedFormData: (): JsonResponse => [
    {
      kind: BadBody.kind,
      message: BadBody.message,
      data: { reason: 'body:formData:malformed' },
    },
    BadBody.status as ContentfulStatusCode,
  ],

  validationError: (
    src: RouteValidationSource,
    error: z.core.$ZodError<unknown>
  ): JsonResponse => [
    {
      kind: BadBody.kind,
      message: BadBody.message,
      data: {
        reason:
          error.issues.length > 0
            ? `${src}:${error.issues[0]?.path.join('.')}: ${error.issues[0]?.message}`
            : null,
      },
    },
    BadBody.status as ContentfulStatusCode,
  ],

  accessDenied: (): JsonResponse => [
    { kind: BadPerms.kind, message: BadPerms.message },
    BadPerms.status as ContentfulStatusCode,
  ],

  unauthorized: (): JsonResponse => [
    { kind: BadToken.kind, message: BadToken.message },
    BadToken.status as ContentfulStatusCode,
  ],

  notStarted: (): JsonResponse => [
    { kind: BadNotStarted.kind, message: BadNotStarted.message },
    BadNotStarted.status as ContentfulStatusCode,
  ],

  alreadyFinished: (): JsonResponse => [
    { kind: BadEnded.kind, message: BadEnded.message },
    BadEnded.status as ContentfulStatusCode,
  ],

  badCaptcha: (): JsonResponse => [
    { kind: BadCaptcha.kind, message: BadCaptcha.message },
    BadCaptcha.status as ContentfulStatusCode,
  ],

  badRecaptchaCode: (): JsonResponse => [
    { kind: BadRecaptchaCode.kind, message: BadRecaptchaCode.message },
    BadRecaptchaCode.status as ContentfulStatusCode,
  ],
}

const getAuthenticatedUser = async (
  context: ApiContext
): Promise<User | undefined> => {
  const authHeader = context.req.header('Authorization')
  if (!authHeader?.startsWith(AUTH_PREFIX)) {
    return undefined
  }

  const userId = await parseToken(
    TokenKind.Auth,
    authHeader.slice(AUTH_PREFIX.length)
  )
  if (!userId) {
    return undefined
  }

  const cached = await getCachedUser(context.var.redis, userId)
  if (cached) {
    return cached
  }

  const user = await getUser(context.var.db, userId)
  if (user) {
    // do not stale the request
    setCachedUser(context.var.redis, user).catch(() => {
      context.var.logger.error({ userId }, 'failed to set cached user')
    })
  }

  return user
}

const hasPermissions = (user: User, perms: Permissions): boolean =>
  (user.perms & perms) === perms

const canBypassCompetitionStart = (
  user: User | undefined,
  bypassPerms: Permissions | undefined
) => Boolean(bypassPerms && user && hasPermissions(user, bypassPerms))

const isCompetitionStarted = (timing: CompetitionTiming) =>
  Date.now() >= timing.startTime

const isCompetitionActive = (timing: CompetitionTiming) =>
  Date.now() < timing.endTime

type ParseSuccess<T> = { ok: true; value: T }
type ParseError = { ok: false; response: Response }
type ParseResult<T> = ParseSuccess<T> | ParseError

const parseSchema = async <TSchema extends Schema | undefined>(
  context: ApiContext,
  source: RouteValidationSource,
  schema: TSchema,
  reader: () => Promise<unknown>,
  onReadError?: () => Response,
  handleCustomIssue?: (error: z.core.$ZodError<unknown>) => Response | undefined
): Promise<
  ParseResult<TSchema extends Schema ? z.output<TSchema> : undefined>
> => {
  type Output = TSchema extends Schema ? z.output<TSchema> : undefined
  if (!schema) {
    return { ok: true, value: undefined as Output }
  }

  let raw: unknown
  try {
    raw = await reader()
  } catch {
    return {
      ok: false,
      response: onReadError?.() ?? context.json(...respond.malformedJson()),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const custom = handleCustomIssue?.(result.error)
    if (custom) {
      return { ok: false, response: custom }
    }

    return {
      ok: false,
      response: context.json(...respond.validationError(source, result.error)),
    }
  }

  return { ok: true, value: result.data as Output }
}

export const declareRouter = <
  TRoute extends AnyRouteDefinition = AnyRouteDefinition,
>(
  definition: TRoute,
  handler: RouteHandler<ApiContext, User, TRoute>
): DeclaredRoute<TRoute> => {
  const allResponses = [
    ...definition.goodResponses,
    ...definition.badResponses,
  ] as const
  const responders = buildResponders(allResponses)

  const createHandler = (): Handler<AppEnv> => async context => {
    let user: User | undefined
    let timing: CompetitionTiming | undefined
    const loadTiming = async () => {
      timing ??= await getCompetitionTiming(context.var.db, context.var.redis)
      return timing
    }

    const requiresAuth =
      definition.authRequired || (definition.permissions ?? 0) !== 0
    const wantsOptionalAuth =
      definition.optionalAuth === true ||
      definition.onlyWhenStartedPermissionsBypass !== undefined

    if (requiresAuth) {
      user = await getAuthenticatedUser(context)
      if (!user) {
        return context.json(...respond.unauthorized())
      }

      if (
        definition.permissions &&
        !hasPermissions(user, definition.permissions)
      ) {
        return context.json(...respond.accessDenied())
      }

      if (definition.rejectBanned && user.banned) {
        return context.json(...respond.accessDenied())
      }
    } else if (wantsOptionalAuth) {
      user = await getAuthenticatedUser(context)
    }

    if (
      definition.onlyWhenStarted &&
      !canBypassCompetitionStart(
        user,
        definition.onlyWhenStartedPermissionsBypass
      ) &&
      !isCompetitionStarted(await loadTiming())
    ) {
      return context.json(...respond.notStarted())
    }

    if (
      definition.onlyWhenNotFinished &&
      !isCompetitionActive(await loadTiming())
    ) {
      return context.json(...respond.alreadyFinished())
    }

    const handleCustomIssue = (
      error: z.core.$ZodError<unknown>
    ): Response | undefined => {
      for (const issue of error.issues) {
        const params = (
          issue as z.core.$ZodIssue & { params?: Record<string, unknown> }
        ).params
        const response = params?.response as { kind: string } | undefined
        if (!response) {
          continue
        }

        const responder = responders[response.kind as keyof typeof responders]
        if (!responder) {
          continue
        }

        const result = (responder as () => ResponseResult<any>)()
        return context.json(result.body, result.status as never)
      }
      return undefined
    }

    const expectsFormData = definition.bodyFormat === 'form-data'
    const bodyResult = await parseSchema(
      context,
      'body',
      definition.body,
      expectsFormData
        ? () => context.req.parseBody({ all: true })
        : () => context.req.json(),
      () =>
        context.json(
          ...(expectsFormData
            ? respond.malformedFormData()
            : respond.malformedJson())
        ),
      handleCustomIssue
    )
    if (!bodyResult.ok) {
      return bodyResult.response
    }

    const paramsResult = await parseSchema(
      context,
      'params',
      definition.params,
      () => Promise.resolve(context.req.param()),
      undefined,
      handleCustomIssue
    )
    if (!paramsResult.ok) {
      return paramsResult.response
    }

    const queryResult = await parseSchema(
      context,
      'query',
      definition.query,
      () => Promise.resolve(context.req.query()),
      undefined,
      handleCustomIssue
    )
    if (!queryResult.ok) {
      return queryResult.response
    }

    const body = bodyResult.value as RouteBody<typeof definition>
    const params = paramsResult.value as RouteParams<typeof definition>
    const query = queryResult.value as RouteQuery<typeof definition>

    if (definition.captchaAction) {
      const isV1 = definition.path.startsWith('/v1/')

      const bodyWithCaptcha = body as
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
        return context.json(
          ...(isV1 ? respond.badRecaptchaCode() : respond.badCaptcha())
        )
      }
    }

    const handlerArgs = {
      res: responders,
      body,
      params,
      query,
      ctx: context,
      permissions: definition.permissions as RoutePermissions<
        typeof definition
      >,
      ...(requiresAuth ? { user: user as User } : {}),
      ...(wantsOptionalAuth ? { user } : {}),
    } as RouteHandlerArgs<ApiContext, User, typeof definition>

    const result = await handler(handlerArgs)

    if (definition.returnBodyAsIs) {
      return context.json(
        (result.body as { data: unknown })?.data,
        result.status as never
      )
    }
    return context.json(result.body, result.status as never)
  }

  return { definition, handler, createHandler }
}
