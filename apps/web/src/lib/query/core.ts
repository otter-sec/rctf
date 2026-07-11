import { BadNotStarted } from '@rctf/types'
import { QueryClient, type Query } from '@tanstack/svelte-query'
import { queryKeys } from '$lib/query/keys'

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

export function unwrapData<
  R extends { kind: string; message: string },
  K extends R['kind'],
>(
  response: R,
  good: { kind: K }
): Extract<R, { kind: K }> extends { data: infer D } ? D : never {
  if (response.kind !== good.kind) {
    throw new ApiError(response.kind, response.message)
  }
  return (
    response as unknown as {
      data: Extract<R, { kind: K }> extends { data: infer D } ? D : never
    }
  ).data
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: (failureCount, error) =>
          error instanceof ApiError ? false : failureCount < 3,
      },
    },
  })
}

function isSessionScoped(query: Query): boolean {
  return query.queryKey[0] !== queryKeys.clientConfig[0]
}

export async function resetSessionQueries(
  queryClient: QueryClient
): Promise<void> {
  queryClient.getMutationCache().clear()
  await queryClient.resetQueries(
    { predicate: isSessionScoped },
    { cancelRefetch: true }
  )
}
