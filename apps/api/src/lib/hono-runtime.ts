import type { Context } from 'hono'
import type { ZodError } from 'zod'

import type { AnyRouteDefinition, RouteRuntime } from '@rctf/types'

type JsonLike = Record<string, unknown>

// TODO(es3n1n): should use the actual schema
const defaultMalformedJson = (): JsonLike => ({
  kind: 'InvalidJson',
  message: 'Request body must be valid JSON',
  data: null,
})

// TODO(es3n1n): should use the actual schema
const defaultValidationError = (error: ZodError<unknown>): JsonLike => ({
  kind: 'ValidationError',
  message: 'Invalid request body',
  data: error.issues,
})

export interface HonoRuntimeOptions<TContext extends Context> {
  authGuard?: (context: TContext) => Promise<unknown>
  onMalformedJson?: (
    context: TContext,
    error: unknown
  ) => Response | Promise<Response>
  onValidationError?: (
    context: TContext,
    error: ZodError<unknown>
  ) => Response | Promise<Response>
}

export const createHonoRuntime = <
  TContext extends Context,
  TRoute extends AnyRouteDefinition
>(
  options?: HonoRuntimeOptions<TContext>
): RouteRuntime<TContext, Response, TRoute> => ({
  readBody: async context => context.req.json(),
  readParams: async context => context.req.param(),
  readQuery: async context => {
    const url = new URL(context.req.url)
    return Object.fromEntries(url.searchParams.entries())
  },
  handleMalformedBody: async (context, error) =>
    options?.onMalformedJson?.(context, error) ??
    context.json(defaultMalformedJson(), 400),
  handleValidationError: async (context, error) =>
    options?.onValidationError?.(context, error) ??
    context.json(defaultValidationError(error), 422),
  ensureAuth: options?.authGuard,
  send: (context, result) => context.json(result.body, result.status as never),
})
