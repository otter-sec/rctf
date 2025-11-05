import type { Context } from 'hono'
import type { ZodError } from 'zod'

import type {
  AnyRouteDefinition,
  RouteRuntime,
  RouteValidationSource,
} from '@rctf/types'
import { BadJson, BadBody } from '@rctf/types'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

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
    // TODO(es3n1n): show src (body/query/params)
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

const authGuard = () => undefined

export const createTypesRuntime = <
  TContext extends Context,
  TRoute extends AnyRouteDefinition
>(): RouteRuntime<TContext, Response, TRoute> => ({
  readBody: async context => context.req.json(),
  readParams: async context => context.req.param(),
  readQuery: async context => context.req.query(),
  handleMalformedBody: async context => context.json(...malformedJson()),
  handleValidationError: async (src, context, error) =>
    context.json(...validationError(src, error)),
  ensureAuth: async (context, permissions) => authGuard(),
  send: (context, result) => context.json(result.body, result.status as never),
})
