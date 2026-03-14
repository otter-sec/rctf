import {
  BadNotStarted,
  type AnyRouteDefinition,
  type RouteResponse,
} from '@rctf/types'
import { createMutation, QueryClient } from '@tanstack/svelte-query'
import { browser } from '$app/environment'
import { apiRequest, type InlineArgs } from '$lib/api'

export { QueryClientProvider } from '@tanstack/svelte-query'

export class ApiError extends Error {
  constructor(
    public readonly kind: string,
    public override readonly message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static isNotStarted(error: Error | null): boolean {
    return error instanceof ApiError && error.kind === BadNotStarted.kind
  }
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 1000 * 60,
        retry: (failureCount, error) => {
          if (error?.name === 'ApiError') {
            return false
          }
          return failureCount < 3
        },
      },
    },
  })
}

export function createApiMutation<TRoute extends AnyRouteDefinition>(
  route: TRoute
) {
  return createMutation(() => ({
    mutationFn: (args: InlineArgs<TRoute>) =>
      apiRequest(route, args) as Promise<RouteResponse<TRoute>>,
  }))
}
