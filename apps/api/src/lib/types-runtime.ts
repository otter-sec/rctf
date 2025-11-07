import type { InferInsertModel, User, users } from '@rctf/db'
import type {
  AnyRouteDefinition,
  Permissions,
  RouteRuntime,
  RouteValidationSource,
} from '@rctf/types'
import { BadBody, BadJson, BadPerms, BadToken } from '@rctf/types'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ZodError } from 'zod'
import { getUser } from '../services/users'
import type { ApiContext } from './app-env'
import { parseToken, TokenKind } from './tokens'

const AUTH_PREFIX = 'Bearer '
type JsonLike = Record<string, unknown>

// TODO(es3n1n): we need an util for this
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
  error: ZodError<unknown>
): [JsonLike, ContentfulStatusCode] => [
  {
    // TODO(es3n1n): also return a list of all issues (which is technically a breaking change compared to rctf v1)
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

const ensureAuth = async (
  context: ApiContext
): Promise<InferInsertModel<typeof users> | undefined> => {
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

export const createTypesRuntime = <
  TRoute extends AnyRouteDefinition
>(): RouteRuntime<ApiContext, Response, User, TRoute> => ({
  readBody: async context => context.req.json(),
  readParams: async context => context.req.param(),
  readQuery: async context => context.req.query(),
  handleMalformedBody: async context => context.json(...malformedJson()),
  handleValidationError: async (src, context, error) =>
    context.json(...validationError(src, error)),
  ensureAuth: ensureAuth,
  ensurePerms: ensurePerms,
  handleAccessDenied: async context => context.json(...accessDenied()),
  handleUnauthorized: async context => context.json(...unauthorized()),
  send: (context, result) => context.json(result.body, result.status as never),
})
